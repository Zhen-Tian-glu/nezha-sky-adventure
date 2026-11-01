import { ThemeId } from '../config/ObstacleConfig';
import { MotionFrame, MotionPrimitive } from './ObstacleMotion';

export const SCENE_MOTION = Object.freeze({ midSpeed: 20, nearSpeed: 42 });

/** Decorative scenery has no collision and never consumes gameplay randomness. */
export function sceneMotion(theme: ThemeId, time: number): MotionFrame {
    const primitives: MotionPrimitive[] = [];
    if (theme === 'dragon') {
        for (let i = 0; i < 26; i++) {
            const y = -480 + ((i * 113 + time * (28 + i % 4 * 5)) % 940);
            const x = -345 + (i * 137 % 690) + Math.sin(time * 0.7 + i) * 12;
            const radius = 2 + i % 4;
            primitives.push({ kind: 'stroke', width: 1.3,
                points: Array.from({ length: 17 }, (_, j) => ({
                    x: x + Math.cos(j / 16 * Math.PI * 2) * radius,
                    y: y + Math.sin(j / 16 * Math.PI * 2) * radius,
                })), color: [213, 251, 255, 135] });
        }
        for (let i = 0; i < 5; i++) {
            const y = -370 + i * 175 + Math.sin(time * 0.6 + i) * 13;
            primitives.push({ kind: 'stroke', width: 2,
                points: Array.from({ length: 25 }, (_, j) => ({ x: -370 + j * 31,
                    y: y + Math.sin(j * 0.4 + time * 1.4) * 10 })), color: [190, 245, 245, 32] });
        }
    } else {
        for (let i = 0; i < 28; i++) {
            const x = 365 - ((i * 137 + time * (22 + i % 5 * 4)) % 730);
            const y = -460 + (i * 193 % 900) + Math.sin(time * 0.9 + i) * 10;
            primitives.push({ kind: 'stroke', width: 1.8,
                points: [{ x, y }, { x: x + 7, y: y + Math.sin(time + i) * 4 }],
                color: [255, 232, 154, 155] });
        }
    }
    // Soft moving shafts of sunlight stay behind the gameplay objects.
    for (let i = 0; i < 4; i++) {
        const x = -260 + i * 180 + Math.sin(time * 0.32 + i) * 22;
        primitives.push({ kind: 'polygon', points: [{ x, y: 480 }, { x: x + 16, y: 480 },
            { x: x + 175, y: -480 }, { x: x + 90, y: -480 }],
            color: theme === 'sky' ? [255, 241, 194, 16] : [214, 255, 252, 17] });
    }
    return { primitives, phase: time, bounds: { left: -375, right: 375, bottom: -500, top: 480 } };
}
