"""
ACORN2PROTEIN vision service (backend.md §7).

  POST /api/v1/images/analyze        multipart field "image" -> 202 {jobId}; add ?wait=true for the result directly
  GET  /api/v1/jobs/{jobId}          job status: pending | processing | completed | failed
  GET  /health

Run:  .venv/Scripts/python -m uvicorn app.main:app --port 8000
"""
import logging
import threading
import time
import uuid
from concurrent.futures import ThreadPoolExecutor

from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.analyzer import analyze
from app.config import settings

log = logging.getLogger("vision")
MAX_BYTES = 10 * 1024 * 1024
ALLOWED = {"image/jpeg", "image/png", "image/webp", "image/bmp"}
JOB_TTL_S = 3600

app = FastAPI(title="ACORN2PROTEIN Vision", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins, allow_methods=["GET", "POST"], allow_headers=["*"])

_pool = ThreadPoolExecutor(max_workers=2)
_jobs: dict[str, dict] = {}
_lock = threading.Lock()


def _ok(data, message="OK", status=200):
    return JSONResponse({"success": status < 400, "message": message, "data": data}, status_code=status)


def _set(job_id: str, **fields):
    with _lock:
        _jobs[job_id].update(fields, updatedAt=time.time())


def _prune():
    cutoff = time.time() - JOB_TTL_S
    with _lock:
        for jid in [j for j, v in _jobs.items() if v["updatedAt"] < cutoff]:
            del _jobs[jid]


def _run(job_id: str, data: bytes):
    _set(job_id, status="processing")
    try:
        _set(job_id, status="completed", result=analyze(data))
    except ValueError as e:
        _set(job_id, status="failed", error=str(e))
    except Exception:
        log.exception("analysis failed for job %s", job_id)
        _set(job_id, status="failed", error="Analysis failed (vision provider unavailable or returned an error)")


def _public(job: dict) -> dict:
    return {k: v for k, v in job.items() if k != "updatedAt"}


@app.get("/health")
def health():
    return _ok({"status": "ok", "modelVersion": settings.model_version, "jobs": len(_jobs)})


@app.post("/api/v1/images/analyze")
async def analyze_image(image: UploadFile = File(...), wait: bool = Query(False)):
    if image.content_type not in ALLOWED:
        raise HTTPException(415, f"Unsupported content type {image.content_type}")
    data = await image.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise HTTPException(413, "Image larger than 10 MB")

    _prune()
    job_id = uuid.uuid4().hex
    with _lock:
        _jobs[job_id] = {"jobId": job_id, "status": "pending", "filename": image.filename, "createdAt": time.time(), "updatedAt": time.time()}

    future = _pool.submit(_run, job_id, data)
    if not wait:
        return _ok({"jobId": job_id, "status": "pending"}, "Analysis queued", 202)

    future.result()
    job = _jobs[job_id]
    status = 200 if job["status"] == "completed" else 502
    return _ok(_public(job), f"Analysis {job['status']}", status)


@app.get("/api/v1/jobs/{job_id}")
def get_job(job_id: str):
    job = _jobs.get(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    return _ok(_public(job))


@app.exception_handler(HTTPException)
async def http_error(_, exc: HTTPException):
    return JSONResponse({"success": False, "message": exc.detail, "code": f"HTTP_{exc.status_code}"}, status_code=exc.status_code)
