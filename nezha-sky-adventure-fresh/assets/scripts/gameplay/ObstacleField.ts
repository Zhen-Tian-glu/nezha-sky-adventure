import { FLIGHT_CONFIG as C } from '../config/FlightConfig';
import {
    getCombinations, getDifficulty, OBSTACLES, OBSTACLE_RULES as R,
    ObstacleId, ThemeId,
} from '../config/ObstacleConfig';
import { SeededRandom } from './SeededRandom';

export interface Gate {
    slotId: number;
    generation: number;
    x: number;
    centerY: number;
    gapHeight: number;
    width: number;
    lowerWidth: number;
    upperWidth: number;
    lower: ObstacleId;
    upper: ObstacleId;
    scored: boolean;
    difficultyLevel: number;
}

export interface RunOptions {
    theme?: ThemeId;
    seed?: number;
    /** Explicit validation/replay option, not a production difficulty override. */
    combinationIndex?: number;
}

/** Worst-case downward transition, starting with maximum upward speed. */
function descentTime(distance: number): number {
    const toCap = (C.maxRiseSpeed + C.maxFallSpeed) / C.gravity;
    const positionAtCap = C.maxRiseSpeed * toCap - C.gravity * toCap * toCap / 2;
    if (-distance < positionAtCap) return toCap + (distance + positionAtCap) / C.maxFallSpeed;
    return (C.maxRiseSpeed + Math.sqrt(C.maxRiseSpeed ** 2 + 2 * C.gravity * distance)) / C.gravity;
}

export function requiredTransitionTime(delta: number): number {
    const rise = C.flapVelocity ** 2 / (2 * C.gravity);
    if (delta > rise) return Infinity;
    const ascent = (C.flapVelocity - Math.sqrt(C.flapVelocity ** 2 - 2 * C.gravity * delta)) / C.gravity;
    return R.reactionTime + Math.max(ascent, descentTime(delta));
}

export function transitionSafety(previous: Gate, next: Gate): {
    safe: boolean; availableTime: number; requiredTime: number; overlap: number;
} {
    const delta = Math.abs(next.centerY - previous.centerY);
    const availableTime = (next.x - previous.x - (previous.width + next.width) / 2
        - 2 * C.playerRadius) / R.maxSpeed;
    const requiredTime = requiredTransitionTime(delta);
    const margin = C.playerRadius + R.verticalSafetyMargin;
    const overlap = Math.min(previous.centerY + previous.gapHeight / 2 - margin,
        next.centerY + next.gapHeight / 2 - margin)
        - Math.max(previous.centerY - previous.gapHeight / 2 + margin,
            next.centerY - next.gapHeight / 2 + margin);
    const hopHeight = C.flapVelocity ** 2 / (2 * C.gravity);
    return {
        safe: delta <= R.maxCenterDelta + 1e-6 && availableTime >= requiredTime
            && overlap >= hopHeight + 2 * R.verticalSafetyMargin,
        availableTime, requiredTime, overlap,
    };
}

/** A fixed pool of four gate objects; recycled only after leaving the screen. */
export class ObstacleField {
    public readonly gates: Gate[] = Array.from({ length: R.poolSize }, (_, slotId) => ({
        slotId, generation: 0, x: 0, centerY: 0, gapHeight: 380, width: 80,
        lowerWidth: 80, upperWidth: 80, lower: 'mountain', upper: 'cloud',
        scored: false, difficultyLevel: 0,
    }));
    public theme: ThemeId = 'sky';
    public seed = 0;
    public recycled = 0;
    public generated = 0;
    private random = new SeededRandom(1);
    private combinationIndex: number | undefined;
    private themeBag: ThemeId[] = [];

    public reset(options: RunOptions = {}): void {
        const seed = options.seed ?? (Date.now() ^ Math.floor(Math.random() * 4294967296));
        this.seed = seed >>> 0;
        this.random = new SeededRandom(this.seed);
        // Always reserve one draw for theme choice so explicit replay preserves geometry.
        const themeRoll = this.random.next();
        if (options.theme !== undefined) this.theme = options.theme;
        else if (options.seed !== undefined) this.theme = themeRoll < 0.5 ? 'sky' : 'dragon';
        else {
            // A shuffled pair guarantees both scenes during two consecutive normal runs.
            if (!this.themeBag.length) this.themeBag = themeRoll < 0.5 ? ['sky', 'dragon'] : ['dragon', 'sky'];
            this.theme = this.themeBag.shift()!;
        }
        const pairs = getCombinations(this.theme);
        if (options.combinationIndex !== undefined
            && (!Number.isInteger(options.combinationIndex) || options.combinationIndex < 0
                || options.combinationIndex >= pairs.length)) throw new Error('Invalid combination index');
        this.combinationIndex = options.combinationIndex;
        this.recycled = 0;
        this.generated = 0;
        let previous: Gate | undefined;
        for (const gate of this.gates) {
            this.spawn(gate, previous, 0);
            previous = gate;
        }
    }

    public move(dt: number, speed: number): void {
        for (const gate of this.gates) gate.x -= speed * dt;
    }

    public collectScore(playerLeft: number): number {
        let added = 0;
        for (const gate of this.gates) {
            if (!gate.scored && gate.x + gate.width / 2 < playerLeft) {
                gate.scored = true;
                added += 1;
            }
        }
        return added;
    }

    public recycle(score: number): void {
        for (const gate of this.gates) {
            if (gate.x + gate.width / 2 >= R.recycleRightEdge) continue;
            let previous = this.gates[0];
            for (const other of this.gates) if (other.x > previous.x) previous = other;
            this.spawn(gate, previous, score);
            this.recycled += 1;
        }
    }

    private spawn(gate: Gate, previous: Gate | undefined, score: number): void {
        const difficulty = getDifficulty(score);
        const pairs = getCombinations(this.theme);
        const pair = pairs[this.combinationIndex ?? this.random.index(pairs.length)];
        gate.lower = pair.lower;
        gate.upper = pair.upper;
        gate.lowerWidth = Math.round(this.random.range(R.baseWidthMin, R.baseWidthMax) * OBSTACLES[pair.lower].widthScale);
        gate.upperWidth = Math.round(this.random.range(R.baseWidthMin, R.baseWidthMax) * OBSTACLES[pair.upper].widthScale);
        gate.width = Math.max(gate.lowerWidth, gate.upperWidth);
        const gapMin = Math.max(R.minGap, difficulty.gap - R.gapVariation);
        const gapMax = Math.min(R.maxGap, difficulty.gap + R.gapVariation);
        gate.gapHeight = this.chooseGap(previous, gapMin, gapMax);
        const delta = previous ? R.maxCenterDelta : R.firstCenterDelta;
        const previousCenter = previous?.centerY ?? 0;
        const low = Math.max(R.centerMin, previousCenter - delta,
            C.floor + R.boundaryClearance + gate.gapHeight / 2);
        const high = Math.min(R.centerMax, previousCenter + delta,
            C.ceiling - R.boundaryClearance - gate.gapHeight / 2);
        gate.centerY = this.random.range(low, high);
        const minimumSpacing = previous ? (previous.width + gate.width) / 2 + 2 * C.playerRadius
            + R.maxSpeed * requiredTransitionTime(Math.abs(gate.centerY - previous.centerY))
            + R.extraTravelMargin : 0;
        const requestedSpacing = difficulty.spacing + this.random.range(-R.spacingJitter, R.spacingJitter);
        const spacing = Math.max(requestedSpacing, minimumSpacing) + this.random.range(0, R.spacingSafetyJitter);
        gate.x = previous ? previous.x + spacing : C.firstObstacleX;
        gate.scored = false;
        gate.difficultyLevel = difficulty.level;
        gate.generation = ++this.generated;
    }

    private chooseGap(previous: Gate | undefined, min: number, max: number): number {
        // The first gate is forgiving; later gates visibly alternate wide and tight.
        if (!previous) return Math.round(this.random.range(Math.max(min, max - 25), max));
        const lowerEnd = Math.min(max, previous.gapHeight - R.minAdjacentGapDifference);
        const upperStart = Math.max(min, previous.gapHeight + R.minAdjacentGapDifference);
        const lowerCount = Math.max(0, lowerEnd - min + 1);
        const upperCount = Math.max(0, max - upperStart + 1);
        if (!lowerCount && !upperCount) throw new Error('Gap range cannot provide visible variation');
        const index = this.random.index(lowerCount + upperCount);
        return index < lowerCount ? min + index : upperStart + index - lowerCount;
    }
}
