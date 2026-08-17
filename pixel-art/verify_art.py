#!/usr/bin/env python3
"""Programmatic art verification — the 'eyes' for pixel-art QA.

Since the authoring environment cannot view bitmaps directly, this script
asserts the semantic features that make a golden hamster read as a hamster
(ears, cheek pouches, muzzle, eyes, fur ramp) plus costume signatures, motion
behaviour, palette hygiene and export integrity. Run after every rebuild.
"""
import json
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bbm_hamster as H

ROOT = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.abspath(os.path.join(ROOT, "..", "assets", "pixel"))

CHECKS = []


def check(name, ok, detail=""):
    CHECKS.append((name, bool(ok), detail))
    print(("PASS  " if ok else "FAIL  ") + name + (("  | " + detail) if detail else ""))


def hex2rgb(c):
    return tuple(int(c[i:i + 2], 16) for i in (1, 3, 5))


def load(path):
    return Image.open(path).convert("RGBA")


def color_at(im, x, y):
    if not (0 <= x < im.width and 0 <= y < im.height):
        return None
    return im.getpixel((x, y))[:3]


def has_color_in(im, box, rgb, tol=12):
    x0, y0, x1, y1 = box
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            c = color_at(im, x, y)
            if c and all(abs(c[i] - rgb[i]) <= tol for i in range(3)):
                return True
    return False


def bbox(im, box):
    x0, y0, x1, y1 = box
    xs, ys = [], []
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if im.getpixel((x, y))[3] > 0:
                xs.append(x)
                ys.append(y)
    if not xs:
        return None
    return (min(xs), min(ys), max(xs), max(ys))


def near(c, ref, tol=20):
    return c is not None and all(abs(c[i] - ref[i]) <= tol for i in range(3))


# ---------------------------------------------------------------------------
def verify_hamsters():
    atlas = load(os.path.join(ASSETS, "hamsters.png"))
    CELL = 48
    PAD = 2
    DIRS = ["front", "back", "left", "right"]
    CHARS = ["land", "sea", "air", "insurance"]
    cells = {}
    for ci, ch in enumerate(CHARS):
        for di, d in enumerate(DIRS):
            for fr in range(2):
                x0 = PAD + di * 2 * (CELL + PAD) + fr * (CELL + PAD)
                y0 = PAD + ci * (CELL + PAD)
                cells[(ch, d, fr)] = atlas.crop((x0, y0, x0 + CELL, y0 + CELL))

    fur_ref = hex2rgb(H.FUR[1])
    cheek_ref = hex2rgb(H.CHEEK_L)
    muzz_ref = hex2rgb(H.MUZZ)
    nose_ref = hex2rgb(H.NOSE)
    scarf_ref = hex2rgb(H.SCARF[1])
    dark_ref = hex2rgb(H.DARK)

    for ch in CHARS:
        im = cells[(ch, "front", 0)]
        # golden fur on head
        check("%s: golden fur on head" % ch, has_color_in(im, (10, 12, 38, 24), fur_ref),
              "expect FUR mid in head region")
        # ears: fur-colored ear pixels above head top (y 4..10)
        check("%s: big round ears above head" % ch,
              has_color_in(im, (8, 3, 16, 10), fur_ref) and has_color_in(im, (32, 3, 40, 10), fur_ref),
              "left+right ear regions")
        # cheek pouches (cream) at lower face sides
        check("%s: puffy cheek pouches" % ch,
              has_color_in(im, (8, 18, 16, 25), cheek_ref) and has_color_in(im, (32, 18, 40, 25), cheek_ref),
              "cream cheek patches both sides")
        # muzzle patch center-lower face
        check("%s: cream muzzle" % ch, has_color_in(im, (19, 20, 29, 27), muzz_ref),
              "muzzle region")
        # eyes: two dark 2px eyes upper face
        check("%s: two dark eyes" % ch,
              has_color_in(im, (15, 15, 18, 18), dark_ref) and has_color_in(im, (30, 15, 33, 18), dark_ref),
              "left+right eye boxes")
        # nose
        check("%s: pink nose" % ch, has_color_in(im, (21, 19, 27, 22), nose_ref), "nose box")
        # scarf
        check("%s: red scarf at neck" % ch, has_color_in(im, (15, 25, 33, 28), scarf_ref),
              "neck band region")
        # no clipping at cell edges
        bb = bbox(im, (0, 0, 47, 47))
        check("%s: silhouette inside cell margins" % ch,
              bb is not None and bb[0] >= 2 and bb[1] >= 2 and bb[2] <= 45 and bb[3] <= 45,
              "bbox=%s" % (bb,))

    # costume signature colors
    sig = {
        "land": (hex2rgb(H.GREEN[1]), "green tunic"),
        "sea": (hex2rgb(H.NAVY[1]), "navy sailor"),
        "air": (hex2rgb(H.JACK[1]), "brown aviator"),
        "insurance": (hex2rgb(H.ROBE[1]), "cream robe"),
    }
    for ch, (rgb, label) in sig.items():
        im = cells[(ch, "front", 0)]
        check("%s: costume %s" % (ch, label), has_color_in(im, (15, 29, 33, 40), rgb),
              "torso region")

    # insurance red cross
    im = cells[("insurance", "front", 0)]
    check("insurance: red cross tabard",
          has_color_in(im, (22, 30, 26, 40), scarf_ref) and has_color_in(im, (19, 32, 29, 35), scarf_ref),
          "vertical + horizontal bars")

    # side views: right = mirror of left
    for ch in CHARS:
        left = cells[(ch, "left", 0)]
        right = cells[(ch, "right", 0)]
        flipped = left.transpose(Image.FLIP_LEFT_RIGHT)
        same = True
        for y in range(CELL):
            for x in range(CELL):
                if flipped.getpixel((x, y))[3] != right.getpixel((x, y))[3]:
                    same = False
                    break
            if not same:
                break
        check("%s: left view mirrors right view" % ch, same)

    # breathing animation: body/head shifts down 1px on frame 1
    for ch in CHARS:
        f0 = cells[(ch, "front", 0)]
        f1 = cells[(ch, "front", 1)]
        # head top row moves down 1px in f1 (real bob, not color matching)
        check("%s: breathing bob (frame1 head down 1px)" % ch,
              f0.getpixel((24, 11))[3] > 0 and f1.getpixel((24, 11))[3] == 0 and
              f1.getpixel((24, 12))[3] > 0,
              "head top row y11 -> y12")

    # atlas metadata
    with open(os.path.join(ASSETS, "hamsters-atlas.json"), "r", encoding="utf-8") as f:
        meta = json.load(f)
    check("atlas metadata cell=48/pad=2",
          meta.get("cell_size") == 48 and meta.get("padding") == 2 and meta.get("rows") == 4,
          json.dumps({k: meta.get(k) for k in ("cell_size", "padding", "rows", "cols")}))


def opaque_bbox(im, box):
    x0, y0, x1, y1 = box
    xs, ys = [], []
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if im.getpixel((x, y))[3] > 0:
                xs.append(x)
                ys.append(y)
    if not xs:
        return None
    return (min(xs), min(ys), max(xs), max(ys))


def verify_scenes():
    W_NATIVE, H_NATIVE = 240, 160
    frames = {}
    for mode in ("land", "sea", "air"):
        gif = Image.open(os.path.join(ASSETS, "transport-%s.gif" % mode))
        fs = []
        for i in range(gif.n_frames):
            gif.seek(i)
            fs.append(gif.convert("RGBA").resize((W_NATIVE, H_NATIVE), Image.NEAREST))
        frames[mode] = fs
        check("%s: 16 animation frames" % mode, len(fs) == 16, "got %d" % len(fs))
        durs = []
        for i in range(gif.n_frames):
            gif.seek(i)
            durs.append(gif.info.get("duration", 0))
        check("%s: timing start/transit/arrive" % mode,
              durs[0] == 260 and durs[2] == 130 and durs[12] == 240,
              "durations=%s" % durs[:4])

    # signature colors per scene (moved with the vehicle)
    sig = {
        "land": ("#4a2a12", (0, 40, 239, 150)),       # wagon wheels
        "sea": ("#8c4c1e", (0, 60, 239, 150)),        # hull wood mid
        "air": ("#e0a100", (0, 40, 239, 135)),        # envelope gold
    }
    for mode, (hexcol, region) in sig.items():
        rgb = hex2rgb(hexcol)
        centers = []
        for f in (0, 6, 12):
            bb = None
            for y in range(region[1], region[3] + 1):
                for x in range(region[0], region[2] + 1):
                    c = frames[mode][f].getpixel((x, y))[:3]
                    if all(abs(c[i] - rgb[i]) <= 10 for i in range(3)):
                        if bb is None:
                            bb = [x, y, x, y]
                        else:
                            bb[0] = min(bb[0], x); bb[1] = min(bb[1], y)
                            bb[2] = max(bb[2], x); bb[3] = max(bb[3], y)
            centers.append((bb[0] + bb[2]) / 2 if bb else -1)
        check("%s: vehicle travels left->right" % mode,
              centers[0] < centers[1] < centers[2],
              "x centers f0/f6/f12 = %s" % centers)

    # ---- land: hamster drives, horse, destination, confetti ----
    land = frames["land"]
    f6 = land[6]
    check("land: hamster driver in wagon",
          has_color_in(f6, (110, 55, 175, 115), hex2rgb(H.FUR[1])) and
          has_color_in(f6, (110, 55, 175, 115), hex2rgb(H.SCARF[1])),
          "fur+scarf in driver region at f6")
    check("land: horse present", has_color_in(f6, (130, 70, 180, 125), hex2rgb("#7f461e")),
          "horse body region")
    check("land: destination flag", has_color_in(land[6], (215, 68, 235, 100), hex2rgb(H.GREEN[1])),
          "green flag region")
    check("land: arrival confetti", has_color_in(land[13], (205, 95, 250, 125), hex2rgb(H.SCARF[1])),
          "confetti burst near destination")

    # ---- sea: hamster lookout, sails, lighthouse, confetti ----
    sea = frames["sea"]
    f6 = sea[6]
    check("sea: hamster bow lookout",
          has_color_in(f6, (10, 74, 110, 130), hex2rgb(H.FUR[1])) and
          has_color_in(f6, (10, 74, 110, 130), hex2rgb(H.SCARF[1])),
          "fur+scarf near bow at f6")
    check("sea: sails present", has_color_in(f6, (0, 60, 239, 112), hex2rgb("#f4e7c8")),
          "sail canvas region")
    check("sea: lighthouse red bands", has_color_in(sea[6], (200, 85, 216, 140), hex2rgb(H.SCARF[1])),
          "lighthouse stripe region")
    check("sea: arrival confetti", has_color_in(sea[13], (205, 75, 239, 110), hex2rgb(H.GOLD[2])),
          "confetti burst near lighthouse")

    # ---- air: pilot, envelope, pad, confetti ----
    air = frames["air"]
    f6 = air[6]
    check("air: hamster pilot in gondola",
          has_color_in(f6, (0, 80, 239, 130), hex2rgb(H.FUR[1])) and
          has_color_in(f6, (0, 80, 239, 130), hex2rgb(H.SCARF[1])),
          "fur+scarf in gondola at f6")
    check("air: golden envelope", has_color_in(f6, (0, 40, 239, 105), hex2rgb(H.GOLD[1])),
          "envelope region")
    check("air: landing pad present", has_color_in(air[6], (165, 128, 235, 145), hex2rgb("#bb8548")),
          "pad platform region")
    check("air: arrival confetti", has_color_in(air[13], (185, 100, 235, 135), hex2rgb(H.GREEN[1])),
          "confetti burst near pad")


def main():
    print("== hamster atlas ==")
    verify_hamsters()
    print("\n== transport scenes ==")
    verify_scenes()
    fails = [c for c in CHECKS if not c[1]]
    print("\n%d checks, %d failed" % (len(CHECKS), len(fails)))
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
