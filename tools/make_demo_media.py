"""Generate the demo media in content/media/ — abstract images, generative videos and simple posters — so the example tree has
something to show without anyone's real work or photos. Needs Pillow and ffmpeg. Deterministic (fixed seeds).

    python tools/make_demo_media.py
"""
import math, os, random, subprocess, sys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "content", "media")
os.makedirs(OUT, exist_ok=True)

PALETTES = [
    ["#2f5d50", "#9bb79a", "#e3b07a", "#d9573b", "#f4efe3"],
    ["#33507a", "#8fa3c4", "#e8c64a", "#f2ece0", "#c9c9c4"],
    ["#5b4636", "#c98b5a", "#e9d8b4", "#6b8e23", "#fbf7ee"],
    ["#22777c", "#7fbfb5", "#f2b42c", "#e9627e", "#f6f1e6"],
    ["#4e6b2a", "#b6c98a", "#e8743b", "#2a2623", "#f7f4ea"],
]


def art(name, w, h, seed, kind):
    """A small abstract composition: circles, stripes, a grid of dots, or waves."""
    rnd = random.Random(seed)
    pal = PALETTES[seed % len(PALETTES)]
    im = Image.new("RGB", (w, h), pal[-1])
    d = ImageDraw.Draw(im)
    if kind == "circles":
        for _ in range(14):
            r = rnd.randint(h // 12, h // 3)
            x, y = rnd.randint(0, w), rnd.randint(0, h)
            d.ellipse([x - r, y - r, x + r, y + r], fill=rnd.choice(pal[:-1]))
    elif kind == "stripes":
        x = 0
        while x < w:
            sw = rnd.randint(w // 30, w // 8)
            d.rectangle([x, 0, x + sw, h], fill=rnd.choice(pal[:-1]))
            x += sw + rnd.randint(4, w // 20)
    elif kind == "dots":
        step = max(18, w // 22)
        for gy in range(step, h, step):
            for gx in range(step, w, step):
                r = step * 0.18 + step * 0.22 * (0.5 + 0.5 * math.sin(gx * 0.02 + gy * 0.03 + seed))
                d.ellipse([gx - r, gy - r, gx + r, gy + r], fill=pal[(gx // step + gy // step) % 4])
    else:  # waves
        for k in range(9):
            col = pal[k % 4]
            pts = [(x, h * (0.12 + 0.1 * k) + 26 * math.sin(x / (40 + 9 * k) + seed + k)) for x in range(0, w + 8, 8)]
            d.line(pts, fill=col, width=max(4, h // 60))
    im.save(os.path.join(OUT, name), quality=86)


def poster(name, title, sub, seed):
    w, h = 900, 1200
    rnd = random.Random(seed)
    pal = PALETTES[seed % len(PALETTES)]
    im = Image.new("RGB", (w, h), pal[-1])
    d = ImageDraw.Draw(im)
    for _ in range(7):
        r = rnd.randint(80, 260)
        x, y = rnd.randint(0, w), rnd.randint(380, h)
        d.ellipse([x - r, y - r, x + r, y + r], fill=rnd.choice(pal[:-1]))
    big = ImageFont.load_default(size=96)
    small = ImageFont.load_default(size=40)
    y = 90
    for line in title.split("\n"):
        d.text((70, y), line, font=big, fill=pal[0]); y += 110
    d.text((74, y + 20), sub, font=small, fill="#2a2623")
    im.save(os.path.join(OUT, name), quality=88)


def video(name, src, filt, seconds=6, size="640x360", tone=None):
    """A short generative clip from one of ffmpeg's built-in sources; `tone` (Hz) adds a quiet synthesized sound."""
    cmd = ["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", src + (":" if "=" in src else "=") + f"size={size}:rate=30"]
    if tone:
        cmd += ["-f", "lavfi", "-i", f"sine=frequency={tone}:sample_rate=44100:duration={seconds}"]
    cmd += ["-t", str(seconds), "-vf", filt + ",format=yuv420p", "-c:v", "libx264", "-crf", "30", "-preset", "veryfast", "-movflags", "+faststart"]
    cmd += (["-af", "volume=0.25,afade=t=in:d=0.3,afade=t=out:st=%g:d=0.5" % (seconds - 0.5), "-c:a", "aac", "-b:a", "64k", "-shortest"] if tone else ["-an"])
    subprocess.run(cmd + [os.path.join(OUT, name)], check=True)


if __name__ == "__main__":
    kinds = ["circles", "stripes", "dots", "waves"]
    for i in range(1, 25):
        w, h = (960, 600) if i % 5 else (720, 960)
        art(f"work{i:02d}.jpg", w, h, i * 7, kinds[i % 4])
    for i in range(1, 11):
        art(f"event{i:02d}.jpg", 800, 600, 100 + i, kinds[(i + 1) % 4])
    art("seed.jpg", 600, 600, 3, "dots")
    tint = "colorchannelmixer=.55:.25:.2:0:.2:.6:.2:0:.15:.3:.55"
    video("clip01.mp4", "life=ratio=0.2:mold=10:life_color=#2f5d50:death_color=#f4efe3:mold_color=#9bb79a", "scale=640:360:flags=neighbor", tone=220)
    video("clip02.mp4", "cellauto=rule=110", "scale=640:360:flags=neighbor," + tint)
    video("clip03.mp4", "mandelbrot", "hue=s=0.6", size="640x360")
    video("clip04.mp4", "sierpinski", "hue=h=90:s=0.5", tone=330)
    video("clip05.mp4", "gradients=speed=0.02:c0=#2f5d50:c1=#e3b07a:c2=#8fa3c4", "null")
    video("clip06.mp4", "cellauto=rule=30", "scale=640:360:flags=neighbor,hue=h=140:s=0.7")
    posters = [("OPEN\nSTUDIO", "2024.03  Saturday 14:00"), ("SOUND\nPLAYGROUND", "Workshop vol.1"), ("DRAW\nWITH DATA", "Talk + Q&A"),
               ("MAKER\nNIGHT", "2024.10  Community"), ("LIGHT\n& PAPER", "Exhibition"), ("TOOLS\nFOR ONE", "Demo day")]
    for i, (t, s) in enumerate(posters, 1):
        poster(f"poster{i:02d}.jpg", t, s, 40 + i)
    print("demo media written to", OUT)
