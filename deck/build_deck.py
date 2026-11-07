# /// script
# requires-python = ">=3.14"
# dependencies = ["pymupdf", "pillow", "imageio-ffmpeg"]
# ///
"""Fill the official Hack the Feed 3-slide pitch template (PDF) without changing its design.

Only placeholder text, the Lovable logo and unused team avatars are removed; everything else is the
original template. Content is set in Inter, the template's own typeface.
Usage: uv run deck/build_deck.py
"""
import io
import json
import pathlib
import subprocess

import imageio_ffmpeg
import pymupdf
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
DECK = ROOT / "deck"
OUT = ROOT / "output/submission/angle-deck.pdf"
CONTENT = json.loads((DECK / "content.json").read_text())
FONTS = pymupdf.Archive(str(DECK / "fonts"))
CSS = """
@font-face { font-family: Inter; src: url(Inter-Regular.ttf); }
@font-face { font-family: Inter; src: url(Inter-SemiBold.ttf); font-weight: 600; }
@font-face { font-family: Inter; src: url(Inter-Bold.ttf); font-weight: bold; }
@font-face { font-family: Display; src: url(InterDisplay-ExtraBold.ttf); }
* { margin: 0; padding: 0; }
body { font-family: Inter; }
p { margin: 0; line-height: 1.15; }
"""


def html(page, rect, body, css=""):
    spare, _ = page.insert_htmlbox(pymupdf.Rect(rect), body, css=CSS + css, archive=FONTS, scale_low=1)
    if spare < 0:
        raise RuntimeError(f"Text does not fit on page {page.number + 1}: {body[:60]}")


def clear(page, rects, graphics=pymupdf.PDF_REDACT_LINE_ART_NONE):
    for rect in rects:
        page.add_redact_annot(pymupdf.Rect(rect), fill=False)
    page.apply_redactions(images=pymupdf.PDF_REDACT_IMAGE_NONE, graphics=graphics, text=pymupdf.PDF_REDACT_TEXT_REMOVE)


def capture_frame(journey, seconds):
    manifest = json.loads((ROOT / f"public/journey/{journey}/manifest.json").read_text())
    frame = [f for f in manifest["frames"] if f["t"] <= seconds][-1]
    return Image.open(ROOT / f"public/journey/{journey}/{frame['file']}").convert("RGB")


def crop_png(image, box, size):
    """box is in 1920x1080 page coordinates; captures are 2x."""
    x0, y0, x1, y1 = (round(v * 2) for v in box)
    out = image.crop((x0, y0, x1, y1)).resize(size, Image.LANCZOS)
    buffer = io.BytesIO()
    out.save(buffer, "PNG")
    return buffer.getvalue()


def video_frame(path, seconds):
    raw = subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), "-loglevel", "error", "-ss", str(seconds), "-i", str(path), "-frames:v", "1", "-f", "image2pipe", "-vcodec", "png", "-"], capture_output=True, check=True).stdout
    return Image.open(io.BytesIO(raw)).convert("RGB")


doc = pymupdf.open(DECK / "template/pitch-template.pdf")
c = CONTENT

# Slide 1: the problem
page = doc[0]
clear(page, [(100, 112, 216, 137), (245, 112, 402, 137), (120, 305, 790, 440), (850, 305, 1330, 395), (85, 590, 960, 620)])
chip = "font-weight: bold; font-size: 16.5pt; text-align: center;"
html(page, (90, 115.5, 227, 160), f'<p style="{chip} color: #dddddd">{c["team"]}</p>')
html(page, (235, 115.5, 412, 160), f'<p style="{chip} color: #e08af4">{c["track"]}</p>')
html(page, (126, 312, 780, 520), f'<p style="font-family: Display; font-size: 44pt; line-height: 1.06; color: #000">{c["problem"]}</p>')
html(page, (126, 515, 780, 570), f'<p style="font-size: 15pt; color: #666">{c["problem_context"]}</p>')
html(page, (859, 312, 1160, 575),
     f'<p style="font-family: Display; font-size: 40pt; line-height: 1.05; color: #fff">{c["proof_number"]}</p>'
     f'<p style="font-family: Display; font-size: 40pt; line-height: 1.05; color: #e08af4">{c["proof_number_2"]}</p>'
     f'<p style="font-size: 17pt; line-height: 1.35; color: #dddddd; margin-top: 16pt">{c["proof_text"]}</p>')
thumb = video_frame(ROOT / c["proof_video"], c["proof_video_seconds"])
w, h = thumb.size
thumb = thumb.crop((0, (h - w * 16 // 9) // 2, w, (h - w * 16 // 9) // 2 + w * 16 // 9)) if h > w * 16 // 9 else thumb
buffer = io.BytesIO(); thumb.resize((270, 480)).save(buffer, "PNG")
page.insert_image(pymupdf.Rect(1178, 285, 1313, 525), stream=buffer.getvalue())
html(page, (1160, 530, 1330, 570), '<p style="font-size: 13pt; color: #888; text-align: center">@sokka_map · TikTok</p>')

# Slide 2: the solution in screenshots
page = doc[1]
clear(page, [(85, 182, 700, 225), (85, 588, 1100, 618)] + [(x, 545, x + 250, 572) for x in (122, 450, 778, 1106)])
html(page, (90, 185, 1350, 240), f'<p style="font-size: 25.5pt; color: #cfcfcf">{c["solution"]}</p>')
for index, shot in enumerate(c["screenshots"]):
    x = 90 + index * 328
    image = capture_frame(shot["journey"], shot["seconds"])
    page.insert_image(pymupdf.Rect(x, 266.5, x + 276, 531), stream=crop_png(image, shot["box"], (1104, 1058)))
    html(page, (x + 37, 548.5, x + 320, 590), f'<p style="font-weight: 600; font-size: 17.2pt; color: #dddddd">{shot["caption"]}</p>')

# Slide 3: try it now
page = doc[2]
lovable = [img for img in page.get_images(full=True) if img[2] == 472][0][0]
page.delete_image(lovable)
clear(page, [(118, 262, 600, 330), (118, 418, 700, 470), (900, 268, 1340, 320)])
clear(page, [(826, 330, 1345, 550)], graphics=pymupdf.PDF_REDACT_LINE_ART_REMOVE_IF_COVERED)
html(page, (120.8, 268, 779, 360), f'<p style="font-family: Display; font-size: 40pt; color: #c8ff00">{c["live_app"]}</p>')
html(page, (120.8, 424, 779, 480), f'<p style="font-family: Display; font-size: 30pt; color: #fff">{c["demo_video"]}</p>')
for rect, uri in (((120.8, 268, 779, 320), c['live_app_url']), ((120.8, 424, 779, 465), c['demo_video_url'])):
    page.insert_link({'kind': pymupdf.LINK_URI, 'from': pymupdf.Rect(rect), 'uri': uri})
html(page, (388.8, 505.5, 560, 545), '<p style="font-family: Display; font-size: 22pt; color: #fff">Codex</p>')
html(page, (832, 276, 892, 330), '<p style="font-family: Display; font-size: 26pt; color: #8a2ea0; text-align: center">J</p>')
html(page, (905.2, 270, 1340, 310), f'<p style="font-weight: bold; font-size: 24pt; color: #000">{c["member"]}</p>')
html(page, (905.2, 299, 1340, 330), f'<p style="font-size: 16.5pt; color: #666">{c["role"]}</p>')

OUT.parent.mkdir(parents=True, exist_ok=True)
doc.save(OUT, garbage=4, deflate=True)
for page in doc:
    page.get_pixmap(dpi=96).save(ROOT / f"output/deck-preview-{page.number + 1}.png")
print(f"Wrote {OUT}")
