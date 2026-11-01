import { RunState } from './FlightModel';

export function heroFrame(state: RunState, velocity: number, elapsed: number,
    idleTime: number, flapAge: number, hitTime: number): number {
    if (state === 'gameOver') return 12 + Math.min(3, Math.floor(hitTime / 0.105));
    if (state === 'ready') return Math.floor(idleTime / 0.28) % 4;
    return velocity > 0
        ? 4 + Math.floor(Math.max(0, flapAge) / 0.085) % 4
        : 8 + Math.floor(elapsed / 0.14) % 4;
}

export function layoutScale(visibleHeight: number): number {
    return Math.min(1, Math.max(0.1, visibleHeight / 1334));
}
