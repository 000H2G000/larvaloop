"""
Builds A4 print sheets from the downloaded Roboflow mealworm test images.

Each sheet has: the photo, a 20 mm black calibration square (used by the vision
service to convert pixels to mm), a sheet number and the dataset licence credit.

Usage:  .venv/Scripts/python scripts/make_print_sheets.py
Output: prints/acorn2protein_print_sheets.pdf (+ one PNG per sheet)

Print at 100% / "Actual size" (no "fit to page"), so the square really is 20 mm.
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
OUT = ROOT / "prints"

DPI = 300
MM = DPI / 25.4
A4 = (round(210 * MM), round(297 * MM))
MARKER_MM = 20

# Curated from the test splits (evaluated against labels): single larvae for length demos,
# medium density for counting, one dense pile to show the limits honestly.
SHEETS = [
    ("mealworm-part2", "12_jpg", "Single larva: length measurement"),
    ("mealworm-part2", "15_jpg", "Single larva: length measurement"),
    ("mealworm-part2", "17_jpg", "Single larva: length measurement"),
    ("mealworm-part2", "35_JPG", "Group: counting"),
    ("mealworm-part2", "7_jpg", "Group: counting"),
    ("mealworm-part2", "13_jpg", "Group: counting"),
    ("mealworm-part1", "171700_1_bmp", "Larvae in substrate: counting"),
    ("mealworm-part1", "171717_4_bmp", "Larvae in substrate: counting"),
    ("mealworm-part2", "6_jpg", "Dense pile: stress test"),
]

CREDIT = {
    "mealworm-part1": "https://universe.roboflow.com/mealworms/mealworm-part1",
    "mealworm-part2": "https://universe.roboflow.com/mealworms/mealworm-part2",
}


def font(size_mm: float, bold=False):
    px = round(size_mm * MM)
    for name in (("arialbd.ttf" if bold else "arial.ttf"), "DejaVuSans.ttf"):
        try:
            return ImageFont.truetype(name, px)
        except OSError:
            continue
    return ImageFont.load_default(px)


def find_image(dataset: str, key: str) -> Path:
    matches = sorted((DATA / dataset / "test" / "images").glob(f"*{key}*.jpg"))
    # "2_jpg" style keys can match several files; prefer the one that starts with the key.
    exact = [m for m in matches if m.name.startswith(key) or f"-{key}" in m.name or f"_{key}" in m.name]
    if not (exact or matches):
        raise FileNotFoundError(f"No test image matching {key!r} in {dataset}")
    return (exact or matches)[0]


def build_sheet(n: int, dataset: str, key: str, caption: str) -> Image.Image:
    page = Image.new("RGB", A4, "white")
    d = ImageDraw.Draw(page)
    margin = round(15 * MM)

    d.text((margin, margin), f"ACORN2PROTEIN · demo sheet {n:02d}", font=font(7, bold=True), fill="black")
    d.text((margin, margin + round(10 * MM)), caption, font=font(4.5), fill=(70, 70, 70))

    # Photo: 170 mm wide, centred.
    photo = Image.open(find_image(dataset, key)).convert("RGB")
    side = round(170 * MM)
    photo = photo.resize((side, round(side * photo.height / photo.width)), Image.LANCZOS)
    px = (A4[0] - photo.width) // 2
    py = margin + round(25 * MM)
    page.paste(photo, (px, py))

    # Calibration square with a white quiet zone, below the photo, left-aligned.
    m = round(MARKER_MM * MM)
    mx, my = px, py + photo.height + round(12 * MM)
    d.rectangle([mx, my, mx + m, my + m], fill="black")
    d.text((mx + m + round(5 * MM), my + m // 2), f"Calibration square: {MARKER_MM} mm × {MARKER_MM} mm",
           font=font(4.5), fill="black", anchor="lm")

    footer = (
        f"Image: {CREDIT[dataset]} · Licence CC BY-NC-SA 4.0\n"
        "Sample dataset image, not a live ACORN2PROTEIN tray.\n"
        "Print at 100% (actual size). Lengths measured from this sheet are lengths on the print, not real larvae."
    )
    d.multiline_text((margin, A4[1] - margin), footer, font=font(3), fill=(90, 90, 90), anchor="ld", spacing=8)
    return page


def main():
    OUT.mkdir(exist_ok=True)
    pages = []
    for n, (dataset, key, caption) in enumerate(SHEETS, start=1):
        page = build_sheet(n, dataset, key, caption)
        page.save(OUT / f"sheet_{n:02d}.png", dpi=(DPI, DPI))
        pages.append(page)
        print(f"sheet {n:02d}: {dataset} {key} - {caption}")
    pdf = OUT / "acorn2protein_print_sheets.pdf"
    pages[0].save(pdf, save_all=True, append_images=pages[1:], resolution=DPI)
    print(f"\nWrote {pdf}")


if __name__ == "__main__":
    main()
