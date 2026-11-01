import { OBSTACLES, ObstacleId } from '../config/ObstacleConfig';

export interface ObstaclePose {
    offsetX: number;
    width: number;
    bottom: number;
    top: number;
    tint: readonly [number, number, number];
}

/** Both drawing and collision use this pose; motion stays within the reserved envelope. */
export function obstaclePose(id: ObstacleId, width: number, bottom: number, top: number,
    side: 'lower' | 'upper', elapsed: number, slot: number): ObstaclePose {
    const def = OBSTACLES[id];
    const angle = def.period ? (elapsed / def.period + slot * 0.173) * Math.PI * 2 : 0;
    const wave = Math.sin(angle), pulse = (wave + 1) / 2;
    let widthScale = 1, heightScale = 1, offsetX = 0;
    let tint: readonly [number, number, number] = [255, 255, 255];
    if (id === 'fireball') {
        widthScale = 0.88 + pulse * 0.12; heightScale = 0.97 + pulse * 0.03;
        tint = [255, Math.round(220 + pulse * 35), Math.round(195 + pulse * 60)];
    } else if (id === 'waterball') {
        widthScale = 0.88 + pulse * 0.1; heightScale = 0.975 + pulse * 0.025;
        tint = [Math.round(210 + pulse * 45), Math.round(238 + pulse * 17), 255];
    } else if (id === 'lightning') {
        tint = [255, Math.round(190 + pulse * 65), Math.round(155 + pulse * 100)];
    } else if (id === 'windwheel') {
        widthScale = 0.84; offsetX = wave * width * 0.065;
    } else if (id === 'seaMonster') {
        widthScale = 0.84 + pulse * 0.08; offsetX = wave * width * 0.035;
        heightScale = 0.97 + pulse * 0.03;
    }
    const height = (top - bottom) * heightScale;
    return {
        offsetX, width: width * widthScale,
        bottom: side === 'lower' ? bottom : top - height,
        top: side === 'lower' ? bottom + height : top,
        tint,
    };
}
