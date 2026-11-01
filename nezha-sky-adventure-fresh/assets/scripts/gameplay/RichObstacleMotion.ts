import { OBSTACLES, ObstacleId } from '../config/ObstacleConfig';
import { MotionFrame, MotionPrimitive, Point, Tint } from './ObstacleMotion';
import { OBSTACLE_MASKS } from '../config/ObstacleMasks';

/** Layered decorative motion; permanent art and its alpha collider never deform. */
export function sampleRichMotion(id: ObstacleId, width: number, bottom: number, top: number,
    elapsed: number, slot: number): MotionFrame {
    const config = OBSTACLES[id], height = top - bottom;
    const phase = config.period ? (elapsed / config.period + slot * 0.173) % 1 : 0;
    const angle = phase * Math.PI * 2;
    const primitives: MotionPrimitive[] = [];
    const frame: MotionFrame = { primitives, phase, bounds: { left: -width / 2, right: width / 2, bottom, top } };
    if (!config.period) return frame;
    const inside = (u: number, v: number): boolean => {
        const col = Math.max(0, Math.min(63, Math.floor((u + 0.5) * 64)));
        const row = Math.max(0, Math.min(255, Math.floor((1 - v) * 256)));
        return !!((OBSTACLE_MASKS[id][row * 2 + (col >>> 5)] >>> (col & 31)) & 1);
    };
    const point = (u: number, v: number): Point => ({ x: u * width, y: bottom + v * height });
    const dot = (u: number, v: number, radius: number, color: Tint): void => {
        if (!inside(u, v)) return;
        primitives.push({ kind: 'circle', ...point(u, v), radius, color });
    };
    const line = (coords: readonly (readonly [number, number])[], color: Tint, thickness = 1.5): void => {
        const points: Point[] = [];
        for (const [u, v] of coords) {
            if (inside(u, v)) points.push(point(u, v));
            else if (points.length) break;
        }
        if (points.length > 1) primitives.push({ kind: 'stroke', points, color, width: thickness });
    };
    if (id === 'fireball') {
        for (let i = 0; i < 18; i++) {
            const v = 0.04 + ((phase + i / 18) % 1) * 0.9;
            const u = Math.sin(angle * 2 + i * 2.1) * 0.22;
            dot(u, v, 1.1 + (i % 3) * 0.45, [255, 235, 144, 210]);
        }
        for (let i = 0; i < 4; i++) {
            const v = 0.1 + i * 0.23;
            line([[-0.14, v], [Math.sin(angle + i) * 0.1, v + 0.035], [0.13, v + 0.065]], [255, 247, 184, 160], 2);
        }
    } else if (id === 'waterball') {
        for (let i = 0; i < 12; i++) {
            const v = 0.07 + ((phase * 0.8 + i / 12) % 1) * 0.85;
            dot(Math.sin(angle + i * 2) * 0.19, v, 1.2 + i % 3 * 0.5, [212, 249, 255, 200]);
        }
        for (let i = 0; i < 5; i++) {
            const v = 0.08 + ((phase + i / 5) % 1) * 0.84;
            const points: [number, number][] = [];
            for (let k = 0; k < 8; k++) points.push([-0.25 + k / 14, v + Math.sin(k / 7 * Math.PI) * 0.018]);
            line(points, [225, 252, 255, 180]);
        }
    } else if (id === 'lightning') {
        const pulse = Math.round(90 + (1 + Math.sin(angle)) * 65);
        for (let i = 0; i < 7; i++) {
            const v = 0.08 + i * 0.12;
            line([[0, v], [Math.sin(angle * 2 + i) * 0.14, v + 0.035], [0.02, v + 0.075]], [255, 248, 202, pulse], 2.4);
            dot(Math.sin(angle + i) * 0.2, v, 1.4, [255, 241, 137, pulse]);
        }
    } else if (id === 'windwheel') {
        for (const v of [0.19, 0.5, 0.77]) {
            for (let spoke = 0; spoke < 6; spoke++) {
                const a = angle + spoke * Math.PI / 3;
                const u = Math.cos(a) * 0.21, dy = Math.sin(a) * width * 0.21 / height;
                line([[u * 0.5, v + dy * 0.5], [u, v + dy]], [255, 238, 156, 220], 2.4);
                dot(u, v + dy, 1.3, [255, 212, 117, 220]);
            }
        }
    } else if (id === 'seaMonster') {
        for (let i = 0; i < 12; i++) {
            const v = 0.06 + i * 0.075;
            const u = Math.sin(v * 18 + angle) * 0.18;
            dot(u, v, 1.5, [188, 244, 215, 120 + Math.round(Math.sin(angle + i) * 50)]);
        }
        for (let i = 0; i < 3; i++) {
            const v = 0.1 + i * 0.22;
            line([[-0.12, v], [Math.sin(angle + i) * 0.12, v + 0.025], [0.12, v + 0.06]], [164, 232, 218, 160]);
        }
        // Bright eyes close briefly, with no change to the opaque creature silhouette.
        for (const u of [-0.11, 0.11]) {
            if (phase > 0.82 && phase < 0.91) line([[u - 0.035, 0.115], [u + 0.035, 0.115]], [31, 91, 84, 235], 2);
            else dot(u, 0.115, 1.6, [244, 255, 217, 245]);
        }
    }
    return frame;
}
