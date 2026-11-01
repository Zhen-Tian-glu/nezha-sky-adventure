import { OBSTACLE_MASKS } from '../config/ObstacleMasks';
import { ObstacleId } from '../config/ObstacleConfig';

/** Narrow phase follows the imported alpha silhouette, not a hidden rectangle. */
export function hitsArt(id: ObstacleId, x: number, y: number, radius: number,
    centerX: number, width: number, bottom: number, top: number): boolean {
    const height = top - bottom;
    const left = centerX - width / 2;
    const nearX = Math.max(left, Math.min(left + width, x));
    const nearY = Math.max(bottom, Math.min(top, y));
    if ((x - nearX) ** 2 + (y - nearY) ** 2 > radius ** 2) return false;
    const mask = OBSTACLE_MASKS[id];
    const cw = width / 64, ch = height / 256;
    const minCol = Math.max(0, Math.floor((x - radius - left) / cw));
    const maxCol = Math.min(63, Math.floor((x + radius - left) / cw));
    const minRow = Math.max(0, Math.floor((top - y - radius) / ch));
    const maxRow = Math.min(255, Math.floor((top - y + radius) / ch));
    for (let row = minRow; row <= maxRow; row++) {
        for (let col = minCol; col <= maxCol; col++) {
            if (!((mask[row * 2 + (col >>> 5)] >>> (col & 31)) & 1)) continue;
            const px = Math.max(left + col * cw, Math.min(left + (col + 1) * cw, x));
            const py = Math.max(top - (row + 1) * ch, Math.min(top - row * ch, y));
            if ((x - px) ** 2 + (y - py) ** 2 <= radius ** 2) return true;
        }
    }
    return false;
}
