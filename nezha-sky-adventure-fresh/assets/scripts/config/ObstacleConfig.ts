export type ThemeId = 'sky' | 'dragon';
export type ObstacleId = 'mountain' | 'pillar' | 'fireball' | 'waterball'
    | 'cloud' | 'lightning' | 'windwheel' | 'seaMonster';
export type ObstacleMotionKind = 'static' | 'flame' | 'flow' | 'flash' | 'rotate' | 'creature';

export interface ObstacleDefinition {
    readonly name: string;
    readonly widthScale: number;
    readonly color: readonly [number, number, number];
    readonly motion: ObstacleMotionKind;
    readonly period: number;
}

export const OBSTACLES: Readonly<Record<ObstacleId, ObstacleDefinition>> = {
    mountain: { name: '山峰', widthScale: 1.2, color: [108, 134, 116], motion: 'static', period: 0 },
    pillar: { name: '石柱', widthScale: 0.9, color: [137, 133, 119], motion: 'static', period: 0 },
    fireball: { name: '火球', widthScale: 1, color: [190, 105, 73], motion: 'flame', period: 1.2 },
    waterball: { name: '水球', widthScale: 1, color: [74, 145, 175], motion: 'flow', period: 1.8 },
    cloud: { name: '乌云', widthScale: 1.2, color: [104, 115, 141], motion: 'static', period: 0 },
    lightning: { name: '雷电', widthScale: 0.95, color: [160, 141, 79], motion: 'flash', period: 1.5 },
    windwheel: { name: '风火轮', widthScale: 1.1, color: [181, 105, 88], motion: 'rotate', period: 2.4 },
    seaMonster: { name: '海底妖怪', widthScale: 1.1, color: [82, 143, 139], motion: 'creature', period: 2.6 },
};

export const MOTION_RULES = Object.freeze({
    framesPerSecond: 20,
    edgePadding: 6,
    maxRadius: 30,
    symbolOffset: 48,
    outlineWidth: 2,
});

export interface ThemeDefinition {
    readonly name: string;
    readonly lower: readonly ObstacleId[];
    readonly upper: readonly ObstacleId[];
    readonly background: readonly [number, number, number];
}

export const THEMES: Readonly<Record<ThemeId, ThemeDefinition>> = {
    sky: {
        name: '天宫', lower: ['mountain', 'pillar', 'fireball'],
        upper: ['cloud', 'lightning', 'windwheel'], background: [231, 239, 236],
    },
    dragon: {
        name: '海底龙宫', lower: ['mountain', 'pillar', 'waterball'],
        upper: ['seaMonster'], background: [215, 236, 238],
    },
};

export interface ObstacleCombination { readonly lower: ObstacleId; readonly upper: ObstacleId; }

export function getCombinations(theme: ThemeId): ObstacleCombination[] {
    const pairs: ObstacleCombination[] = [];
    for (const lower of THEMES[theme].lower) {
        for (const upper of THEMES[theme].upper) pairs.push({ lower, upper });
    }
    return pairs;
}

export interface Difficulty {
    readonly level: number;
    readonly score: number;
    readonly speed: number;
    readonly gap: number;
    readonly spacing: number;
}

export const DIFFICULTY_TIERS: readonly Difficulty[] = [
    { level: 0, score: 0, speed: 170, gap: 380, spacing: 480 },
    { level: 1, score: 5, speed: 190, gap: 350, spacing: 455 },
    { level: 2, score: 12, speed: 210, gap: 325, spacing: 430 },
    { level: 3, score: 22, speed: 235, gap: 300, spacing: 415 },
    { level: 4, score: 35, speed: 255, gap: 280, spacing: 400 },
];

export const OBSTACLE_RULES = Object.freeze({
    poolSize: 4,
    baseWidthMin: 94,
    baseWidthMax: 126,
    gapVariation: 40,
    minGap: 240,
    maxGap: 420,
    minAdjacentGapDifference: 40,
    centerMin: -180,
    centerMax: 160,
    firstCenterDelta: 35,
    maxCenterDelta: 45,
    boundaryClearance: 90,
    reactionTime: 0.25,
    verticalSafetyMargin: 18,
    extraTravelMargin: 16,
    spacingJitter: 20,
    spacingSafetyJitter: 8,
    maxSpeed: 255,
    speedAcceleration: 12,
    recycleRightEdge: -440,
});

export function getDifficulty(score: number): Difficulty {
    let result = DIFFICULTY_TIERS[0];
    for (const tier of DIFFICULTY_TIERS) {
        if (score >= tier.score) result = tier;
    }
    return result;
}
