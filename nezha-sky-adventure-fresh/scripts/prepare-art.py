"""Copy selected originals and regenerate texture rectangles / alpha collision data.

No artwork is painted or resampled here. SpriteFrame rectangles select atlas regions.
Requires Pillow. Run from any directory with Python 3.
"""
from pathlib import Path
import hashlib
import json
import shutil
from PIL import Image

PROJECT = Path(__file__).resolve().parents[1]
SOURCE = PROJECT.parent / 'game_assets' / 'production' / 'v1'
TARGET = PROJECT / 'assets' / 'resources' / 'art'
CONFIG = PROJECT / 'assets' / 'scripts' / 'config'
TARGET.mkdir(parents=True, exist_ok=True)
names = ['nezha_motion_atlas.png', 'obstacle_column_atlas.png', 'sky_background.png',
         'dragon_background.png', 'sky_foreground.png', 'dragon_foreground.png']
manifest = {}
selection = json.loads((SOURCE / 'hero_selection.json').read_text(encoding='utf-8'))
for name in names:
    source = SOURCE / (selection['source'] if name == 'nezha_motion_atlas.png' else name)
    shutil.copyfile(source, TARGET / name)
    with Image.open(source) as image:
        manifest[name] = {'selectedProductionSource': source.name, 'size': list(image.size),
                          'bytes': source.stat().st_size,
                          'sha256': hashlib.sha256(source.read_bytes()).hexdigest()}

def transparent_cut(alpha, nominal, vertical, low, high):
    """Find a clear gutter near a grid boundary without repainting any pixels."""
    length = alpha.width if vertical else alpha.height
    runs, start = [], None
    for value in range(max(1, nominal - 45), min(length - 1, nominal + 46)):
        strip = alpha.crop((value, low, value + 1, high) if vertical else (low, value, high, value + 1))
        clear = sum(strip.histogram()[180:]) == 0
        if clear and start is None:
            start = value
        if not clear and start is not None:
            if value - start >= 3:
                runs.append((start + value - 1) // 2)
            start = None
    if start is not None:
        runs.append((start + min(length - 2, nominal + 45)) // 2)
    if not runs:
        raise ValueError(f'No transparent gutter near {nominal}')
    return min(runs, key=lambda value: abs(value - nominal))

with Image.open(TARGET / 'nezha_motion_atlas.png') as image:
    alpha = image.getchannel('A')
    ycuts = [0] + [transparent_cut(alpha, round(row * image.height / 4), False, 0, image.width)
                   for row in range(1, 4)] + [image.height]
    hero, hero_layouts = [], []
    for row in range(4):
        xcuts = [0] + [transparent_cut(alpha, round(col * image.width / 4), True, ycuts[row], ycuts[row + 1])
                       for col in range(1, 4)] + [image.width]
        for col in range(4):
            padding = selection['cropPadding']
            x, y = xcuts[col] + padding, ycuts[row] + padding
            w, h = xcuts[col + 1] - padding - x, ycuts[row + 1] - padding - y
            hero.append([x, y, w, h])
            # Constant source-pixel scale and body pivot prevent per-frame stretching.
            nominal_w, nominal_h = image.width / 4, image.height / 4
            pivot_x = col * nominal_w + selection['anchor'][0] * nominal_w
            pivot_y = row * nominal_h + (1 - selection['anchor'][1]) * nominal_h
            hero_layouts.append({'width': w / nominal_w * selection['displaySize'],
                'height': h / nominal_h * selection['displaySize'],
                'anchor': [(pivot_x - x) / w, 1 - (pivot_y - y) / h]})

ids = ['mountain', 'pillar', 'fireball', 'waterball', 'cloud', 'lightning', 'windwheel', 'seaMonster']
rects, masks = {}, {}
with Image.open(TARGET / 'obstacle_column_atlas.png') as image:
    alpha_image = image.getchannel('A')
    for index, obstacle in enumerate(ids):
        row, col = divmod(index, 4)
        x, y = round(col * image.width / 4) + 4, round(row * image.height / 2) + 4
        w, h = round((col + 1) * image.width / 4) - 4 - x, round((row + 1) * image.height / 2) - 4 - y
        rects[obstacle] = [x, y, w, h]
        alpha = alpha_image.crop((x, y, x + w, y + h))
        words = []
        for gy in range(256):
            a = b = 0
            for gx in range(64):
                cell = alpha.crop((gx * w // 64, gy * h // 256,
                    max(gx * w // 64 + 1, (gx + 1) * w // 64),
                    max(gy * h // 256 + 1, (gy + 1) * h // 256)))
                if cell.getextrema()[1] >= 128:
                    if gx < 32:
                        a |= 1 << gx
                    else:
                        b |= 1 << (gx - 32)
            words.extend([a, b])
        masks[obstacle] = words

(CONFIG / 'ArtManifest.ts').write_text(
    '/** Generated from production/v1 originals; pixel rectangles use top-left origin. */\n'
    'export const HERO_RECTS: readonly (readonly number[])[] = ' + json.dumps(hero) + ';\n'
    'export const HERO_PRESENTATION = ' + json.dumps(selection, ensure_ascii=False) + ' as const;\n'
    'export const HERO_LAYOUTS = ' + json.dumps(hero_layouts) + ' as const;\n'
    'export const OBSTACLE_RECTS = ' + json.dumps(rects) + ' as const;\n', encoding='utf-8')
(CONFIG / 'ObstacleMasks.ts').write_text(
    '/** 64 x 256 alpha occupancy, two uint32 words per top-down row; threshold 128. */\n'
    'export const OBSTACLE_MASKS: Readonly<Record<string, readonly number[]>> = '
    + json.dumps(masks, separators=(',', ':')) + ';\n', encoding='utf-8')
(SOURCE / 'asset_manifest.json').write_text(json.dumps({'assets': manifest, 'heroFrames': hero,
    'heroAnchor': selection['anchor'], 'heroSelection': selection, 'heroLayouts': hero_layouts, 'obstacleRects': rects,
    'mask': {'columns': 64, 'rows': 256, 'alphaThreshold': 128}}, ensure_ascii=False, indent=2), encoding='utf-8')
print('Prepared 6 textures, 16 hero frames, 8 silhouette masks. No originals deleted.')
