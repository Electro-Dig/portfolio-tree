"""Make cover images of your tree with headless Chrome: landscape 4:3 and portrait 3:4, with and without the title.

    python tools/make_cover.py                    # → covers/*.png
    python tools/make_cover.py --mode tree        # the tree layout instead of the growth map
    python tools/make_cover.py --content private  # from content-private/ instead of content/

Chrome is looked up in the usual places; set CHROME=/path/to/chrome if it is somewhere else.
"""
import argparse, os, pathlib, shutil, subprocess, tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
CANDIDATES = [os.environ.get("CHROME", ""), shutil.which("google-chrome") or "", shutil.which("chromium") or "", shutil.which("chrome") or "",
              r"C:\Program Files\Google\Chrome\Application\chrome.exe", r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
              "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome", "/usr/bin/chromium"]


def chrome():
    for c in CANDIDATES:
        if c and os.path.exists(c):
            return c
    raise SystemExit("Chrome / Edge not found — set CHROME=/path/to/chrome")


def shot(url, size, out):
    with tempfile.TemporaryDirectory() as prof:
        subprocess.run([chrome(), "--headless=new", "--hide-scrollbars", "--allow-file-access-from-files", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
                        "--force-device-scale-factor=2", f"--window-size={size}", "--virtual-time-budget=20000", f"--user-data-dir={prof}",
                        f"--screenshot={out}", url], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print("wrote", out)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--mode", default=None, choices=["map", "tree"])
    ap.add_argument("--content", default=None)
    ap.add_argument("--out", default=str(ROOT / "covers"))
    a = ap.parse_args()
    a.out = os.path.abspath(a.out); os.makedirs(a.out, exist_ok=True)   # Chrome needs an absolute screenshot path
    base = (ROOT / "index.html").as_uri()
    extra = "".join(f"&{k}={v}" for k, v in (("mode", a.mode), ("content", a.content)) if v)
    tag = f"_{a.mode}" if a.mode else ""
    shot(f"{base}?cover=title{extra}", "1600,1200", os.path.join(a.out, f"cover_4x3_title{tag}.png"))
    shot(f"{base}?cover{extra}", "1600,1200", os.path.join(a.out, f"cover_4x3{tag}.png"))
    shot(f"{base}?cover=title-v{extra}", "1200,1600", os.path.join(a.out, f"cover_3x4_title{tag}.png"))
    shot(f"{base}?cover{extra}", "1200,1600", os.path.join(a.out, f"cover_3x4{tag}.png"))
