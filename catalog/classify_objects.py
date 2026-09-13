#!/usr/bin/env python3
"""Classify every catalog object as VANILLA (up to Minecraft Java 1.5.3) or EXTENDED.

Cutoff rule: "main" items = everything that existed in vanilla Minecraft up to
Java Edition 1.5.3 (the Redstone Update, March 2013 — 1.5.1/1.5.2/1.5.3 were
bug-fix releases that added no new blocks/items). Everything else — vanilla
items added in 1.6.1 and later AND our custom objects — is "extended".

The 1.5.3 block/item set was compiled online from
meeples10.github.io/items-by-version.html (itself compiled from the Minecraft
Wiki version-history articles; last updated Nov 2024) and cross-checked against
minecraft.wiki: the boundary 1.6.1 additions (hay bale, carpet, hardened/stained
clay, block of coal, horse armor, lead, name tag) are all classified "extended".

Matching is name-based against catalog/vanilla-153.json (normalized 1.5.3 names),
plus drift rules for names that differ between the "first-added" list and our
catalog's modern names:
  - wood-family rule: oak/spruce/birch/jungle variants of log/planks/leaves/
    sapling/stairs/slab/wood/fence/fence-gate/door/trapdoor/button/boat/sign
    existed by 1.5.3 (acacia/dark-oak/cherry/mangrove/bamboo/crimson/warped do not);
  - wool/dye families: all 16 colors existed by 1.5.3;
  - music discs: the 12 discs released through 1.4.4;
  - alias map for renames (Cloth->Wool, Block of X <-> X block, Rose->Poppy,
    Reeds->Sugar Cane, Steak->Cooked Beef, ...);
  - helper/state stripping (front/overlay/base/inside/numeric frames...) so
    texture-part rows inherit their base object's classification.
"""
import json, re, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

catalog = json.load(open(os.path.join(ROOT, "catalog/completeRegistry.json")))
v153 = set(json.load(open(os.path.join(ROOT, "catalog/vanilla-153.json")))["minecraft_1_5_3"])

# Items known to exist in 1.5.3 but missing from the "by version added" list
# (they were added via metadata states rather than new registry entries).
V153_EXTRA = {"tripwire", "cocoa", "dragonegg"}

# --- 1.5.3-era wood types and the families each type had by then ---
WOOD_TYPES = {"oak", "spruce", "birch", "jungle"}
WOOD_FAMILY = {
    "log", "planks", "leaves", "sapling", "stairs", "slab", "wood",
}
OAK_ONLY_FAMILY = {"fence", "fencegate", "door", "trapdoor", "button", "boat", "sign"}

WOOL_COLORS = {"white", "orange", "magenta", "lightblue", "yellow", "lime", "pink",
               "gray", "lightgray", "cyan", "purple", "blue", "brown", "green",
               "red", "black"}
DYE_COLORS = WOOL_COLORS

VANILLA_DISCS = {"13", "cat", "blocks", "chirp", "far", "mall", "mellohi",
                 "stal", "strad", "ward", "11", "wait"}

# Catalog display name -> a normalized 1.5.3 name-set token (aliases for renames).
ALIASES = {
    "clayblock": "clay",
    "brickblock": "bricks",
    "spawner": "mobspawner",
    "goldblock": "blockofgold",
    "diamondblock": "blockofdiamond",
    "emeraldblock": "blockofemerald",
    "redstoneblock": "blockofredstone",
    "quartzblock": "blockofquartz",
    "lapisblock": "lapislazuliblock",
    "lapisore": "lapislazuliore",
    "redstone": "redstonedust",
    "repeater": "redstonerepeater",
    "comparator": "redstonecomparator",
    "daylightdetector": "daylightsensor",
    "daylightdetectorinverted": "daylightsensor",
    "poppy": "rose",
    "sugarcane": "reeds",
    "snowygrass": "grassblock",
    "litfurnace": "furnace",
    "cookedbeef": "steak",
    "porkchop": "rawporkchop",
    "chicken": "rawchicken",
    "cod": "rawfish",
    "cookedcod": "cookedfish",
    "filledmap": "map",
    "filledmapmarkings": "map",
    "writablebook": "bookandquill",
    "experiencebottle": "bottleoenchanting",
    "glisteringmelonslice": "glisteringmelon",
    "endereye": "eyeofender",
    "quartz": "netherquartz",
    "oakboat": "boat",
    "oaksign": "sign",
    "chestminecart": "minecartwithchest",
    "furnaceminecart": "minecartwithfurnace",
    "hopperminecart": "minecartwithhopper",
    "tntminecart": "minecartwithtnt",
    "carrots": "carrot",
    "potatoes": "potato",
    "vine": "vines",
    "tripwire": "tripwire",
    "cocoa": "cocoa",
    "dragonegg": "dragonegg",
}

# Words stripped to resolve texture-part / state rows to their base object.
# Ordered longest-first so a helper never partially strips inside a longer word
# (e.g. "side" is a substring of "inside" — stripping must be deterministic).
# Deliberately NOT stripped: large/small/big (Large Fern etc. are post-1.5.3),
# carved, waxed, oxidized, exposed, weathered, stained, glazed, polished,
# chiseled/cracked/mossy (their base variants are themselves distinct objects).
HELPER_WORDS = tuple(sorted({
    "overlay", "markings", "inside", "outside", "base", "tip",
    "front", "back", "top", "bottom", "side", "vertical",
    "conditional", "inverted", "cast", "model", "pulling",
    "standby", "dot", "line", "corner", "round", "pivot", "saw",
    "empty", "filled", "occupied", "compost", "ready", "bloom",
    "tendril", "inner", "summon", "chipped", "damaged", "stem",
    "plant", "bush", "raw"
}, key=len, reverse=True))

# Our own invented blocks/items (display-name substrings) — never "vanilla".
CUSTOM_MARKERS = ["maple", "aspen", "violet", "palm", "blossom", "redwood",
                  "swamp", "savanna", "stalk", "mystic", "hollowpine"]


def norm(name: str) -> str:
    n = name.lower()
    n = re.sub(r"\s*\([^)]*\)", "", n)
    return "".join(ch for ch in n if ch.isalnum())


def strip_helpers(token: str) -> str:
    for w in HELPER_WORDS:
        token = token.replace(w, "")
    return token


def classify(e):
    if e["id"] == 0:
        return ("vanilla", "air")
    name = e.get("name", "")
    low = name.lower()
    if any(m in low for m in CUSTOM_MARKERS):
        return ("extended", None)

    token = norm(name)

    # 1. Exact 1.5.3 name match.
    if token in v153 or token in V153_EXTRA:
        return ("vanilla", token)

    # 2. Music discs: "Music Disc X" -> disc title. Any musicdisc* token must
    # resolve here (never via digit-stripping below, or "Music Disc 5" (1.19)
    # would wrongly match the bare "musicdisc" 1.5.3 token).
    m = re.match(r"^musicdisc([a-z0-9]+)$", token)
    if m:
        return ("vanilla", "musicdisc") if m.group(1) in VANILLA_DISCS else ("extended", None)

    # 3. Wool / dye families: all 16 colors existed by 1.5.3.
    m = re.match(r"^(.+)wool$", token)
    if m and m.group(1) in WOOL_COLORS:
        return ("vanilla", f"{m.group(1)}wool")
    m = re.match(r"^(.+)dye$", token)
    if m and m.group(1) in DYE_COLORS:
        return ("vanilla", f"{m.group(1)}dye")

    # 4. Wood-family rule: only oak/spruce/birch/jungle types by 1.5.3.
    m = re.match(r"^(oak|spruce|birch|jungle)([a-z]+)$", token)
    if m:
        typ, fam = m.group(1), m.group(2)
        if fam in WOOD_FAMILY or (typ == "oak" and fam in OAK_ONLY_FAMILY):
            return ("vanilla", token)

    # 5. Alias map (renamed items whose 1.5.3 name differs).
    if token in ALIASES and ALIASES[token] in v153:
        return ("vanilla", ALIASES[token])

    # 6. Helper/state rows inherit their base object's classification.
    stripped = re.sub(r"[0-9]+$", "", token)
    if stripped and stripped in v153:
        return ("vanilla", stripped)
    for candidate in (strip_helpers(token), strip_helpers(stripped)):
        if candidate and candidate != token and candidate in v153:
            return ("vanilla", candidate)
        if candidate and candidate in ALIASES and ALIASES[candidate] in v153:
            return ("vanilla", ALIASES[candidate])

    return ("extended", None)


out = {}
vanilla = extended = 0
for e in catalog:
    kind, vid = classify(e)
    out[str(e["id"])] = {"kind": kind, "vanilla_id": vid, "name": e.get("name", "")}
    if kind == "vanilla":
        vanilla += 1
    else:
        extended += 1

with open(os.path.join(ROOT, "catalog/object-classification.json"), "w") as f:
    json.dump(out, f, indent=0)

print(f"Classified {len(out)} objects: {vanilla} vanilla (<=1.5.3) / {extended} extended.")
print("Sample extended (post-1.5.3 vanilla + customs):",
      [e["name"] for e in catalog if out[str(e["id"])]["kind"] == "extended"][:25])