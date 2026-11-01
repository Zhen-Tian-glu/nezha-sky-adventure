import { MOTION_RULES as R, OBSTACLES, ObstacleId } from '../config/ObstacleConfig';

export type Tint = readonly [number, number, number, number];
export interface Point { x: number; y: number; }
export type MotionPrimitive =
    | { kind: 'circle'; x: number; y: number; radius: number; color: Tint }
    | { kind: 'polygon'; points: Point[]; color: Tint }
    | { kind: 'stroke'; points: Point[]; width: number; color: Tint };
export interface MotionFrame {
    primitives: MotionPrimitive[];
    phase: number;
    /** Geometry is local to the immutable danger rectangle; it cannot move the gate. */
    bounds: { left: number; right: number; bottom: number; top: number };
}

/** Deterministic, engine-free interior animation; elapsed is the simulation clock. */
export function sampleObstacleMotion(
    id: ObstacleId, width: number, bottom: number, top: number,
    side: 'lower' | 'upper', elapsed: number, slotId: number,
): MotionFrame {
    const definition = OBSTACLES[id];
    const radius = Math.max(0, Math.min(R.maxRadius, width / 2 - R.edgePadding,
        (top - bottom) / 2 - R.edgePadding));
    const offset = Math.min(R.symbolOffset, (top - bottom) / 2);
    const cy = side === 'lower' ? top - offset : bottom + offset;
    const phase = definition.period > 0
        ? ((Math.max(0, elapsed) / definition.period + slotId * 0.173) % 1) : 0;
    const angle = phase * Math.PI * 2;
    const pulse = Math.sin(angle);
    const primitives: MotionPrimitive[] = [];
    const frame: MotionFrame = {
        primitives, phase,
        bounds: { left: -width / 2, right: width / 2, bottom, top },
    };
    if (radius <= 2) return frame;
    const point = (x: number, y: number): Point => ({ x: x * radius, y: cy + y * radius });
    const circle = (x: number, y: number, r: number, color: Tint): void => {
        primitives.push({ kind: 'circle', ...point(x, y), radius: r * radius, color });
    };
    const polygon = (coords: readonly (readonly [number, number])[], color: Tint): void => {
        primitives.push({ kind: 'polygon', points: coords.map(([x, y]) => point(x, y)), color });
    };
    const stroke = (coords: readonly (readonly [number, number])[], color: Tint, width = 2): void => {
        primitives.push({ kind: 'stroke', points: coords.map(([x, y]) => point(x, y)), color, width });
    };
    switch (definition.motion) {
    case 'flame':
        circle(0, -0.15, 0.65, [239, 143, 58, 255]);
        polygon([[-0.65, -0.6], [-0.8, 0.05], [-0.4, -0.05], [-0.35 + pulse * 0.12, 0.65],
            [0.05 + pulse * 0.2, 0.95], [0.35, 0.2], [0.65, 0.5 + pulse * 0.16], [0.7, -0.55]], [255, 187, 73, 255]);
        polygon([[-0.32, -0.55], [-0.25, 0], [0.07, 0.45 + pulse * 0.12], [0.36, -0.5]], [255, 237, 163, 255]);
        break;
    case 'flow':
        circle(0, 0, 0.94, [90, 190, 216, 255]);
        for (let band = 0; band < 3; band++) {
            const y = ((phase * 1.5 + band * 0.5) % 1.5) - 0.75;
            const coords: [number, number][] = [];
            for (let i = 0; i <= 8; i++) {
                const x = -0.66 + i * 0.165;
                coords.push([x, y + Math.sin(x * 5 + angle) * 0.07]);
            }
            stroke(coords, [205, 246, 248, 230]);
        }
        break;
    case 'flash':
        // Only the interior glow pulses. The solid body, outline and bolt never vanish.
        circle(0, 0, 0.92, [255, 226, 114, Math.round(35 + (pulse + 1) * 30)]);
        polygon([[0.2, 0.9], [-0.55, -0.05], [-0.05, -0.05], [-0.3, -0.9],
            [0.58, 0.22], [0.05, 0.22]], [255, 239, 163, Math.round(210 + (pulse + 1) * 22)]);
        break;
    case 'rotate':
        circle(0, 0, 0.94, [231, 152, 70, 255]);
        circle(0, 0, 0.66, [151, 81, 66, 255]);
        for (let spoke = 0; spoke < 6; spoke++) {
            const a = angle + spoke * Math.PI / 3;
            const rotate = (x: number, y: number): readonly [number, number] =>
                [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
            polygon([rotate(0.26, -0.09), rotate(0.89, -0.15), rotate(0.65, 0.3)], [255, 227, 126, 255]);
        }
        circle(0, 0, 0.19, [255, 240, 188, 255]);
        break;
    case 'creature': {
        circle(0, 0.1, 0.66, [128, 203, 171, 255]);
        for (let leg = 0; leg < 3; leg++) {
            const x = (leg - 1) * 0.43;
            stroke([[x, -0.25], [x + pulse * 0.08, -0.52],
                [x + Math.sin(angle + leg) * 0.17, -0.82]], [183, 230, 183, 255], 4);
        }
        const blink = phase > 0.82 && phase < 0.9;
        for (const x of [-0.24, 0.24]) {
            if (blink) stroke([[x - 0.1, 0.2], [x + 0.1, 0.2]], [32, 59, 76, 255], 3);
            else { circle(x, 0.22, 0.14, [249, 245, 231, 255]); circle(x + pulse * 0.025, 0.2, 0.065, [32, 59, 76, 255]); }
        }
        stroke([[-0.14, -0.08], [0, -0.15 - pulse * 0.025], [0.14, -0.08]], [32, 59, 76, 255]);
        break;
    }
    case 'static':
        if (id === 'mountain') {
            polygon([[-0.9, -0.65], [0, 0.85], [0.9, -0.65]], [184, 208, 175, 255]);
            polygon([[-0.3, 0.35], [0, 0.85], [0.3, 0.35]], [249, 245, 231, 255]);
        } else if (id === 'pillar') {
            for (const y of [-0.6, 0, 0.6]) stroke([[-0.75, y], [0.75, y]], [218, 209, 181, 255], 3);
        } else {
            circle(-0.4, -0.1, 0.4, [174, 184, 196, 255]);
            circle(0, 0.17, 0.5, [174, 184, 196, 255]);
            circle(0.4, -0.1, 0.4, [174, 184, 196, 255]);
        }
        break;
    }
    return frame;
}
