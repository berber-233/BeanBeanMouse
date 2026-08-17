#!/usr/bin/env python3
"""BeanBeanMouse character hamsters v2 — 48x48 cells, 4 directions x 2 frames.

Golden hamster (金丝熊) with puffy cheek pouches, big round ears, warm fur ramp,
cream muzzle/belly, red scarf, and four medieval-style costumes:
land (road merchant) / sea (sailor) / air (aviator) / insurance (clerk).
"""
import json
import os
import shutil
import sys

sys.path.insert(0, r"C:\Users\LENOVO\.codex\skills\pixel-art-studio\scripts")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from PIL import Image, ImageOps
from pixelstudio import Sprite
from bbm_hamster import *

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.abspath(os.path.join(ROOT, "..", "..", "assets", "pixel"))
os.makedirs(OUT, exist_ok=True)

CELL = 48
DIRS = ["front", "back", "left", "right"]
CHARS = ["land", "sea", "air", "insurance"]
FRAMES = 2
PAD = 2

PAL = ([DARK, WHITE, LENS, TAN, BOOT, CHEEK, CHEEK_L, BELLY, MUZZ, EARIN, NOSE]
       + FUR + SCARF + GOLD + LEATH + GREEN + NAVY + CREAM + JACK + ROBE)


def build():
    cols = len(DIRS) * FRAMES
    rows = len(CHARS)
    w = cols * CELL + (cols + 1) * PAD
    h = rows * CELL + (rows + 1) * PAD
    s = Sprite(w, h, palette=PAL)
    cells_dir = os.path.join(ROOT, "cells")
    os.makedirs(cells_dir, exist_ok=True)

    for ci, cname in enumerate(CHARS):
        for di, direction in enumerate(DIRS):
            for fr in range(FRAMES):
                cell = Sprite(CELL, CELL, palette=PAL)
                if direction == "left":
                    draw_hamster(cell, 24, 3, "right", cname, fr)
                    tmp = os.path.join(cells_dir, "%s-%s-%d.png" % (cname, direction, fr))
                    cell.save_png(tmp, frame=1, scale=1)
                    im = Image.open(tmp).convert("RGBA")
                    ImageOps.mirror(im).save(tmp)
                else:
                    draw_hamster(cell, 24, 3, direction, cname, fr)
                    tmp = os.path.join(cells_dir, "%s-%s-%d.png" % (cname, direction, fr))
                    cell.save_png(tmp, frame=1, scale=1)
                x0 = PAD + di * FRAMES * (CELL + PAD) + fr * (CELL + PAD)
                y0 = PAD + ci * (CELL + PAD)
                s.paste_png(tmp, x0, y0)

    shutil.rmtree(cells_dir, ignore_errors=True)
    s.save_png(os.path.join(OUT, "hamsters.png"), frame=1, scale=1)

    meta = {
        "description": "BeanBeanMouse character hamsters v2 (48x48 golden hamster cells, padded atlas).",
        "cell_size": CELL,
        "padding": PAD,
        "cols": cols,
        "rows": rows,
        "order": ["col = direction*2 + frame", "row = character"],
        "directions": DIRS,
        "frames_per_direction": FRAMES,
        "characters": CHARS,
        "costumes": {
            "land": "green tunic + leather cap + belt pouch (road merchant)",
            "sea": "sailor tricorn hat + striped shirt + compass",
            "air": "aviator cap + goggles + brown jacket + red scarf",
            "insurance": "cream robe + red cross + quill + coin purse"
        },
        "files": {
            "land": "assets/pixel/hamster-land.gif",
            "sea": "assets/pixel/hamster-sea.gif",
            "air": "assets/pixel/hamster-air.gif",
            "insurance": "assets/pixel/hamster-insurance.gif"
        },
        "license_note": "Platform original artwork."
    }
    with open(os.path.join(OUT, "hamsters-atlas.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

    s.save_png(os.path.join(ROOT, "preview-hamsters.png"), frame=1, scale=4)
    s.stats()

    # per-character breathing GIFs (front view, 2 frames)
    for cname in CHARS:
        g = Sprite(CELL, CELL, palette=PAL)
        for fr in range(FRAMES):
            if fr:
                g.add_frame(copy=True)
            g.use(frame=fr + 1)
            g.clear()
            draw_hamster(g, 24, 3, "front", cname, fr)
        g.set_duration(340, "all")
        g.save_gif(os.path.join(OUT, "hamster-" + cname + ".gif"), scale=5, bg="#fff6e3")
        g.save_png(os.path.join(ROOT, "preview-%s.png" % cname), frame=1, scale=5)


if __name__ == "__main__":
    build()
    print("exported to", OUT)
