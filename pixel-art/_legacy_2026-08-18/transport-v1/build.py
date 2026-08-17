#!/usr/bin/env python3
# BeanBeanMouse pixel transport animations (land / sea / air).
# Flash-style loop: start (left) -> transit (moves right) -> arrive (confetti).
import sys, os
sys.path.insert(0, r"C:\Users\LENOVO\.codex\skills\pixel-art-studio\scripts")
from pixelstudio import Sprite, ramp

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.abspath(os.path.join(ROOT, "..", "..", "assets", "pixel"))
os.makedirs(OUT, exist_ok=True)

# ---- palette (warm medieval, site-compatible) ----
DARK  = "#241b12"
SKY   = ramp("#ffd98a", 4, hue_shift=10)
GRASS = ramp("#8fbf4d", 3, hue_shift=8)
ROAD  = ramp("#b9834c", 4, hue_shift=8)
WOOD  = ramp("#9a5f2a", 4, hue_shift=10)
WOODL = ramp("#c9894a", 3, hue_shift=10)
CART  = ramp("#b04a2f", 3, hue_shift=10)
HORSE = ramp("#7e4e25", 4, hue_shift=8)
FUR   = ramp("#e0912f", 4, hue_shift=10)
SCARF = ramp("#d94a3a", 3, hue_shift=10)
GOLD  = ramp("#f2b705", 3, hue_shift=8)
GREEN = ramp("#4f9e4f", 3, hue_shift=8)
SAIL  = ramp("#f4e7c8", 3, hue_shift=6)
SEA   = ramp("#4aa3c2", 4, hue_shift=10)
CLOUD = ["#ffffff", "#dfe8f2"]
WHEEL = "#3a1707"

N = 12
W, H = 96, 32

def lerp(a, b, t):
    return int(round(a + (b - a) * t))

def convoy_x(f):
    if f <= 1: return -30
    if f >= 10: return 46
    return lerp(-30, 46, (f - 2) / 7.0)

def air_x(f):
    if f <= 1: return -14
    if f >= 10: return 44
    return lerp(-14, 44, (f - 2) / 7.0)

def draw_sky(s, sky):
    s.gradient_dither(0, 0, W-1, 15, sky, axis="v")
    s.circle(10, 4, 2, GOLD[2], fill=True)
    s.px(10, 2, GOLD[2]); s.px(8, 4, GOLD[2]); s.px(12, 4, GOLD[2]); s.px(10, 6, GOLD[2])

def draw_land_bg(s, f):
    draw_sky(s, SKY)
    s.polygon([(0, 13), (18, 10), (34, 13), (52, 11), (70, 13), (95, 12), (95, 16), (0, 16)], GRASS[1])
    s.rect(0, 16, 95, 17, GRASS[2])
    s.rect(0, 18, 95, 31, ROAD[2])
    s.rect(0, 18, 95, 18, ROAD[0]); s.rect(0, 31, 95, 31, ROAD[0])
    for i in range(0, 96, 8):
        dx = (i - (f * 2) % 8) % 96
        s.rect(dx, 24, dx + 2, 25, CLOUD[0])
    # destination flag
    s.rect(88, 6, 88, 21, WOOD[2])
    w = 1 if (f % 2) else 0
    s.rect(89, 6, 94, 8, GREEN[2])
    s.px(94, 7 + w, GREEN[2]); s.px(93, 8 + w, GREEN[2])
    s.rect(86, 21, 91, 22, WOOD[1])

def draw_wheel(s, cx, cy, f):
    s.circle(cx, cy, 3, WHEEL, fill=True)
    s.px(cx, cy, WOODL[2])
    r = f % 2
    s.line(cx - 2, cy - 1 if r else cy, cx + 2, cy + 1 if r else cy, WOODL[1])
    s.line(cx, cy - 3, cx, cy + 3, WOODL[1])
    s.line(cx - 2, cy, cx + 2, cy, WOODL[1])

def draw_cart(s, x, f, bob):
    yb = 8 + bob
    # cart body
    s.rect(x, 17 + bob, x + 31, 21 + bob, CART[1])
    s.rect(x, 21 + bob, x + 31, 21 + bob, CART[0])
    s.rect(x, 16 + bob, x + 31, 16 + bob, CART[2])
    s.rect(x + 9, 17 + bob, x + 10, 21 + bob, CART[0])
    s.rect(x + 23, 17 + bob, x + 24, 21 + bob, CART[0])
    # crate
    s.rect(x + 6, yb, x + 25, 13 + bob, GOLD[1])
    s.rect(x + 6, yb, x + 25, 8 + bob, GOLD[2])
    s.rect(x + 12, yb, x + 12, 13 + bob, DARK)
    s.rect(x + 20, yb, x + 20, 13 + bob, DARK)
    # cart flag
    s.rect(x + 2, 6 + bob, x + 2, 13 + bob, WOOD[2])
    s.px(x + 3, 6 + bob, SCARF[2]); s.px(x + 4, 7 + bob, SCARF[2]); s.px(x + 5, 6 + bob, SCARF[2])
    # hamster driver
    s.circle(x + 17, 10 + bob, 3, FUR[2], fill=True)
    s.px(x + 15, 7 + bob, FUR[2]); s.px(x + 19, 7 + bob, FUR[2])
    s.px(x + 15, 8 + bob, FUR[1]); s.px(x + 19, 8 + bob, FUR[1])
    s.px(x + 16, 10 + bob, DARK); s.px(x + 18, 10 + bob, DARK)
    s.px(x + 17, 11 + bob, DARK)
    s.rect(x + 14, 12 + bob, x + 20, 14 + bob, SCARF[1])
    s.rect(x + 14, 13 + bob, x + 18, 15 + bob, FUR[1])
    # wheels
    draw_wheel(s, x + 7, 25, f)
    draw_wheel(s, x + 24, 25, f)
    # contact shadow
    s.rect(x + 2, 29, x + 29, 29, DARK)
    # dust
    if 2 <= f <= 9:
        s.px(x + 1, 27, ROAD[0]); s.px(x + 3, 28, ROAD[0])
        s.px(x + 22, 28, ROAD[0])

def draw_horse(s, x, f, bob):
    hx = x + 31
    body_y = 17 + bob
    # tail
    s.px(hx - 10, 19 + bob, HORSE[0]); s.px(hx - 10, 21 + bob, HORSE[0])
    # body
    s.rect(hx - 9, body_y, hx + 8, 23 + bob, HORSE[2])
    s.rect(hx - 9, 23 + bob, hx + 8, 23 + bob, HORSE[0])
    s.rect(hx - 9, body_y, hx + 8, body_y, HORSE[0])
    # head + neck
    s.rect(hx + 4, 14 + bob, hx + 10, 18 + bob, HORSE[3])
    s.px(hx + 10, 15 + bob, HORSE[3]); s.px(hx + 11, 16 + bob, HORSE[3])
    s.px(hx + 6, 13 + bob, HORSE[3]); s.px(hx + 8, 13 + bob, HORSE[3])
    s.px(hx + 12, 17 + bob, DARK)
    # legs (gallop cycle 4)
    poses = [(0, 1), (1, 2), (2, 1), (1, 0)]
    for i, lx in enumerate([hx - 7, hx - 3, hx + 1, hx + 5]):
        lift = poses[(f + i) % 4][0]
        s.rect(lx, 23 + bob, lx, 27 + bob - lift, HORSE[1])
        s.px(lx, 27 + bob - lift, HORSE[0])
    # reins
    s.line(x + 30, 14 + bob, hx + 5, 16 + bob, DARK)
    s.rect(hx - 9, 29, hx + 11, 29, DARK)

def land_anim():
    s = Sprite(W, H, palette=[DARK, WHEEL] + SKY + GRASS + ROAD + WOOD + WOODL + CART + HORSE + FUR + SCARF + GOLD + GREEN + CLOUD)
    for f in range(N):
        if f: s.add_frame(copy=True)
        s.use(frame=f + 1)
        s.clear()
        draw_land_bg(s, f)
        x = convoy_x(f)
        bob = f % 2
        draw_cart(s, x, f, bob)
        draw_horse(s, x, f, bob)
        if f >= 10:
            for (cx, cy, c) in [(78, 6, GOLD[2]), (84, 4, SCARF[2]), (90, 7, GREEN[2]), (82, 9, GOLD[2])]:
                s.px(cx, cy, c)
    s.set_duration(110, "all")
    s.save_gif(os.path.join(OUT, "transport-land.gif"), scale=4, bg="#fff3d6")
    s.save_png(os.path.join(OUT, "transport-land-master.png"), frame=1, scale=1)
    s.save_png(os.path.join(ROOT, "preview-land.png"), frame=1, scale=8)
    s.stats()

def draw_sea_bg(s, f):
    sky = ["#b9d9ef", "#f8e3bd"]
    s.gradient_dither(0, 0, 95, 9, sky, axis="v")
    s.circle(10, 3, 2, GOLD[2], fill=True)
    s.px(10, 1, GOLD[2]); s.px(8, 3, GOLD[2]); s.px(12, 3, GOLD[2]); s.px(10, 5, GOLD[2])
    s.rect(0, 10, 95, 14, SEA[1])
    s.rect(0, 15, 95, 31, SEA[3])
    for i in range(0, 96, 8):
        w = (i + (f % 4)) % 96
        s.px(w, 15, CLOUD[0]); s.px(w + 2, 15, CLOUD[0])
    for i in range(0, 96, 12):
        w = (i + (f * 2) % 8) % 96
        s.px(w, 18, SEA[2])
    # lighthouse
    for i in range(4):
        s.rect(88, 8 + i * 2, 89, 9 + i * 2, CLOUD[0] if i % 2 == 0 else SCARF[2])
    s.px(87, 6, GOLD[2]); s.px(90, 6, GOLD[2]); s.px(88, 5, GOLD[2])
    s.rect(87, 17, 90, 19, WOOD[1])
    s.px(91, 7, GREEN[2]); s.px(92, 8, GREEN[2])

def draw_ship(s, x, f, bob):
    # wake
    s.px(x - 3, 23, CLOUD[0]); s.px(x - 5, 25, CLOUD[0])
    # hull
    s.rect(x, 20 + bob, x + 27, 24 + bob, WOOD[1])
    s.polygon([(x, 24 + bob), (x + 4, 27 + bob), (x + 23, 27 + bob), (x + 27, 24 + bob)], WOOD[0])
    s.rect(x, 19 + bob, x + 27, 19 + bob, WOOD[2])
    s.rect(x, 20 + bob, x + 27, 20 + bob, WOODL[2])
    # masts & sails
    for mi, mx in enumerate([x + 6, x + 13, x + 20]):
        s.rect(mx, 7 + bob, mx, 19 + bob, WOOD[2])
        bl = 4 if (f % 2) else 3
        s.rect(mx - 2, 10 + bob, mx + bl, 10 + bob, SAIL[0])
        s.rect(mx - 2, 10 + bob, mx + bl, 12 + bob, SAIL[1])
        s.rect(mx - 1, 14 + bob, mx + bl - 1, 14 + bob, SAIL[0])
        s.rect(mx - 1, 14 + bob, mx + bl - 1, 16 + bob, SAIL[1])
        s.px(mx + bl, 11 + bob, SAIL[0]); s.px(mx + bl - 1, 15 + bob, SAIL[0])
    # center flag
    s.px(x + 13, 6 + bob, SCARF[2]); s.px(x + 14, 5 + bob, SCARF[2]); s.px(x + 15, 6 + bob, SCARF[2])
    # hamster at bow
    s.circle(x + 24, 18 + bob, 2, FUR[2], fill=True)
    s.px(x + 23, 16 + bob, FUR[2]); s.px(x + 25, 16 + bob, FUR[2])
    s.px(x + 23, 17 + bob, FUR[1]); s.px(x + 25, 17 + bob, FUR[1])
    s.px(x + 23, 18 + bob, DARK); s.px(x + 25, 18 + bob, DARK)
    s.px(x + 24, 19 + bob, DARK)
    s.px(x + 26, 17 + bob, FUR[1])
    if f % 2 == 0:
        s.px(x + 26, 16 + bob, FUR[1])
    s.rect(x + 22, 20 + bob, x + 26, 20 + bob, SCARF[1])

def sea_anim():
    s = Sprite(W, H, palette=[DARK] + SKY + WOOD + WOODL + FUR + SCARF + GOLD + GREEN + SEA + SAIL + CLOUD)
    for f in range(N):
        if f: s.add_frame(copy=True)
        s.use(frame=f + 1)
        s.clear()
        draw_sea_bg(s, f)
        x = convoy_x(f)
        draw_ship(s, x, f, f % 2)
        # seagulls
        s.px(16 + (f * 2) % 20, 5, DARK); s.px(18 + (f * 2) % 20, 4, DARK)
        s.px(68 - (f * 3) % 18, 7, DARK); s.px(70 - (f * 3) % 18, 6, DARK)
        if f >= 10:
            for (cx, cy, c) in [(78, 5, GOLD[2]), (84, 3, SCARF[2]), (90, 6, GREEN[2])]:
                s.px(cx, cy, c)
    s.set_duration(110, "all")
    s.save_gif(os.path.join(OUT, "transport-sea.gif"), scale=4, bg="#cfe8f7")
    s.save_png(os.path.join(OUT, "transport-sea-master.png"), frame=1, scale=1)
    s.save_png(os.path.join(ROOT, "preview-sea.png"), frame=1, scale=8)
    s.stats()

def draw_air_bg(s, f):
    sky = ["#cde9ff", "#fff3d6"]
    s.gradient_dither(0, 0, 95, 31, sky, axis="v")
    s.circle(12, 3, 2, GOLD[2], fill=True)
    s.px(12, 1, GOLD[2]); s.px(10, 3, GOLD[2]); s.px(14, 3, GOLD[2]); s.px(12, 5, GOLD[2])
    for i in range(0, 96, 16):
        cx = (i - f * 2) % 96
        s.rect(cx, 6, cx + 4, 6, CLOUD[0]); s.rect(cx + 1, 5, cx + 3, 5, CLOUD[0])
        cx2 = (i + 48 - f * 3) % 96
        s.rect(cx2, 13, cx2 + 5, 13, CLOUD[1]); s.rect(cx2 + 1, 12, cx2 + 4, 12, CLOUD[1])
    # landing pad
    s.rect(86, 28, 95, 30, WOOD[2]); s.rect(86, 31, 95, 31, WOOD[0])
    s.rect(90, 24, 90, 27, WOOD[2])
    s.px(91, 24, GREEN[2]); s.px(92, 25, GREEN[2]); s.px(93, 24, GREEN[2])

def airship(s, x, f, bob):
    # cargo crate (behind envelope)
    sx = 1 if f % 2 else -1
    s.rect(x + 12 + sx, 25, x + 19 + sx, 29, GOLD[1])
    s.rect(x + 12 + sx, 25, x + 19 + sx, 26, GOLD[2])
    s.line(x + 14, 24, x + 12 + sx, 25, DARK)
    s.line(x + 17, 24, x + 20 + sx, 25, DARK)
    # envelope
    s.ellipse(x, 6 + bob, x + 29, 18 + bob, GOLD[1])
    s.rect(x + 9, 6 + bob, x + 10, 18 + bob, GOLD[0])
    s.rect(x + 19, 6 + bob, x + 20, 18 + bob, GOLD[0])
    s.rect(x + 2, 6 + bob, x + 27, 7 + bob, GOLD[2])
    s.rect(x + 2, 6 + bob, x + 27, 6 + bob, DARK)
    s.rect(x + 2, 18 + bob, x + 27, 18 + bob, DARK)
    # fin + propeller
    s.polygon([(x - 2, 9 + bob), (x - 6, 7 + bob), (x - 2, 12 + bob)], GOLD[0])
    s.px(x - 7, 12 + bob, DARK)
    if f % 2:
        s.line(x - 7, 10 + bob, x - 7, 14 + bob, WOOD[2])
    else:
        s.line(x - 9, 12 + bob, x - 5, 12 + bob, WOOD[2])
    # gondola + hamster
    s.rect(x + 9, 19 + bob, x + 21, 23 + bob, WOOD[1])
    s.rect(x + 9, 23 + bob, x + 21, 23 + bob, WOOD[0])
    s.circle(x + 15, 20 + bob, 2, FUR[2], fill=True)
    s.px(x + 14, 18 + bob, FUR[2]); s.px(x + 16, 18 + bob, FUR[2])
    s.px(x + 14, 19 + bob, FUR[1]); s.px(x + 16, 19 + bob, FUR[1])
    s.px(x + 14, 20 + bob, DARK); s.px(x + 16, 20 + bob, DARK)
    s.px(x + 15, 21 + bob, DARK)
    s.rect(x + 13, 22 + bob, x + 17, 22 + bob, SCARF[1])

def air_anim():
    s = Sprite(W, H, palette=[DARK] + SKY + WOOD + WOODL + FUR + SCARF + GOLD + GREEN + CLOUD)
    for f in range(N):
        if f: s.add_frame(copy=True)
        s.use(frame=f + 1)
        s.clear()
        draw_air_bg(s, f)
        airship(s, air_x(f), f, f % 2)
        if f >= 10:
            for (cx, cy, c) in [(78, 5, GOLD[2]), (84, 3, SCARF[2]), (90, 6, GREEN[2])]:
                s.px(cx, cy, c)
    s.set_duration(110, "all")
    s.save_gif(os.path.join(OUT, "transport-air.gif"), scale=4, bg="#cde9ff")
    s.save_png(os.path.join(OUT, "transport-air-master.png"), frame=1, scale=1)
    s.save_png(os.path.join(ROOT, "preview-air.png"), frame=1, scale=8)
    s.stats()

if __name__ == "__main__":
    land_anim()
    sea_anim()
    air_anim()
    print("exported to", OUT)
