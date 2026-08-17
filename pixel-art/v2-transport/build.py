#!/usr/bin/env python3
"""BeanBeanMouse transport animations v2 — 240x160 native, 16 frames, scale 5.

Three Flash-style loops, each telling the story 出发 -> 运输中 -> 到达:
  land  - horse-drawn covered wagon on a country road
  sea   - three-masted sailing ship crossing animated waves
  air   - golden airship cruising past clouds to a landing pad

The golden hamster appears in every scene (driver / bow lookout / pilot).
Light source: top-left. All particles are frame-indexed (deterministic).
"""
import math
import os
import sys

sys.path.insert(0, r"C:\Users\LENOVO\.codex\skills\pixel-art-studio\scripts")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from pixelstudio import Sprite, ramp
from bbm_hamster import *

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.abspath(os.path.join(ROOT, "..", "..", "assets", "pixel"))
os.makedirs(OUT, exist_ok=True)

W, H = 240, 160
N = 16

# ---- scene palette --------------------------------------------------------
DARK  = "#3a2410"
SKY_L = ["#fff7dd", "#ffe9b0", "#ffd98a"]     # warm land sky (light -> gold)
SKY_S = ["#e6f4fb", "#cfe9f7", "#f8e3bd"]     # sea sky (pale blue -> cream)
SKY_A = ["#d8efff", "#cde9ff", "#f4fbff"]     # air sky (pale blue -> near white)
SUN   = ramp("#f7c53c", 3, hue_shift=6)
GRASS = ramp("#8fbf4d", 4, hue_shift=8)
ROAD  = ramp("#c99a63", 4, hue_shift=8)
WOOD  = ramp("#9a5f2a", 4, hue_shift=10)
WOODL = ramp("#c9894a", 3, hue_shift=10)
CART  = ramp("#b04a2f", 3, hue_shift=10)
HORSE = ramp("#7e4e25", 4, hue_shift=8)
CANOPY = ramp("#f4e7c8", 3, hue_shift=6)
SEA_C = ramp("#2f7ea8", 4, hue_shift=10)
WAVE  = ramp("#6fc3e0", 3, hue_shift=8)
SAIL  = ramp("#f4e7c8", 3, hue_shift=6)
STONE = ramp("#c9c4b4", 3, hue_shift=6)
CLOUD = ["#ffffff", "#e8eff5"]
WHEEL = "#4a2a12"

PAL = ([DARK, WHEEL, TAN, BOOT, WHITE, LENS, CHEEK, CHEEK_L, BELLY, MUZZ, EARIN, NOSE]
       + FUR + SCARF + GOLD + LEATH + GREEN + NAVY + CREAM + JACK + ROBE
       + SKY_L + SKY_S + SKY_A + SUN + GRASS + ROAD + WOOD + WOODL + CART
       + HORSE + CANOPY + SEA_C + WAVE + SAIL + STONE + CLOUD)


def lerp(a, b, t):
    return int(round(a + (b - a) * t))


def convoy_x(f):
    if f <= 1:
        return -12
    if f >= 12:
        return 110
    return lerp(-12, 110, (f - 2) / 9.0)


def ship_x(f):
    if f <= 1:
        return -55
    if f >= 12:
        return 108
    return lerp(-55, 108, (f - 2) / 9.0)


def airship_x(f):
    if f <= 1:
        return -70
    if f >= 12:
        return 108
    return lerp(-70, 108, (f - 2) / 9.0)


def bob(f):
    return f % 2


def draw_sun(s, cx, cy, r):
    s.circle(cx, cy, r, SUN[2], fill=True)
    s.circle(cx - 1, cy - 1, r - 2, SUN[1], fill=True, only="opaque")
    for dx, dy in [(0, -r - 2), (0, r + 2), (-r - 2, 0), (r + 2, 0),
                   (-r - 1, -r - 1), (r + 1, -r - 1), (-r - 1, r + 1), (r + 1, r + 1)]:
        s.px(cx + dx, cy + dy, SUN[2])


def draw_cloud(s, cx, cy, scale, shade=CLOUD[0]):
    s.ellipse(cx, cy, cx + 10 * scale, cy + 4 * scale, shade)
    s.circle(cx + 2 * scale, cy - 2 * scale, 2 * scale, shade, fill=True)
    s.circle(cx + 6 * scale, cy - 2 * scale, 2 * scale, shade, fill=True)
    s.rect(cx, cy + 3 * scale, cx + 10 * scale, cy + 4 * scale, shade)


def draw_sky_bands(s, y0, y1, colors):
    """Clean vertical gradient: solid bands + 2-row dither transitions."""
    n = len(colors)
    band = max(1, (y1 - y0 + 1) // n)
    for i, c in enumerate(colors):
        yy0 = y0 + i * band
        yy1 = yy0 + band - 1 if i < n - 1 else y1
        s.rect(0, yy0, W - 1, yy1, c)
    for i in range(1, n):
        yy = y0 + i * band - 1
        if yy >= y0 and yy <= y1:
            s.dither(0, yy, W - 1, yy, colors[i - 1], colors[i], mix=0.5, pattern="bayer2")
        if yy + 1 <= y1:
            s.dither(0, yy + 1, W - 1, yy + 1, colors[i - 1], colors[i], mix=0.5, pattern="bayer2")


def confetti(s, x, y, f, palette):
    """Frame-indexed confetti burst (deterministic)."""
    pts = [
        (-10, -6), (12, -8), (-6, -14), (8, -12), (2, -18), (-14, -10),
        (16, -4), (-8, -20), (10, -2), (-4, -6), (14, -14), (-12, -16),
    ]
    for i, (dx, dy) in enumerate(pts):
        c = palette[i % len(palette)]
        phase = (f + i) % 4
        yy = dy - phase
        s.px(x + dx, y + yy, c)
        if i % 3 == 0:
            s.px(x + dx + 1, y + yy - 1, c)


def paste_hamster(s, path, x, y):
    im = os.path.join(ROOT, "cells", path)
    s.paste_png(im, x, y)


# ===========================================================================
# LAND — horse-drawn covered wagon
# ===========================================================================
def draw_land_bg(s, f):
    draw_sky_bands(s, 0, 79, SKY_L)
    draw_sun(s, 30, 24, 7)
    c1 = (14 - f * 1) % 300 - 30
    draw_cloud(s, c1, 16, 2, CLOUD[0])
    c2 = (180 - f * 2) % 300 - 30
    draw_cloud(s, c2, 34, 1, CLOUD[1])
    # far hills + grass
    s.polygon([(0, 78), (38, 66), (78, 76), (120, 64), (165, 75), (205, 66), (239, 76), (239, 86), (0, 86)],
              GRASS[1])
    s.rect(0, 84, 239, 96, GRASS[2])
    s.rect(0, 96, 239, 96, GRASS[0])
    # road
    s.rect(0, 97, 239, 140, ROAD[2])
    s.rect(0, 97, 239, 98, ROAD[3])
    s.rect(0, 139, 239, 140, ROAD[0])
    for i in range(0, 240, 22):
        dx = (i + f * 6) % 240
        s.rect(dx, 116, dx + 6, 118, ROAD[3])
    # front grass
    s.rect(0, 141, 239, 159, GRASS[3])
    for i in range(0, 240, 14):
        s.px(i, 143 + (i % 3), GRASS[1])
    # start depot
    s.rect(8, 98, 11, 140, WOOD[2])
    s.rect(6, 84, 40, 93, CANOPY[1])
    s.rect(6, 84, 40, 84, CANOPY[2])
    s.rect(6, 84, 6, 93, SCARF[1])
    s.rect(40, 84, 40, 93, SCARF[1])
    s.rect(8, 93, 40, 93, SCARF[0])
    s.polygon([(16, 88), (36, 88), (26, 81)], GREEN[2])
    s.rect(22, 76, 22, 81, WOOD[2])
    # destination
    s.rect(212, 98, 215, 140, WOOD[2])
    s.rect(202, 84, 232, 92, CANOPY[1])
    s.rect(202, 84, 232, 84, CANOPY[2])
    s.rect(202, 84, 202, 92, GREEN[1])
    s.rect(232, 84, 232, 92, GREEN[1])
    flag_y = 6 + (f % 2)
    s.rect(219, 70, 219, 98, WOOD[2])
    s.polygon([(219, 70), (232, 73 + flag_y), (219, 78)], GREEN[1])
    s.rect(202, 92, 232, 92, GREEN[0])
    # destination pad rings
    s.circle(226, 128, 8, ROAD[3], fill=False)
    s.circle(226, 128, 12, ROAD[3], fill=False)


def draw_wheel(s, cx, cy, r, f):
    s.circle(cx, cy, r, WHEEL, fill=True)
    s.circle(cx - 1, cy - 1, r - 2, WOODL[1], fill=True, only="opaque")
    s.circle(cx - 1, cy - 1, 1, WOODL[2], fill=True, only="opaque")
    a = (f % 4) * math.pi / 4
    for k in range(4):
        ang = a + k * math.pi / 2
        x2 = cx + int(round(math.cos(ang) * (r - 2)))
        y2 = cy + int(round(math.sin(ang) * (r - 2)))
        s.line(cx, cy, x2, y2, WOOD[2])


def draw_horse(s, hx, f, by):
    """Side-view horse with a 4-frame trot cycle."""
    poses = [(1, 0, 0, 1), (0, 1, 1, 0), (1, 0, 0, 1), (0, 1, 1, 0)]
    p = poses[f % 4]
    y = 96 + by
    # tail
    s.line(hx - 4, y - 8, hx - 10, y - 14 + (f % 3) - 1, HORSE[0])
    s.line(hx - 4, y - 6, hx - 9, y - 8, HORSE[0])
    # body
    s.ellipse(hx - 6, y - 16, hx + 20, y + 2, HORSE[0])
    s.ellipse(hx - 5, y - 17, hx + 19, y + 1, HORSE[1], only="opaque")
    s.ellipse(hx - 3, y - 17, hx + 14, y - 4, HORSE[2], only="opaque")
    s.ellipse(hx - 1, y - 15, hx + 9, y - 10, HORSE[3], only="opaque")
    # neck + head
    s.polygon([(hx + 14, y - 15), (hx + 23, y - 28), (hx + 27, y - 26), (hx + 19, y - 13)],
              HORSE[1], only="opaque")
    s.ellipse(hx + 20, y - 31, hx + 30, y - 21, HORSE[2], only="opaque")
    s.ellipse(hx + 23, y - 30, hx + 31, y - 25, HORSE[3], only="opaque")
    # ear
    s.px(hx + 23, y - 33, HORSE[2])
    s.px(hx + 25, y - 33, HORSE[2])
    # eye + muzzle
    s.px(hx + 26, y - 27, DARK)
    s.px(hx + 30, y - 25, DARK)
    s.px(hx + 31, y - 24, DARK)
    # harness
    s.line(hx + 20, y - 26, hx - 2, y - 12, LEATH[1])
    # legs (trot)
    legs = [hx - 4, hx + 2, hx + 8, hx + 14]
    for i, lx in enumerate(legs):
        lift = p[i]
        s.rect(lx, y - 2, lx + 2, y + 13 - 6 * lift, HORSE[1])
        s.rect(lx, y + 11 - 6 * lift, lx + 2, y + 13 - 6 * lift, HORSE[0])
        if not lift:
            s.rect(lx - 1, y + 13, lx + 3, y + 13, HORSE[0])
    s.rect(hx - 6, y + 15, hx + 27, y + 15, DARK)  # contact shadow


def draw_wagon(s, wx, f, by):
    """Covered wagon with cargo + hamster driver, side view."""
    y = 0 + by
    # rear wheel
    draw_wheel(s, wx + 40, 132, 10, f)
    # body
    s.rect(wx + 32, 100 + y, wx + 92, 122 + y, WOOD[1])
    s.rect(wx + 32, 100 + y, wx + 92, 100 + y, WOOD[2])
    s.rect(wx + 32, 122 + y, wx + 92, 122 + y, WOOD[0])
    s.rect(wx + 38, 104 + y, wx + 39, 120 + y, WOOD[0])
    s.rect(wx + 56, 104 + y, wx + 57, 120 + y, WOOD[0])
    s.rect(wx + 80, 104 + y, wx + 81, 120 + y, WOOD[0])
    # red panel + trim
    s.rect(wx + 34, 103 + y, wx + 90, 104 + y, CART[2])
    s.rect(wx + 86, 105 + y, wx + 91, 121 + y, CART[1])
    # canopy arch
    s.ellipse(wx + 34, 78 + y, wx + 90, 108 + y, CANOPY[1])
    s.ellipse(wx + 34, 78 + y, wx + 90, 106 + y, CANOPY[2], only="opaque")
    s.ellipse(wx + 40, 80 + y, wx + 84, 102 + y, CANOPY[0], only="opaque")
    s.rect(wx + 34, 100 + y, wx + 90, 104 + y, WOOD[1], only="opaque")
    # cargo crate peeking at back
    s.rect(wx + 38, 106 + y, wx + 52, 118 + y, GOLD[1], only="opaque")
    s.rect(wx + 38, 106 + y, wx + 52, 108 + y, GOLD[2], only="opaque")
    s.line(wx + 45, 106 + y, wx + 45, 118 + y, GOLD[0])
    # front wheel + axle
    draw_wheel(s, wx + 76, 132, 10, f)
    s.rect(wx + 36, 128 + y, wx + 86, 129 + y, WOOD[0])
    # driver seat
    s.rect(wx + 84, 108 + y, wx + 96, 111 + y, WOOD[2])
    s.rect(wx + 86, 111 + y, wx + 94, 112 + y, WOOD[0])
    # hamster driver (right view) — paste above seat
    paste_hamster(s, "land-right-0.png", wx + 76, 60 + y)
    # reins to horse
    s.line(wx + 96, 74 + y, wx + 118, 70 + y, LEATH[1])
    # dust
    if 2 <= f <= 11:
        d = f % 4
        s.circle(wx + 26, 134, 3, ROAD[1], fill=True)
        s.circle(wx + 18 - d, 136, 2, ROAD[2], fill=True)
        s.circle(wx + 30 + d, 138, 2, ROAD[3], fill=True)
        s.circle(wx + 8 - d, 132, 1, ROAD[2], fill=True)
    s.rect(wx + 30, 144, wx + 96, 144, DARK)


def land_anim():
    s = Sprite(W, H, palette=PAL)
    for f in range(N):
        if f:
            s.add_frame(copy=True)
        s.use(frame=f + 1)
        s.clear()
        draw_land_bg(s, f)
        x = convoy_x(f)
        by = bob(f)
        draw_wagon(s, x, f, by)
        draw_horse(s, x + 100, f, by)
        if f >= 12:
            confetti(s, 226, 120, f, [GOLD[2], SCARF[1], GREEN[1], NAVY[1], SUN[1]])
    s.set_duration(260, [1, 2])
    s.set_duration(130, list(range(3, 13)))
    s.set_duration(240, list(range(13, 17)))
    s.save_gif(os.path.join(OUT, "transport-land.gif"), scale=5, bg="#ffe9b8")
    s.save_png(os.path.join(OUT, "transport-land-master.png"), frame=1, scale=1, bg="#ffe9b8")
    s.save_png(os.path.join(ROOT, "preview-land.png"), frame=1, scale=3)
    s.save_png(os.path.join(ROOT, "preview-land-arrive.png"), frame=13, scale=3)
    s.stats()


# ===========================================================================
# SEA — three-masted sailing ship
# ===========================================================================
def draw_sea_bg(s, f):
    draw_sky_bands(s, 0, 95, SKY_S)
    draw_sun(s, 30, 22, 7)
    c1 = (20 - f * 1) % 320 - 40
    draw_cloud(s, c1, 14, 2, CLOUD[0])
    c2 = (200 - f * 2) % 320 - 40
    draw_cloud(s, c2, 30, 1, CLOUD[1])
    # sea
    s.rect(0, 96, 239, 159, SEA_C[3])
    s.rect(0, 96, 239, 98, SEA_C[1])
    for i in range(0, 240, 16):
        wx = (i - (f * 3) % 16) % 240
        s.rect(wx, 108, wx + 6, 108, WAVE[1])
        s.px(wx + 8, 109, WAVE[0])
    for i in range(8, 240, 20):
        wx = (i - (f * 5) % 20) % 240
        s.rect(wx, 124, wx + 7, 124, WAVE[2])
        s.px(wx + 9, 125, WAVE[1])
    for i in range(0, 240, 18):
        wx = (i - (f * 4) % 18) % 240
        s.rect(wx, 140, wx + 5, 140, WAVE[1])
    for i in range(4, 240, 24):
        wx = (i - (f * 7) % 24) % 240
        s.px(wx, 154, WAVE[0])
        s.px(wx + 3, 155, WAVE[0])
    # lighthouse
    s.rect(204, 84, 211, 140, STONE[1])
    s.rect(202, 84, 213, 88, STONE[2])
    s.rect(204, 84, 211, 84, STONE[2])
    for yy in range(90, 140, 12):
        s.rect(204, yy, 211, yy + 5, SCARF[1], only="opaque")
    s.rect(200, 76, 215, 84, STONE[0])
    s.rect(206, 78, 209, 82, SUN[1])
    s.px(204, 80, SUN[2]); s.px(211, 80, SUN[2]); s.px(208, 78, SUN[2])
    s.rect(198, 140, 218, 142, WOOD[2])
    # gulls
    g1 = (30 + f * 3) % 120
    s.px(g1, 42, DARK); s.px(g1 + 2, 41, DARK); s.px(g1 + 4, 42, DARK)
    g2 = (120 - f * 2) % 140 + 40
    s.px(g2, 58, DARK); s.px(g2 + 2, 57, DARK); s.px(g2 + 4, 58, DARK)


def draw_sail(s, mx, top, f, w):
    """One square sail with fabric shading and billow."""
    b = 1 if f % 2 else 0
    s.rect(mx - w // 2, top, mx + w // 2 + b, top + 12, SAIL[0])
    s.rect(mx - w // 2, top, mx + w // 2 + b, top + 12, SAIL[2], only="opaque")
    s.rect(mx - w // 2, top + 10, mx + w // 2 + b, top + 12, SAIL[0], only="opaque")
    s.line(mx, top, mx, top + 12, SAIL[1])
    s.line(mx - w // 4, top, mx - w // 4, top + 12, SAIL[1])
    s.line(mx + w // 4, top, mx + w // 4, top + 12, SAIL[1])


def draw_ship(s, sx, f, by):
    y = by
    # wake
    s.ellipse(sx - 14, 132, sx + 2, 138, WAVE[0], fill=False)
    s.px(sx - 22, 136, WAVE[1]); s.px(sx - 18, 139, WAVE[1])
    # hull
    s.polygon([(sx, 128 + y), (sx + 16, 146 + y), (sx + 92, 146 + y), (sx + 110, 128 + y)],
              WOOD[0])
    s.rect(sx, 128 + y, sx + 110, 130 + y, WOOD[2])
    s.rect(sx, 130 + y, sx + 110, 131 + y, WOODL[2])
    for i in range(6):
        s.line(sx + 8 + i * 18, 133 + y, sx + 14 + i * 18, 143 + y, WOOD[0])
    s.rect(sx + 96, 128 + y, sx + 110, 132 + y, CART[1], only="opaque")
    # stern + bowsprit
    s.polygon([(sx - 6, 124 + y), (sx + 2, 128 + y), (sx - 6, 132 + y)], WOOD[1], only="opaque")
    s.line(sx + 108, 130 + y, sx + 128, 122 + y, WOOD[1])
    # masts + sails
    for mi, mx in enumerate([sx + 22, sx + 56, sx + 88]):
        s.rect(mx, 66 + y, mx + 2, 128 + y, WOOD[2])
        draw_sail(s, mx, 72 + y, f, 20)
        draw_sail(s, mx, 92 + y, f, 26)
        # pennant
        p = (f + mi) % 2
        s.px(mx, 64 + y, SCARF[1]); s.px(mx + 1, 63 + y - p, SCARF[1]); s.px(mx + 2, 64 + y, SCARF[1])
    # ratlines hint
    s.line(sx + 22, 84 + y, sx + 88, 84 + y, WOOD[0])
    # hamster bow lookout
    paste_hamster(s, "sea-right-0.png", sx + 66, 76 + y)
    # telescope
    s.line(sx + 104, 92 + y, sx + 120, 86 + y, WOOD[2])
    s.circle(sx + 122, 85 + y, 2, GOLD[1], fill=True)
    s.circle(sx + 122, 85 + y, 1, LENS, fill=True)
    s.rect(sx + 0, 146, sx + 110, 146, SEA_C[1])


def sea_anim():
    s = Sprite(W, H, palette=PAL)
    for f in range(N):
        if f:
            s.add_frame(copy=True)
        s.use(frame=f + 1)
        s.clear()
        draw_sea_bg(s, f)
        draw_ship(s, ship_x(f), f, bob(f))
        if f >= 12:
            confetti(s, 226, 96, f, [GOLD[2], SCARF[1], GREEN[1], SUN[1], WAVE[1]])
    s.set_duration(260, [1, 2])
    s.set_duration(130, list(range(3, 13)))
    s.set_duration(240, list(range(13, 17)))
    s.save_gif(os.path.join(OUT, "transport-sea.gif"), scale=5, bg="#cfe9f7")
    s.save_png(os.path.join(OUT, "transport-sea-master.png"), frame=1, scale=1, bg="#cfe9f7")
    s.save_png(os.path.join(ROOT, "preview-sea.png"), frame=1, scale=3)
    s.save_png(os.path.join(ROOT, "preview-sea-arrive.png"), frame=13, scale=3)
    s.stats()


# ===========================================================================
# AIR — golden airship
# ===========================================================================
def draw_air_bg(s, f):
    draw_sky_bands(s, 0, 127, SKY_A)
    draw_sun(s, 30, 20, 7)
    for i in range(0, 260, 48):
        cx = (i - f * 2) % 300 - 30
        draw_cloud(s, cx, 30 + (i // 48) % 2 * 26, 2, CLOUD[0])
    for i in range(0, 260, 56):
        cx = (i + 24 - f * 3) % 300 - 30
        draw_cloud(s, cx, 58 + (i // 56) % 2 * 20, 1, CLOUD[1])
    # ground hills
    s.polygon([(0, 128), (46, 118), (92, 128), (140, 120), (188, 129), (239, 120), (239, 159), (0, 159)],
              GRASS[2])
    s.rect(0, 132, 239, 159, GRASS[3])
    for i in range(0, 240, 16):
        s.px(i, 134 + (i % 3), GRASS[1])
    # landing pad
    s.rect(168, 138, 232, 142, WOOD[2])
    s.rect(168, 142, 232, 143, WOOD[0])
    s.rect(176, 143, 178, 154, WOOD[0])
    s.rect(222, 143, 224, 154, WOOD[0])
    s.rect(200, 128, 202, 138, WOOD[2])
    flag_y = 6 + (f % 2)
    s.polygon([(201, 128), (212, 131 + flag_y), (201, 136)], SCARF[1])
    s.rect(168, 140, 232, 140, WOOD[1])
    # pad sign
    s.rect(176, 132, 194, 137, CANOPY[1])
    s.rect(176, 132, 194, 132, CANOPY[2])
    s.rect(176, 132, 176, 137, GREEN[1])
    s.rect(194, 132, 194, 137, GREEN[1])


def draw_propeller(s, px, py, f):
    if f % 2:
        s.line(px, py - 5, px, py + 5, WOOD[2])
        s.px(px - 1, py - 4, WOODL[2]); s.px(px + 1, py + 4, WOODL[2])
    else:
        s.line(px - 4, py, px + 4, py, WOOD[2])
        s.px(px - 4, py - 1, WOODL[2]); s.px(px + 4, py + 1, WOODL[2])


def draw_airship(s, ax, f, by):
    y = by
    # hanging cargo crate
    s.line(ax + 30, 76 + y, ax + 26, 112 + y, WOOD[1])
    s.line(ax + 30, 76 + y, ax + 34, 112 + y, WOOD[1])
    s.rect(ax + 18, 112 + y, ax + 42, 126 + y, GOLD[1])
    s.rect(ax + 18, 112 + y, ax + 42, 114 + y, GOLD[2])
    s.line(ax + 30, 112 + y, ax + 30, 126 + y, GOLD[0])
    # envelope
    s.ellipse(ax, 44 + y, ax + 96, 100 + y, GOLD[0])
    s.ellipse(ax + 1, 43 + y, ax + 95, 99 + y, GOLD[1], only="opaque")
    s.ellipse(ax + 4, 43 + y, ax + 72, 88 + y, GOLD[2], only="opaque")
    s.ellipse(ax + 8, 45 + y, ax + 52, 74 + y, SUN[1], only="opaque")
    # banding + panel lines
    s.rect(ax + 30, 44 + y, ax + 34, 100 + y, SCARF[1], only="opaque")
    s.rect(ax + 62, 44 + y, ax + 66, 100 + y, SCARF[1], only="opaque")
    s.rect(ax + 44, 44 + y, ax + 52, 100 + y, GOLD[0], only="opaque")
    s.line(ax + 12, 52 + y, ax + 86, 52 + y, GOLD[0], only="opaque")
    s.line(ax + 10, 68 + y, ax + 88, 68 + y, GOLD[0], only="opaque")
    s.line(ax + 10, 86 + y, ax + 88, 86 + y, GOLD[0], only="opaque")
    # fins
    s.polygon([(ax + 96, 56 + y), (ax + 108, 50 + y), (ax + 96, 70 + y)], SCARF[0], only="opaque")
    s.polygon([(ax + 96, 78 + y), (ax + 108, 88 + y), (ax + 96, 92 + y)], SCARF[0], only="opaque")
    # pennant
    p = f % 2
    s.px(ax + 48, 42 + y, SCARF[1]); s.px(ax + 49, 41 + y - p, SCARF[1]); s.px(ax + 50, 42 + y, SCARF[1])
    # gondola
    s.rect(ax + 28, 96 + y, ax + 66, 128 + y, WOOD[1])
    s.rect(ax + 28, 96 + y, ax + 66, 98 + y, WOOD[2])
    s.rect(ax + 28, 126 + y, ax + 66, 128 + y, WOOD[0])
    s.rect(ax + 28, 112 + y, ax + 66, 113 + y, WOOD[0])
    # window + hamster pilot (front view)
    s.rect(ax + 34, 100 + y, ax + 60, 110 + y, LENS)
    s.rect(ax + 34, 100 + y, ax + 60, 100 + y, WOOD[2])
    s.rect(ax + 34, 110 + y, ax + 60, 110 + y, WOOD[0])
    paste_hamster(s, "air-front-0.png", ax + 38, 88 + y)
    s.rect(ax + 34, 110 + y, ax + 60, 110 + y, WOOD[0], only="opaque")
    # propeller
    draw_propeller(s, ax + 26, 112 + y, f)


def air_anim():
    s = Sprite(W, H, palette=PAL)
    for f in range(N):
        if f:
            s.add_frame(copy=True)
        s.use(frame=f + 1)
        s.clear()
        draw_air_bg(s, f)
        draw_airship(s, airship_x(f), f, bob(f))
        if f >= 12:
            confetti(s, 210, 120, f, [GOLD[2], SCARF[1], GREEN[1], NAVY[1], LENS])
    s.set_duration(260, [1, 2])
    s.set_duration(130, list(range(3, 13)))
    s.set_duration(240, list(range(13, 17)))
    s.save_gif(os.path.join(OUT, "transport-air.gif"), scale=5, bg="#cde9ff")
    s.save_png(os.path.join(OUT, "transport-air-master.png"), frame=1, scale=1, bg="#cde9ff")
    s.save_png(os.path.join(ROOT, "preview-air.png"), frame=1, scale=3)
    s.save_png(os.path.join(ROOT, "preview-air-arrive.png"), frame=13, scale=3)
    s.stats()


def export_cells():
    """Pre-render the hamster cells used by scenes (48x48, transparent)."""
    cells = os.path.join(ROOT, "cells")
    os.makedirs(cells, exist_ok=True)
    jobs = [
        ("land-right-0.png", "right", "land", 0),
        ("sea-right-0.png", "right", "sea", 0),
        ("air-front-0.png", "front", "air", 0),
    ]
    for name, direction, char, frame in jobs:
        cell = Sprite(48, 48, palette=PAL)
        draw_hamster(cell, 24, 3, direction, char, frame)
        cell.save_png(os.path.join(cells, name), frame=1, scale=1)


if __name__ == "__main__":
    export_cells()
    land_anim()
    sea_anim()
    air_anim()
    print("exported to", OUT)
