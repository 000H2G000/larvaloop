# Vision: counting and measuring larvae

## Pipeline

1. **Image in** (camera frame or upload, max 10 MB), downscaled to 1280 px on the long side.
2. **Find the calibration square.** OpenCV looks for a solid black, convex, roughly square shape. Its side in pixels
   ÷ 20 mm gives the scale (mm per pixel). No square → lengths stay in pixels and mm fields are `null`.
3. **Segment larvae.** The image goes to a hosted Roboflow segmentation workflow (`general-segmentation-api`,
   prompt `mealworm`). It returns one mask per larva (COCO RLE).
4. **Measure.** Each mask's outline is turned into length and width with a ribbon model
   (perimeter = 2·(L + W), area = L·W), which handles curved larvae better than a bounding box. Detections that
   overlap the calibration square are dropped.
5. **Draw.** Outlines and numbers are drawn on the image; the result is returned with count, length statistics,
   per-larva sizes, mean confidence, model version and processing time.

Code: [`vision/app/`](../vision/app) (`measure.py`, `analyzer.py`).

## Measured accuracy

On the test splits of two public datasets, before printing:

| Dataset | Labelled larvae | Found | Notes |
|---|---|---|---|
| mealworm-part1 (larvae in substrate) | 166 | 93 % | Many "extra" detections are real larvae the labels missed |
| mealworm-part2 (dense piles) | 1,696 | 42 % | 92 % of detections are correct; saturates around 100 per image |

Length check: a single larva measured **164.3 mm** on the printed sheet vs **160.7 mm** from its hand-drawn
outline (about 2 % difference).

## Demo without live larvae

`vision/scripts/make_print_sheets.py` builds A4 sheets from dataset test images, each with a 20 mm square,
sheet number and licence credit. Print at 100 % (actual size). Lengths measured from a sheet are lengths on the
print, not real larvae. Results from sheets are tagged `sample_dataset`.

## Limits

- Counts are a lower bound (buried, overlapping larvae).
- General zero-shot model, not trained on our trays; accuracy on the real setup must be re-measured.
- Needs internet (Roboflow serverless).

Next step: label ~300 photos from our own tray and train a dedicated segmentation model, then compare its counts
and lengths against weighed observations.
