#!/usr/bin/env python3
# BeanBeanMouse character hamsters: land / sea / air / insurance.
# 32x32 chibi, 4 directions (front/back/left/right) x 2 idle frames,
# medieval-style costumes. Exports spritesheet + per-character GIFs.
import sys, os
sys.path.insert(0, r"C:\Users\LENOVO\.codex\skills\pixel-art-studio\scripts")
from pixelstudio import Sprite, ramp

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.abspath(os.path.join(ROOT, "..", "..", "assets", "pixel"))
os.makedirs(OUT, exist_ok=True)

DARK  = "#241b12"
FUR   = ramp("#e0912f", 4, hue_shift=10)
EARIN = ramp("#f7c6a0", 2, hue_shift=6)
SCARF = ramp("#d94a3a", 3, hue_shift=10)
GREEN = ramp("#4f8f3a", 4, hue_shift=10)
NAVY  = ramp("#2f4a8c", 4, hue_shift=10)
JACK  = ramp("#7e4e25", 4, hue_shift=10)
ROBE  = ramp("#e8d9b0", 4, hue_shift=8)
LEATH = ramp("#8a5a2b", 3, hue_shift=8)
GOLD  = ramp("#f2b705", 3, hue_shift=8)
SKINP = "#f7c6a0"

CELL = 32
DIRS = ["front", "back", "left", "right"]
CHARS = ["land", "sea", "air", "insurance"]
FRAMES = 2

def s_px(s, x, y, c):
    if 0 <= x < CELL and 0 <= y < CELL:
        s.px(x, y, c)

def draw_head(s, cx, dirn, bob, cap=None, goggles=False):
    """Chibi hamster head. cx = head center x; bob shifts body down 1 on frame 2."""
    y = 0 + bob
    # ears (both for front/back, one for side)
    if dirn in ("front", "back"):
        s_px(s, cx - 7, 2 + y, FUR[2]); s_px(s, cx - 6, 2 + y, FUR[2])
        s_px(s, cx - 7, 3 + y, FUR[3]); s_px(s, cx - 6, 3 + y, FUR[3])
        s_px(s, cx - 6, 3 + y, EARIN[1])
        s_px(s, cx + 5, 2 + y, FUR[2]); s_px(s, cx + 6, 2 + y, FUR[2])
        s_px(s, cx + 5, 3 + y, FUR[3]); s_px(s, cx + 6, 3 + y, FUR[3])
        s_px(s, cx + 5, 3 + y, EARIN[1])
    else:
        ex = cx + 7 if dirn == "right" else cx - 7
        s_px(s, ex, 2 + y, FUR[2]); s_px(s, ex + (1 if dirn == "right" else -1), 2 + y, FUR[2])
        s_px(s, ex, 3 + y, FUR[3]); s_px(s, ex + (1 if dirn == "right" else -1), 3 + y, FUR[3])
    # head dome
    s.circle(cx, 8 + y, 7, FUR[2], fill=True)
    s.circle(cx, 7 + y, 6, FUR[3], only="opaque")
    s.circle(cx, 6 + y, 4, FUR[3], only="opaque")
    # cheek fluff
    if dirn in ("front", "back"):
        s_px(s, cx - 7, 11 + y, FUR[1]); s_px(s, cx + 6, 11 + y, FUR[1])
    else:
        fx = cx + 7 if dirn == "right" else cx - 7
        s_px(s, fx, 11 + y, FUR[1])
    # muzzle
    if dirn == "front":
        s.rect(cx - 4, 11 + y, cx + 4, 14 + y, SKINP)
        s_px(s, cx, 10 + y, SKINP)
        s_px(s, cx - 1, 12 + y, DARK); s_px(s, cx + 1, 12 + y, DARK)
        s_px(s, cx, 13 + y, DARK)
        s_px(s, cx - 2, 14 + y, DARK); s_px(s, cx + 2, 14 + y, DARK)
    elif dirn == "back":
        pass
    else:
        mx = cx + 6 if dirn == "right" else cx - 6
        s.rect(mx - 2, 11 + y, mx + 2, 13 + y, SKINP)
        s_px(s, mx, 12 + y, DARK)
    # eyes
    if dirn == "front":
        s_px(s, cx - 3, 9 + y, DARK); s_px(s, cx + 3, 9 + y, DARK)
        s_px(s, cx - 4, 8 + y, DARK); s_px(s, cx + 2, 8 + y, DARK)
    elif dirn in ("left", "right"):
        ex = cx + 3 if dirn == "right" else cx - 3
        s_px(s, ex, 9 + y, DARK); s_px(s, ex + (1 if dirn == "right" else -1), 9 + y, DARK)
    # cap / goggles
    if cap == "leather":
        s.rect(cx - 7, 3 + y, cx + 7, 4 + y, LEATH[1])
        s.rect(cx - 7, 5 + y, cx + 7, 5 + y, LEATH[0])
        s_px(s, cx + 7, 5 + y, LEATH[2])
    elif cap == "sailor":
        s.rect(cx - 8, 3 + y, cx + 8, 4 + y, NAVY[3])
        s.rect(cx - 6, 5 + y, cx + 6, 5 + y, NAVY[0])
        s_px(s, cx, 3 + y, GOLD[2])
    if goggles:
        s.rect(cx - 7, 3 + y, cx + 7, 5 + y, JACK[3])
        s.circle(cx - 3, 5 + y, 2, SKINP, fill=True)
        s.circle(cx + 3, 5 + y, 2, SKINP, fill=True)
        s_px(s, cx - 3, 5 + y, "#7fb6d8"); s_px(s, cx + 3, 5 + y, "#7fb6d8")

def draw_body(s, cx, dirn, bob, outfit):
    y = 14 + bob
    # scarf
    if dirn == "front":
        s.rect(cx - 6, 15 + bob, cx + 6, 16 + bob, SCARF[1])
        s_px(s, cx, 17 + bob, SCARF[1])
    elif dirn == "back":
        s.rect(cx - 6, 15 + bob, cx + 6, 15 + bob, SCARF[1])
    else:
        sx = cx + 6 if dirn == "right" else cx - 6
        s.rect(cx - 5, 15 + bob, cx + 5, 16 + bob, SCARF[1])
        s_px(s, sx, 15 + bob, SCARF[2]); s_px(s, sx + (1 if dirn == "right" else -1), 16 + bob, SCARF[2])
    # torso
    s.rect(cx - 6, 18 + bob, cx + 6, 24 + bob, outfit["main"][1])
    s.rect(cx - 6, 24 + bob, cx + 6, 24 + bob, outfit["main"][0])
    # belt
    s.rect(cx - 6, 22 + bob, cx + 6, 22 + bob, LEATH[1])
    s_px(s, cx, 22 + bob, GOLD[2])
    # outfit details
    if outfit["id"] == "land":
        s.rect(cx - 6, 18 + bob, cx + 6, 19 + bob, outfit["main"][2])
        s.rect(cx - 4, 23 + bob, cx - 2, 24 + bob, LEATH[2])
    elif outfit["id"] == "sea":
        for i, rx in enumerate(range(cx - 6, cx + 7, 3)):
            if i % 2 == 0:
                s.rect(rx, 19 + bob, min(rx + 2, cx + 6), 21 + bob, NAVY[2])
        s.rect(cx - 6, 19 + bob, cx + 6, 21 + bob, ROBE[2])
    elif outfit["id"] == "air":
        s_px(s, cx - 4, 19 + bob, GOLD[2]); s_px(s, cx, 19 + bob, GOLD[2]); s_px(s, cx + 4, 19 + bob, GOLD[2])
        s.rect(cx - 6, 20 + bob, cx + 6, 21 + bob, outfit["main"][2])
    elif outfit["id"] == "insurance":
        s.rect(cx - 4, 18 + bob, cx + 4, 21 + bob, SCARF[1])
        s.rect(cx - 2, 19 + bob, cx + 2, 20 + bob, ROBE[3])
        s_px(s, cx, 19 + bob, SCARF[1]); s_px(s, cx - 1, 19 + bob, SCARF[1])
        s_px(s, cx, 21 + bob, SCARF[1])
        s_px(s, cx + 5, 23 + bob, GOLD[2]); s_px(s, cx + 6, 23 + bob, GOLD[2])
    # feet
    if dirn == "front":
        s_px(s, cx - 4, 26 + bob, FUR[2]); s_px(s, cx - 3, 26 + bob, FUR[2])
        s_px(s, cx + 3, 26 + bob, FUR[2]); s_px(s, cx + 4, 26 + bob, FUR[2])
    else:
        fx = cx + 4 if dirn == "right" else cx - 4
        s_px(s, fx, 26 + bob, FUR[2]); s_px(s, fx + (1 if dirn == "right" else -1), 26 + bob, FUR[2])
    # tail
    if dirn == "back":
        s_px(s, cx + 5, 19 + bob, FUR[2]); s_px(s, cx + 6, 19 + bob, FUR[2])
    elif dirn in ("left", "right"):
        tx = cx - 7 if dirn == "right" else cx + 7
        s_px(s, tx, 23 + bob, FUR[2])

def draw_hamster(s, cx, dirn, frame, outfit):
    bob = 1 if frame == 1 else 0
    draw_head(s, cx, dirn, bob, cap=outfit["cap"], goggles=outfit["goggles"])
    draw_body(s, cx, dirn, bob, outfit)
    # quill for insurance (side only)
    if outfit["id"] == "insurance" and dirn in ("left", "right"):
        qx = cx + 7 if dirn == "right" else cx - 7
        s_px(s, qx, 10 + bob, ROBE[3]); s_px(s, qx + (1 if dirn == "right" else -1), 9 + bob, ROBE[3])
        s_px(s, qx + (1 if dirn == "right" else -1), 8 + bob, GOLD[2])

OUTFITS = {
    "land":      {"id": "land",      "main": GREEN, "cap": "leather", "goggles": False},
    "sea":       {"id": "sea",       "main": NAVY,  "cap": "sailor",  "goggles": False},
    "air":       {"id": "air",       "main": JACK,  "cap": None,      "goggles": True},
    "insurance": {"id": "insurance", "main": ROBE,  "cap": None,      "goggles": False},
}

PAL = [DARK, SKINP, "#7fb6d8"] + FUR + EARIN + SCARF + GREEN + NAVY + JACK + ROBE + LEATH + GOLD

def build():
    s = Sprite(CELL * 8, CELL * 4, palette=PAL)
    cells_dir = os.path.join(ROOT, "cells")
    os.makedirs(cells_dir, exist_ok=True)
    for ci, cname in enumerate(CHARS):
        for di, dirn in enumerate(DIRS):
            for fr in range(FRAMES):
                x0 = (di * FRAMES + fr) * CELL
                y0 = ci * CELL
                cell = Sprite(CELL, CELL, palette=PAL)
                draw_hamster(cell, 16, dirn, fr, OUTFITS[cname])
                tmp = os.path.join(cells_dir, "%s-%s-%d.png" % (cname, dirn, fr))
                cell.save_png(tmp, frame=1, scale=1)
                s.paste_png(tmp, x0, y0)
    import shutil
    shutil.rmtree(cells_dir, ignore_errors=True)
    s.save_spritesheet(os.path.join(OUT, "hamsters.png"), layout="grid", scale=1, padding=0,
                       json_path=os.path.join(OUT, "hamsters.json"))
    if os.path.exists(os.path.join(OUT, "hamsters.json")):
        os.remove(os.path.join(OUT, "hamsters.json"))
    import json
    meta = {
        "description": "BeanBeanMouse character hamsters (pixel art). 32x32 cells, 8 cols x 4 rows.",
        "cell_size": 32,
        "cols": 8,
        "rows": 4,
        "order": ["col = direction*2 + frame", "row = character"],
        "directions": ["front", "back", "left", "right"],
        "frames_per_direction": 2,
        "characters": ["land", "sea", "air", "insurance"],
        "costumes": {
            "land": "green tunic + leather cap + pouch (road merchant)",
            "sea": "sailor tricorn hat + cream shirt + rope belt",
            "air": "goggles + brown jacket + red scarf",
            "insurance": "cream robe + red cross tabard + quill + coin purse"
        },
        "files": {
            "land": "assets/pixel/hamster-land.gif",
            "sea": "assets/pixel/hamster-sea.gif",
            "air": "assets/pixel/hamster-air.gif",
            "insurance": "assets/pixel/hamster-insurance.gif"
        },
        "license_note": "Platform original artwork (placeholder until replaced by commissioned art)."
    }
    with open(os.path.join(OUT, "hamsters-atlas.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)
    s.save_png(os.path.join(ROOT, "preview-hamsters.png"), frame=1, scale=6)
    s.stats()
    # per-character idle GIFs (front view)
    for ci, cname in enumerate(CHARS):
        g = Sprite(CELL, CELL, palette=PAL)
        for fr in range(FRAMES):
            if fr: g.add_frame(copy=True)
            g.use(frame=fr + 1)
            g.clear()
            draw_hamster(g, 16, "front", fr, OUTFITS[cname])
        g.set_duration(320, "all")
        g.save_gif(os.path.join(OUT, "hamster-" + cname + ".gif"), scale=4, bg="#fff6e3")

if __name__ == "__main__":
    build()
    print("exported to", OUT)
