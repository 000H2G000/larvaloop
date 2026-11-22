"""Image in, measured larvae out. Never invents values: mm fields are null when no calibration square is found."""
import base64
import statistics
import time

import cv2
import numpy as np

from app import roboflow_client
from app.config import settings
from app.measure import decode_rle, find_marker, larva_size

OUTLINE = (255, 64, 160)  # BGR, purple-pink
MARKER = (0, 200, 0)


def _downscale(img: np.ndarray) -> np.ndarray:
    h, w = img.shape[:2]
    scale = settings.max_image_side / max(h, w)
    return cv2.resize(img, (round(w * scale), round(h * scale)), interpolation=cv2.INTER_AREA) if scale < 1 else img


def _overlaps(box_a, box_b) -> bool:
    ax, ay, aw, ah = box_a
    bx, by, bw, bh = box_b
    return ax < bx + bw and bx < ax + aw and ay < by + bh and by < ay + ah


def _round(v, nd=1):
    return None if v is None else round(v, nd)


def analyze(image_bytes: bytes) -> dict:
    started = time.perf_counter()
    img = cv2.imdecode(np.frombuffer(image_bytes, np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Unsupported or corrupt image file")
    img = _downscale(img)
    h, w = img.shape[:2]

    marker = find_marker(img)
    mm_per_px = settings.marker_mm / marker["side_px"] if marker else None

    raw = roboflow_client.segment(img)

    larvae, overlay = [], img.copy()
    for p in raw:
        if p.get("confidence", 0) < settings.conf_threshold:
            continue
        box = [int(p["x"] - p["width"] / 2), int(p["y"] - p["height"] / 2), int(p["width"]), int(p["height"])]
        if marker and _overlaps(box, marker["box"]):
            continue  # never count the calibration square
        mask = decode_rle(p["rle_mask"]) if p.get("rle_mask") else None
        size = larva_size(mask) if mask is not None and mask.shape == (h, w) else None

        larva = {
            "id": len(larvae) + 1,
            "confidence": round(p["confidence"], 3),
            "box": box,
            "lengthPx": _round(size and size["length_px"]),
            "widthPx": _round(size and size["width_px"]),
            "areaPx": _round(size and size["area_px"], 0),
            "lengthMm": _round(size and mm_per_px and size["length_px"] * mm_per_px),
            "widthMm": _round(size and mm_per_px and size["width_px"] * mm_per_px),
        }
        larvae.append(larva)

        if size:
            cv2.drawContours(overlay, [size["contour"]], -1, OUTLINE, -1)
            cv2.drawContours(img, [size["contour"]], -1, OUTLINE, 2)
        else:
            x, y, bw, bh = box
            cv2.rectangle(img, (x, y), (x + bw, y + bh), OUTLINE, 2)
        cv2.putText(img, str(larva["id"]), (box[0] + 3, box[1] + 18), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 2)

    annotated = cv2.addWeighted(overlay, 0.35, img, 0.65, 0)
    if marker:
        x, y, mw, mh = marker["box"]
        cv2.rectangle(annotated, (x, y), (x + mw, y + mh), MARKER, 3)
        cv2.putText(annotated, f"{settings.marker_mm:g} mm", (x, y - 8), cv2.FONT_HERSHEY_SIMPLEX, 0.7, MARKER, 2)
    ok, jpg = cv2.imencode(".jpg", annotated, [cv2.IMWRITE_JPEG_QUALITY, 85])

    lengths_mm = [l["lengthMm"] for l in larvae if l["lengthMm"] is not None]
    return {
        "larvaeCount": len(larvae),
        "calibrated": marker is not None,
        "mmPerPx": _round(mm_per_px, 5),
        "lengthMm": {
            "mean": _round(statistics.fmean(lengths_mm)) if lengths_mm else None,
            "median": _round(statistics.median(lengths_mm)) if lengths_mm else None,
            "min": _round(min(lengths_mm)) if lengths_mm else None,
            "max": _round(max(lengths_mm)) if lengths_mm else None,
        },
        "meanConfidence": round(statistics.fmean(l["confidence"] for l in larvae), 3) if larvae else None,
        "detections": larvae,
        "image": {"width": w, "height": h},
        "modelVersion": settings.model_version,
        "processingTimeMs": round((time.perf_counter() - started) * 1000),
        "annotatedImage": "data:image/jpeg;base64," + base64.b64encode(jpg.tobytes()).decode() if ok else None,
        "notes": [
            "Counts are a lower bound: buried or overlapping larvae can be missed.",
            "Lengths come from the calibration square; on a printed sheet they are lengths on the print.",
        ],
    }
