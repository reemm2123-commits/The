"""شغّله مرة واحدة على جهازك (يحتاج إنترنت): python scripts/download_images.py
ينزّل كل صور اللعبة من سيرفر Emergent ويحفظها داخل frontend/public/images
ثم يعدّل frontend/src/lib/assets.js لتقرأ الصور من مشروعك."""
import re, pathlib, urllib.request

root = pathlib.Path(__file__).resolve().parent.parent
assets = root / "frontend/src/lib/assets.js"
out = root / "frontend/public/images"
out.mkdir(parents=True, exist_ok=True)

src = assets.read_text(encoding="utf-8")
base = re.search(r'const BASE = "([^"]+)"', src).group(1)
for name, file in re.findall(r'(\w+): BASE \+ "([^"]+)"', src):
    dest = out / file
    if not dest.exists():
        print("downloading", name)
        urllib.request.urlretrieve(base + file, dest)
src = src.replace(f'const BASE = "{base}";', 'const BASE = "/images/";')
assets.write_text(src, encoding="utf-8")
print("تم ✅ الآن ارفع المشروع على GitHub")
