#!/usr/bin/env python3
"""BeanBeanMouse golden hamster (金丝熊) pixel-art toolkit.

Deterministic, coordinate-driven drawing shared by the character atlas and the
transport scene animations. Light source: top-left. Every feature is placed at
explicit pixel coordinates so the sprite is legible at 1x and reads clearly at
4-5x display scale.
"""

# ---- palette: golden hamster fur + costumes -------------------------------
FUR   = ["#a86a1a", "#c88925", "#e0a03a", "#f2bd5f"]   # D M L H
CHEEK = "#f8cf96"
CHEEK_L = "#fbdcaa"
BELLY = "#fdf3da"
MUZZ  = "#fff7e6"
EARIN = "#f4b9a8"
NOSE  = "#e8878a"
DARK  = "#3a2410"
WHITE = "#ffffff"
LENS  = "#9fd4e8"

SCARF = ["#a62a22", "#d94a3a", "#f06a52"]
GOLD  = ["#b8860b", "#e0a100", "#f7c53c"]
LEATH = ["#6d4a24", "#8a5a2b", "#a9763d"]
GREEN = ["#3f7a2e", "#589a40", "#74ba52"]
NAVY  = ["#1f3462", "#2f4a8c", "#4a6bb5"]
CREAM = ["#d9cba6", "#efe2c4", "#faf1dc"]
JACK  = ["#6b4a28", "#8a5f35", "#a97948"]
ROBE  = ["#d7c8a2", "#efe0bd", "#faf1d8"]
TAN   = "#c99a63"
BOOT  = "#5a3a1c"


def _inside(x, y, w, h):
    return 0 <= x < w and 0 <= y < h


def px(s, x, y, c, w=48, h=48):
    if _inside(x, y, w, h):
        s.px(x, y, c)


def draw_ears(s, cx=24, top=2, front=True, right=False, w=48, h=48):
    """Two big round ears (front/back) or one ear (side)."""
    if not right:
        # left ear
        s.circle(cx - 12, top + 6, 5, FUR[0], fill=True)
        s.circle(cx - 12, top + 5, 4, FUR[1], fill=True, only="opaque")
        if front:
            s.circle(cx - 12, top + 5, 2, EARIN, fill=True, only="opaque")
        # right ear
        s.circle(cx + 12, top + 6, 5, FUR[0], fill=True)
        s.circle(cx + 12, top + 5, 4, FUR[1], fill=True, only="opaque")
        if front:
            s.circle(cx + 12, top + 5, 2, EARIN, fill=True, only="opaque")
    else:
        s.circle(cx - 12, top + 6, 5, FUR[0], fill=True)
        s.circle(cx - 12, top + 5, 4, FUR[1], fill=True, only="opaque")
        s.circle(cx - 12, top + 5, 2, EARIN, fill=True, only="opaque")


def draw_head(s, cx=24, top=2, front=True, right=False, w=48, h=48):
    """Round golden head with layered top-left light, cheeks, muzzle, face."""
    if front:
        head = (cx - 16, top + 8, cx + 16, top + 27)
    elif right:
        head = (cx - 14, top + 8, cx + 10, top + 27)
    else:  # back
        head = (cx - 16, top + 8, cx + 16, top + 27)
    s.ellipse(*head, FUR[0])
    s.ellipse(head[0] - 1, head[1] - 1, head[2] - 1, head[3] - 1, FUR[1], only="opaque")
    if front or right:
        s.ellipse(head[0] - 2, head[1] - 2, head[2] - 6, head[3] - 4, FUR[2], only="opaque")
        s.circle(cx - 8, top + 11, 3, FUR[3], fill=True, only="opaque")

    if front:
        # puffy cheek pouches — bulge outside the head silhouette
        s.circle(cx - 12, top + 19, 5, CHEEK, fill=True)
        s.circle(cx - 12, top + 18, 4, CHEEK_L, fill=True)
        s.circle(cx + 12, top + 19, 5, CHEEK, fill=True)
        s.circle(cx + 12, top + 18, 4, CHEEK_L, fill=True)
        # muzzle
        s.ellipse(cx - 5, top + 17, cx + 5, top + 25, BELLY, only="opaque")
        s.ellipse(cx - 4, top + 16, cx + 4, top + 24, MUZZ, only="opaque")
        # nose + mouth
        s.rect(cx - 2, top + 17, cx + 2, top + 18, NOSE, only="opaque")
        px(s, cx - 1, top + 17, "#f7b9b0", w, h)
        px(s, cx, top + 20, DARK, w, h)
        px(s, cx - 1, top + 21, DARK, w, h)
        px(s, cx + 1, top + 21, DARK, w, h)
        # eyes + glints
        s.rect(cx - 8, top + 13, cx - 7, top + 14, DARK, only="opaque")
        s.rect(cx + 7, top + 13, cx + 8, top + 14, DARK, only="opaque")
        px(s, cx - 8, top + 13, WHITE, w, h)
        px(s, cx + 7, top + 13, WHITE, w, h)
        # whisker roots
        px(s, cx - 13, top + 17, DARK, w, h)
        px(s, cx - 15, top + 19, DARK, w, h)
        px(s, cx + 13, top + 17, DARK, w, h)
        px(s, cx + 15, top + 19, DARK, w, h)
    elif right:
        # muzzle profile at right
        s.ellipse(cx + 6, top + 17, cx + 17, top + 25, BELLY, only="opaque")
        s.rect(cx + 12, top + 17, cx + 14, top + 18, NOSE, only="opaque")
        px(s, cx + 13, top + 21, DARK, w, h)
        # eye
        s.rect(cx + 3, top + 13, cx + 4, top + 14, DARK, only="opaque")
        px(s, cx + 3, top + 13, WHITE, w, h)
        # cheek
        s.circle(cx + 7, top + 19, 3, CHEEK, fill=True, only="opaque")
        # whisker roots
        px(s, cx + 15, top + 19, DARK, w, h)
        px(s, cx + 15, top + 21, DARK, w, h)


def draw_body(s, cx=24, top=2, front=True, w=48, h=48):
    """Pear-shaped fur body with cream belly."""
    body = (cx - 11, top + 25, cx + 11, top + 40)
    s.ellipse(*body, FUR[0])
    s.ellipse(body[0] - 1, body[1] - 1, body[2] - 1, body[3] - 1, FUR[1], only="opaque")
    s.ellipse(body[0], body[1] - 1, body[2] - 5, body[3] - 3, FUR[2], only="opaque")
    s.ellipse(cx - 6, top + 30, cx + 6, top + 40, BELLY, only="opaque")
    # feet
    if front:
        s.ellipse(cx - 9, top + 39, cx - 5, top + 41, BELLY, only="opaque")
        s.ellipse(cx + 5, top + 39, cx + 9, top + 41, BELLY, only="opaque")
    else:
        s.ellipse(cx - 9, top + 39, cx - 5, top + 41, BELLY, only="opaque")
        s.ellipse(cx + 5, top + 39, cx + 9, top + 41, BELLY, only="opaque")


def draw_scarf(s, cx=24, top=2, right=False, w=48, h=48):
    """Red scarf band + hanging tail (default left-front)."""
    s.rect(cx - 10, top + 23, cx + 10, top + 25, SCARF[1], only="opaque")
    s.rect(cx - 10, top + 23, cx + 10, top + 23, SCARF[2], only="opaque")
    if right:
        s.rect(cx + 7, top + 25, cx + 9, top + 31, SCARF[0], only="opaque")
        px(s, cx + 7, top + 32, GOLD[2], w, h)
        px(s, cx + 9, top + 32, GOLD[2], w, h)
    else:
        s.rect(cx - 11, top + 25, cx - 9, top + 31, SCARF[0], only="opaque")
        px(s, cx - 11, top + 32, GOLD[2], w, h)
        px(s, cx - 9, top + 32, GOLD[2], w, h)
    # knot
    px(s, cx - 1, top + 25, SCARF[0], w, h)
    px(s, cx + 1, top + 25, SCARF[0], w, h)


def draw_arms(s, cx=24, top=2, front=True, w=48, h=48):
    if front:
        s.circle(cx - 11, top + 29, 2, FUR[2], fill=True, only="opaque")
        px(s, cx - 12, top + 30, FUR[0], w, h)
        s.circle(cx + 11, top + 29, 2, FUR[2], fill=True, only="opaque")
        px(s, cx + 12, top + 30, FUR[0], w, h)
    else:
        s.circle(cx - 8, top + 29, 2, FUR[2], fill=True, only="opaque")
        px(s, cx - 9, top + 30, FUR[0], w, h)


def costume_land(s, cx=24, top=2, front=True, w=48, h=48):
    """Road merchant: leather cap, green tunic, belt+pouch, boots."""
    s.rect(cx - 11, top + 2, cx + 11, top + 5, LEATH[1], only="opaque")
    s.rect(cx - 11, top + 2, cx + 11, top + 2, LEATH[2], only="opaque")
    s.rect(cx - 13, top + 4, cx + 13, top + 5, LEATH[0], only="opaque")
    s.rect(cx - 10, top + 27, cx + 10, top + 37, GREEN[1], only="opaque")
    s.rect(cx - 10, top + 27, cx + 10, top + 28, GREEN[2], only="opaque")
    s.rect(cx - 10, top + 37, cx + 10, top + 37, GREEN[0], only="opaque")
    s.rect(cx - 10, top + 27, cx - 10, top + 37, GREEN[0], only="opaque")
    s.rect(cx + 10, top + 27, cx + 10, top + 37, GREEN[0], only="opaque")
    # belt + buckle
    s.rect(cx - 10, top + 34, cx + 10, top + 34, LEATH[1], only="opaque")
    s.rect(cx - 1, top + 33, cx + 1, top + 35, GOLD[2], only="opaque")
    # pouch
    s.rect(cx - 13, top + 33, cx - 10, top + 37, LEATH[1], only="opaque")
    s.rect(cx - 13, top + 33, cx - 10, top + 33, LEATH[2], only="opaque")
    px(s, cx - 12, top + 35, GOLD[2], w, h)
    # boots
    s.rect(cx - 9, top + 39, cx - 5, top + 41, BOOT, only="opaque")
    s.rect(cx + 5, top + 39, cx + 9, top + 41, BOOT, only="opaque")
    s.rect(cx - 9, top + 39, cx + 9, top + 39, BOOT, only="opaque")


def costume_sea(s, cx=24, top=2, front=True, w=48, h=48):
    """Sailor: tricorn hat, striped shirt, rope belt, compass."""
    s.rect(cx - 11, top + 2, cx + 11, top + 4, NAVY[1], only="opaque")
    s.ellipse(cx - 9, top + 0, cx + 9, top + 4, NAVY[2], only="opaque")
    s.rect(cx - 11, top + 4, cx + 11, top + 4, NAVY[0], only="opaque")
    s.rect(cx - 9, top + 3, cx + 9, top + 3, CREAM[2], only="opaque")
    px(s, cx, top + 1, GOLD[2], w, h)
    px(s, cx, top + 2, GOLD[2], w, h)
    # shirt
    s.rect(cx - 10, top + 27, cx + 10, top + 36, CREAM[2], only="opaque")
    s.rect(cx - 10, top + 28, cx + 10, top + 29, NAVY[1], only="opaque")
    s.rect(cx - 10, top + 31, cx + 10, top + 32, NAVY[1], only="opaque")
    # collar flaps
    s.polygon([(cx - 10, top + 27), (cx - 5, top + 31), (cx - 10, top + 31)], NAVY[0], only="opaque")
    s.polygon([(cx + 10, top + 27), (cx + 5, top + 31), (cx + 10, top + 31)], NAVY[0], only="opaque")
    # rope belt
    s.rect(cx - 10, top + 34, cx + 10, top + 34, TAN, only="opaque")
    px(s, cx, top + 35, TAN, w, h)
    # compass
    s.circle(cx, top + 31, 3, GOLD[1], fill=True, only="opaque")
    s.circle(cx, top + 31, 2, CREAM[2], fill=True, only="opaque")
    px(s, cx, top + 29, SCARF[1], w, h)
    px(s, cx, top + 33, NAVY[0], w, h)
    # boots
    s.rect(cx - 9, top + 39, cx - 5, top + 41, BOOT, only="opaque")
    s.rect(cx + 5, top + 39, cx + 9, top + 41, BOOT, only="opaque")


def costume_air(s, cx=24, top=2, front=True, w=48, h=48):
    """Aviator: leather cap + goggles, brown jacket, red scarf over."""
    # cap + ear flaps
    s.rect(cx - 11, top + 2, cx + 11, top + 4, LEATH[1], only="opaque")
    s.rect(cx - 12, top + 4, cx - 9, top + 8, LEATH[1], only="opaque")
    s.rect(cx + 9, top + 4, cx + 12, top + 8, LEATH[1], only="opaque")
    # goggles (pushed up)
    s.circle(cx - 6, top + 2, 3, GOLD[0], fill=True, only="opaque")
    s.circle(cx - 6, top + 2, 2, LENS, fill=True, only="opaque")
    s.circle(cx + 6, top + 2, 3, GOLD[0], fill=True, only="opaque")
    s.circle(cx + 6, top + 2, 2, LENS, fill=True, only="opaque")
    s.rect(cx - 3, top + 2, cx + 3, top + 2, LEATH[0], only="opaque")
    # jacket
    s.rect(cx - 10, top + 27, cx + 10, top + 37, JACK[1], only="opaque")
    s.rect(cx - 10, top + 27, cx - 6, top + 31, JACK[0], only="opaque")
    s.rect(cx + 6, top + 27, cx + 10, top + 31, JACK[0], only="opaque")
    s.rect(cx - 9, top + 32, cx - 6, top + 35, LEATH[1], only="opaque")
    s.rect(cx + 6, top + 32, cx + 9, top + 35, LEATH[1], only="opaque")
    px(s, cx, top + 28, GOLD[2], w, h)
    px(s, cx, top + 31, GOLD[2], w, h)
    px(s, cx, top + 34, GOLD[2], w, h)
    # scarf over jacket (tail to the right)
    s.rect(cx - 10, top + 25, cx + 10, top + 27, SCARF[1], only="opaque")
    s.rect(cx + 8, top + 27, cx + 10, top + 32, SCARF[0], only="opaque")
    px(s, cx + 8, top + 33, GOLD[2], w, h)
    px(s, cx + 10, top + 33, GOLD[2], w, h)
    # boots
    s.rect(cx - 9, top + 39, cx - 5, top + 41, BOOT, only="opaque")
    s.rect(cx + 5, top + 39, cx + 9, top + 41, BOOT, only="opaque")


def costume_insurance(s, cx=24, top=2, front=True, w=48, h=48):
    """Insurance clerk: cream robe, red cross tabard, quill, coin purse."""
    s.rect(cx - 10, top + 27, cx + 10, top + 40, ROBE[1], only="opaque")
    s.rect(cx - 10, top + 27, cx + 10, top + 28, ROBE[0], only="opaque")
    s.rect(cx - 10, top + 40, cx + 10, top + 40, ROBE[0], only="opaque")
    # red cross tabard
    s.rect(cx - 1, top + 29, cx + 1, top + 39, SCARF[1], only="opaque")
    s.rect(cx - 5, top + 32, cx + 5, top + 34, SCARF[1], only="opaque")
    # belt + purse
    s.rect(cx - 10, top + 36, cx + 10, top + 36, LEATH[1], only="opaque")
    s.rect(cx + 6, top + 34, cx + 9, top + 37, GOLD[1], only="opaque")
    s.rect(cx + 6, top + 34, cx + 9, top + 34, GOLD[2], only="opaque")
    s.rect(cx + 7, top + 33, cx + 8, top + 34, LEATH[0], only="opaque")
    # quill behind right ear
    px(s, cx + 14, top + 1, CREAM[2], w, h)
    px(s, cx + 15, top + 2, CREAM[2], w, h)
    px(s, cx + 16, top + 3, CREAM[2], w, h)
    px(s, cx + 15, top + 2, DARK, w, h)
    px(s, cx + 17, top + 4, GOLD[2], w, h)
    # feet peek under robe
    s.rect(cx - 7, top + 41, cx - 4, top + 42, BELLY, only="opaque")
    s.rect(cx + 4, top + 41, cx + 7, top + 42, BELLY, only="opaque")


def costume_back(s, cx=24, top=2, outfit="land", w=48, h=48):
    """Back view of each costume (no face, no front details)."""
    if outfit == "land":
        s.rect(cx - 11, top + 2, cx + 11, top + 5, LEATH[1], only="opaque")
        s.rect(cx - 13, top + 4, cx + 13, top + 5, LEATH[0], only="opaque")
        s.rect(cx - 10, top + 27, cx + 10, top + 37, GREEN[1], only="opaque")
        s.rect(cx - 10, top + 34, cx + 10, top + 34, LEATH[1], only="opaque")
    elif outfit == "sea":
        s.rect(cx - 11, top + 2, cx + 11, top + 4, NAVY[1], only="opaque")
        s.rect(cx - 9, top + 3, cx + 9, top + 3, CREAM[2], only="opaque")
        s.rect(cx - 10, top + 27, cx + 10, top + 36, CREAM[2], only="opaque")
        s.rect(cx - 10, top + 28, cx + 10, top + 29, NAVY[1], only="opaque")
        s.rect(cx - 10, top + 31, cx + 10, top + 32, NAVY[1], only="opaque")
        s.rect(cx - 10, top + 34, cx + 10, top + 34, TAN, only="opaque")
    elif outfit == "air":
        s.rect(cx - 11, top + 2, cx + 11, top + 4, LEATH[1], only="opaque")
        s.rect(cx - 12, top + 4, cx - 9, top + 8, LEATH[1], only="opaque")
        s.rect(cx + 9, top + 4, cx + 12, top + 8, LEATH[1], only="opaque")
        s.rect(cx - 10, top + 27, cx + 10, top + 37, JACK[1], only="opaque")
        s.rect(cx - 10, top + 25, cx + 10, top + 27, SCARF[1], only="opaque")
    else:
        s.rect(cx - 10, top + 27, cx + 10, top + 40, ROBE[1], only="opaque")
        s.rect(cx - 1, top + 29, cx + 1, top + 39, SCARF[1], only="opaque")
        s.rect(cx - 5, top + 32, cx + 5, top + 34, SCARF[1], only="opaque")
    # boots/feet for all backs
    s.rect(cx - 9, top + 39, cx - 5, top + 41, BELLY, only="opaque")
    s.rect(cx + 5, top + 39, cx + 9, top + 41, BELLY, only="opaque")


def draw_hamster(s, cx=24, top=2, direction="front", outfit="land", frame=0, w=48, h=48):
    """Full hamster for a 48x48 cell. direction: front/back/right (left = mirrored)."""
    bob = 1 if frame else 0
    top = top + bob
    front = direction == "front"
    right = direction == "right"
    draw_ears(s, cx, top, front=front, right=right, w=w, h=h)
    draw_body(s, cx, top, front=front, w=w, h=h)
    draw_head(s, cx, top, front=front, right=right, w=w, h=h)
    draw_scarf(s, cx, top, right=right, w=w, h=h)
    draw_arms(s, cx, top, front=front, w=w, h=h)
    if direction == "back":
        costume_back(s, cx, top, outfit=outfit, w=w, h=h)
    elif outfit == "land":
        costume_land(s, cx, top, front=front, w=w, h=h)
    elif outfit == "sea":
        costume_sea(s, cx, top, front=front, w=w, h=h)
    elif outfit == "air":
        costume_air(s, cx, top, front=front, w=w, h=h)
    else:
        costume_insurance(s, cx, top, front=front, w=w, h=h)
