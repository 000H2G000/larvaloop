"""Mask decoding, scale calibration and per-larva size estimation."""
import math

import cv2
import numpy as np


# ---------- COCO compressed RLE (what the workflow returns in `rle_mask`) ----------

def _rle_counts(s: str) -> list[int]:
    counts: list[int] = []
    p = 0
    while p < len(s):
        x, k, more = 0, 0, True
        while more:
            c = ord(s[p]) - 48
            x |= (c & 0x1F) << (5 * k)
            more = bool(c & 0x20)
            p += 1
            k += 1
            if not more and (c & 0x10):
                x |= -1 << (5 * k)
        if len(counts) > 2:
            x += counts[-2]
        counts.append(x)
    return counts


def decode_rle(rle: dict) -> np.ndarray:
    """Returns a uint8 mask (H, W). COCO RLE is column-major and starts with a run of zeros."""
    h, w = rle["size"]
    counts = rle["counts"]
    if isinstance(counts, str):
        counts = _rle_counts(counts)
    flat = np.zeros(h * w, dtype=np.uint8)
    pos, value = 0, 0
    for run in counts:
        if value:
            flat[pos:pos + run] = 1
        pos += run
        value ^= 1
    return flat.reshape((w, h)).T


# ---------- Calibration square ----------

def find_marker(image_bgr: np.ndarray) -> dict | None:
    """
    Finds the printed solid black calibration square.
    Returns {"side_px", "box": [x, y, w, h]} or None when no convincing square is visible.
    """
    gray = cv2.GaussianBlur(cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY), (5, 5), 0)
    _, dark = cv2.threshold(gray, 70, 255, cv2.THRESH_BINARY_INV)
    contours, _ = cv2.findContours(dark, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    min_area = image_bgr.shape[0] * image_bgr.shape[1] * 0.0008

    best = None
    for c in contours:
        area = cv2.contourArea(c)
        if area < min_area:
            continue
        approx = cv2.approxPolyDP(c, 0.04 * cv2.arcLength(c, True), True)
        if len(approx) != 4 or not cv2.isContourConvex(approx):
            continue
        (_, _), (rw, rh), _ = cv2.minAreaRect(c)
        if not rw or not rh or not 0.85 <= rw / rh <= 1.18:
            continue
        if area / (rw * rh) < 0.9:  # must be solid, not an outline
            continue
        if best is None or area > best[0]:
            best = (area, c)

    if best is None:
        return None
    area, c = best
    x, y, w, h = cv2.boundingRect(c)
    return {"side_px": math.sqrt(area), "box": [int(x), int(y), int(w), int(h)]}


# ---------- Size of one larva ----------

def larva_size(mask: np.ndarray) -> dict | None:
    """
    Length and width in pixels from the mask outline, using a ribbon model
    (perimeter P = 2(L + W), area A = L * W), which handles curved larvae better
    than a bounding box. Falls back to the rotated rectangle's long side.
    """
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    if not contours:
        return None
    c = max(contours, key=cv2.contourArea)
    area = float(cv2.contourArea(c))
    if area < 20:
        return None
    perimeter = cv2.arcLength(cv2.approxPolyDP(c, 1.5, True), True)
    half = perimeter / 2
    disc = half * half - 4 * area
    if disc > 0:
        length = (half + math.sqrt(disc)) / 2
    else:
        (_, _), (rw, rh), _ = cv2.minAreaRect(c)
        length = max(rw, rh)
    return {
        "area_px": area,
        "length_px": length,
        "width_px": area / length if length else 0.0,
        "contour": c,
    }
