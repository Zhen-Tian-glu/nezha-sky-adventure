import { ImageAsset, Rect, resources, SpriteFrame, Texture2D } from 'cc';
import { HERO_RECTS, OBSTACLE_RECTS } from '../config/ArtManifest';
import { ObstacleId, ThemeId } from '../config/ObstacleConfig';

export interface ProductionArt {
    hero: SpriteFrame[];
    obstacles: Record<ObstacleId, SpriteFrame>;
    background: Record<ThemeId, SpriteFrame>;
    foreground: Record<ThemeId, SpriteFrame>;
}

function loadTexture(name: string): Promise<Texture2D> {
    return new Promise((resolve, reject) => resources.load(`art/${name}`, ImageAsset, (error, asset) => {
        if (error) { reject(error); return; }
        const texture = new Texture2D(); texture.image = asset;
        resolve(texture);
    }));
}
function frame(texture: Texture2D, rectangle?: readonly number[]): SpriteFrame {
    const value = new SpriteFrame(); value.texture = texture;
    if (rectangle) value.rect = new Rect(rectangle[0], rectangle[1], rectangle[2], rectangle[3]);
    return value;
}
export async function loadProductionArt(): Promise<ProductionArt> {
    const [hero, obstacles, sky, dragon, skyFront, dragonFront] = await Promise.all([
        'nezha_motion_atlas', 'obstacle_column_atlas', 'sky_background', 'dragon_background',
        'sky_foreground', 'dragon_foreground',
    ].map(loadTexture));
    const obstacleFrames = {} as Record<ObstacleId, SpriteFrame>;
    for (const id of Object.keys(OBSTACLE_RECTS) as ObstacleId[]) obstacleFrames[id] = frame(obstacles, OBSTACLE_RECTS[id]);
    return {
        hero: HERO_RECTS.map(rectangle => frame(hero, rectangle)), obstacles: obstacleFrames,
        background: { sky: frame(sky), dragon: frame(dragon) },
        foreground: { sky: frame(skyFront), dragon: frame(dragonFront) },
    };
}
