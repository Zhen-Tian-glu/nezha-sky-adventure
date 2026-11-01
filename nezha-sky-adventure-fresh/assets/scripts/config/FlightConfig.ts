/** Initial graybox tuning in design pixels and seconds; subject to playtesting. */
export const FLIGHT_CONFIG = Object.freeze({
    playerX: -200,
    playerRadius: 28,
    floor: -500,
    ceiling: 480,
    flapVelocity: 360,
    gravity: 1200,
    maxRiseSpeed: 360,
    maxFallSpeed: 440,
    firstObstacleX: 490,
    fixedStep: 1 / 120,
    maxFrameDelta: 0.05,
});
