# ACORN2PROTEIN Vision

Mealworm larvae counting and size measurement for the ACORN2PROTEIN prototype (backend.md §7).
Segmentation runs on a **hosted Roboflow workflow** (`general-segmentation-api`, prompt `mealworm`),
so this service needs no GPU and no training. It adds scale calibration and per-larva length.

## Setup

```bash
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt     # ~0.5 GB, no PyTorch
cp .env.example .env                                         # add ROBOFLOW_API_KEY etc.
.venv/Scripts/python -m uvicorn app.main:app --port 8000
```

## API

| Method | Path | Notes |
|---|---|---|
| POST | `/api/v1/images/analyze` | multipart field `image` (jpeg/png/webp/bmp, max 10 MB). Returns `202 {jobId}`; `?wait=true` returns the result directly |
| GET | `/api/v1/jobs/{jobId}` | `pending` / `processing` / `completed` / `failed`, plus `result` |
| GET | `/health` | |

Responses use the backend envelope `{ success, message, data }`.

```bash
curl -F "image=@prints/sheet_04.png;type=image/png" "http://localhost:8000/api/v1/images/analyze?wait=true"
```

Result fields: `larvaeCount`, `calibrated`, `mmPerPx`, `lengthMm {mean, median, min, max}`, `detections[]`
(box, confidence, length/width in px and mm), `annotatedImage` (data URL), `modelVersion`, `processingTimeMs`.
mm values are `null` when no calibration square is visible. Nothing is estimated without a measurement.

## Calibration

A solid black **20 mm square** in the frame (`MARKER_MM`) gives the pixel→mm scale. Keep it on the same
plane as the larvae and the camera roughly top-down.

## Print sheets (hackathon demo without live larvae)

```bash
.venv/Scripts/python scripts/make_print_sheets.py   # -> prints/acorn2protein_print_sheets.pdf
```

Nine A4 sheets from the test split of two Roboflow Universe datasets (CC BY-NC-SA 4.0, credited on each sheet):
3 single larvae (length), 5 groups (counting), 1 dense pile (stress test). **Print at 100% / actual size.**
Lengths measured from a sheet are lengths on the print, not real larvae.

## Measured accuracy (test splits, before printing)

| Dataset | Labelled larvae | Found | Notes |
|---|---|---|---|
| mealworm-part1 (substrate) | 166 | 93% | Many "extra" detections are real larvae the labels missed |
| mealworm-part2 (dense piles) | 1,696 | 42% | 92% precision; in big piles it saturates around 100 detections |

Single larva on sheet 01: 164.3 mm measured vs 160.7 mm from the hand-labelled outline (about 2%).

## Limits

- Counts are a lower bound: buried or overlapping larvae are missed.
- Requires internet (Roboflow serverless) and uses the free plan's monthly credits.
- Model is a general zero-shot segmenter, not trained on our trays; accuracy on the real setup must be re-measured.
