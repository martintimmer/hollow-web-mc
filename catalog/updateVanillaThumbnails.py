#!/usr/bin/env python3
"""Update the inventory preview thumbnails for all VANILLA (<= Minecraft 1.5.3)
objects with accurate render images pulled from minecraft.wiki (the "Blocks"
knowledge base site).

Why: catalog/generateAllThumbnails.js builds thumbnails by matching local
texture filenames against each object's snake-case name; when no file matches
it silently falls back to stone.png, so many inventory previews are wrong.

Method (per vanilla object):
  1. Derive the minecraft.wiki page title from the catalog name (title-cased,
     trailing state-parentheses stripped, known aliases mapped).
  2. Query the MediaWiki pageimages API (redirects=1) for the page's render image.
  3. Download a 64px thumbnail PNG and store it as a base64 data-URI.
  4. Merge into catalog/thumbnailsCache.json (overwriting only vanilla ids;
     extended/custom + texture-helper objects keep their existing thumbnails)
     and regenerate public/catalog/thumbnails.json.

Run:  python3 catalog/updateVanillaThumbnails.py
"""
import base64
import io
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request

try:
    from PIL import Image
    HAVE_PIL = True
except Exception:
    HAVE_PIL = False

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

API = "https://minecraft.wiki/api.php"
UA = "WebMC-thumbfix/1.0 (fixing inventory preview thumbnails; contact: local)"
SLEEP = 0.12  # be polite to the wiki (approx 470 requests -> ~1 min)

# Catalog display name -> minecraft.wiki page title (big name mismatches only;
# everything else is just title-cased and resolved via wiki redirects).
TITLE_ALIASES = {
    "lapis block": "Lapis Lazuli Block",
    "quartz block": "Block of Quartz",
    "diamond block": "Block of Diamond",
    "gold block": "Block of Gold",
    "emerald block": "Block of Emerald",
    "redstone block": "Block of Redstone",
    "iron block": "Block of Iron",
    "clay block": "Clay",
    "brick block": "Bricks",
    "spawner": "Monster Spawner",
    "lit furnace": "Furnace",
    "oak boat": "Boat",
    "oak sign": "Sign",
    "red bed": "Bed",
    "snowy grass": "Grass Block",
    "vine": "Vines",
    "chest minecart": "Minecart with Chest",
    "furnace minecart": "Minecart with Furnace",
    "hopper minecart": "Minecart with Hopper",
    "tnt minecart": "Minecart with TNT",
    "oak door (closed)": "Oak Door",
    "oak door (open)": "Oak Door",
    "oak trapdoor (closed)": "Oak Trapdoor",
    "oak trapdoor (open)": "Oak Trapdoor",
    "redstone lamp (lit)": "Redstone Lamp",
    "redstone lamp (off)": "Redstone Lamp",
    "brewing stand (lit)": "Brewing Stand",
    "jack o'lantern": "Jack o'Lantern",
    "jack o lantern": "Jack o'Lantern",
    "comparator": "Redstone Comparator",
    "repeater": "Redstone Repeater",
    "redstone": "Redstone Dust",
    "glistering melon slice": "Glistering Melon Slice",
    "ender eye": "Eye of Ender",
    "quartz": "Nether Quartz",
    "experience bottle": "Bottle o' Enchanting",
    "writable book": "Book and Quill",
    "filled map": "Map",
    "cooked beef": "Steak",
    "porkchop": "Raw Porkchop",
    "chicken": "Raw Chicken",
    "cod": "Cod",
    "cooked cod": "Cooked Cod",
    "carrots": "Carrot",
    "potatoes": "Potato",
    "slime ball": "Slimeball",
    "stone bricks": "Stone Bricks",
    "nether bricks": "Nether Bricks",
    "spawn egg": "Spawn Egg",
    "oak sapling": "Oak Sapling",
    "brewing stand base": "Brewing Stand",
    "end portal frame": "End Portal Frame",
    "end portal frame eye": "End Portal Frame",
    "glowstone": "Glowstone",
    "jack o lantern": "Jack o'Lantern",
    "reeds (sugarcane)": "Sugar Cane",
    "music disc 11": "Music Disc 11",
    "music disc 13": "Music Disc 13",
}


def wiki_title(name: str) -> str:
    low = name.lower()
    if low in TITLE_ALIASES:
        return TITLE_ALIASES[low]
    n = re.sub(r"\s*\([^)]*\)$", "", name).strip()
    n = re.sub(r"\s+", " ", n)
    words = n.split()
    if not words:
        return ""
    return " ".join(w[0].upper() + w[1:] for w in words)


def api_query(titles: str):
    params = {
        "action": "query",
        "format": "json",
        "redirects": "1",
        "titles": titles,
        "prop": "pageimages",
        "pithumbsize": "64",
    }
    url = API + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.load(resp)


def fetch_data_uri(url: str):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = resp.read()
    ctype = resp.headers.get("Content-Type", "image/png").split(";")[0].strip()
    if ctype not in ("image/png", "image/gif", "image/webp", "image/jpeg"):
        ctype = "image/png"
    uri = "data:%s;base64,%s" % (ctype, base64.b64encode(data).decode("ascii"))
    return resize_png(uri) if ctype == "image/png" else uri


def resize_png(data_uri: str) -> str:
    """Downscale to a 48x48 transparent canvas (nearest-neighbour) and quantize
    to a small palette so previews stay crisp yet tiny (Pillow optional; without
    it the wiki PNG is stored as-is). Animated GIFs are left untouched."""
    if not HAVE_PIL:
        return data_uri
    try:
        raw = base64.b64decode(data_uri.split(",", 1)[1])
        im = Image.open(io.BytesIO(raw)).convert("RGBA")
        w, h = im.size
        scale = 48 / max(w, h)
        nw, nh = max(1, round(w * scale)), max(1, round(h * scale))
        im = im.resize((nw, nh), Image.NEAREST)
        canvas = Image.new("RGBA", (48, 48), (0, 0, 0, 0))
        canvas.paste(im, ((48 - nw) // 2, (48 - nh) // 2), im)
        canvas = canvas.quantize(colors=96, method=Image.Quantize.FASTOCTREE)
        buf = io.BytesIO()
        canvas.save(buf, "PNG", optimize=True)
        return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode("ascii")
    except Exception:
        return data_uri


def main():
    registry = json.load(open(os.path.join(ROOT, "catalog/completeRegistry.json")))
    cls = json.load(open(os.path.join(ROOT, "catalog/object-classification.json")))
    cache_path = os.path.join(ROOT, "catalog/thumbnailsCache.json")
    cache = json.load(open(cache_path)) if os.path.exists(cache_path) else {}

    vanilla = [(e["id"], e.get("name", "")) for e in registry
               if cls.get(str(e["id"]), {}).get("kind") == "vanilla"]
    print(f"Updating {len(vanilla)} vanilla thumbnails from minecraft.wiki ...")

    updated = failed = missing = 0
    for i, (oid, name) in enumerate(vanilla):
        if oid == 0:
            continue
        title = wiki_title(name)
        # texture-helper rows (Clock 00..63, Compass 00..31, Fire N, Redstone
        # Dust Dot/Line0, Grass Block Side Overlay, ...) have no wiki page — the
        # API reports them missing and their existing texture-frame thumbnails
        # are kept.
        if not title:
            continue
        try:
            data = api_query(title)
            pages = data.get("query", {}).get("pages", {})
            thumb_url = None
            for p in pages.values():
                if "thumbnail" in p:
                    thumb_url = p["thumbnail"].get("source")
                elif p.get("pageimage"):
                    thumb_url = ("https://minecraft.wiki/images/"
                                 + p["pageimage"].replace(" ", "_"))
            if not thumb_url:
                missing += 1
                continue
            cache[str(oid)] = fetch_data_uri(thumb_url)
            updated += 1
        except Exception as e:
            failed += 1
            if failed <= 10:
                print(f"  ! id {oid} '{name}' -> {e}")
        time.sleep(SLEEP)
        if (i + 1) % 100 == 0:
            print(f"  ... {i + 1}/{len(vanilla)} (updated {updated}, missing {missing})")

    print(f"Done: {updated} updated, {missing} no-wiki-image (kept old), {failed} errors.")

    with open(cache_path, "w") as f:
        json.dump(cache, f)
    out_path = os.path.join(ROOT, "public/catalog/thumbnails.json")
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w") as f:
        json.dump(cache, f)
    size_mb = os.path.getsize(out_path) / 1048576
    print(f"Wrote {len(cache)} thumbnails -> {out_path} ({size_mb:.2f} MB)")


if __name__ == "__main__":
    main()