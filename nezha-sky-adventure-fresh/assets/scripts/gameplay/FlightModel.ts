import { FLIGHT_CONFIG as C } from '../config/FlightConfig';
import { getDifficulty, OBSTACLE_RULES as R } from '../config/ObstacleConfig';
import { Gate, ObstacleField, RunOptions } from './ObstacleField';
import { hitsArt } from './ArtCollision';
import { obstaclePose } from './ObstaclePose';
export type { Gate } from './ObstacleField';

export type RunState = 'ready' | 'playing' | 'paused' | 'gameOver';
export type FailureReason = 'ceiling' | 'floor' | 'obstacle' | null;

/** Engine-independent movement and collision. Rotation is purely visual. */
export class FlightModel {
    public state: RunState = 'ready';
    public failure: FailureReason = null;
    public y = 0;
    public velocity = 0;
    public flapCount = 0;
    public elapsed = 0;
    public score = 0;
    public speed = getDifficulty(0).speed;
    public readonly field = new ObstacleField();
    public gates: Gate[] = this.field.gates;
    public get theme() { return this.field.theme; }
    private pendingFlap = false;

    public start(options: RunOptions = {}): void {
        this.y = 0;
        this.velocity = 0;
        this.clearPendingInput();
        this.flapCount = 0;
        this.elapsed = 0;
        this.score = 0;
        this.speed = getDifficulty(0).speed;
        this.failure = null;
        this.field.reset(options);
        this.gates = this.field.gates;
        this.state = 'ready';
    }

    public requestFlap(): void {
        if (this.state === 'ready' || this.state === 'playing') this.pendingFlap = true;
    }

    public clearPendingInput(): void {
        this.pendingFlap = false;
    }

    public pause(): void {
        this.clearPendingInput();
        if (this.state === 'playing') this.state = 'paused';
    }

    public resume(): void {
        this.clearPendingInput();
        if (this.state === 'paused') this.state = 'playing';
    }

    public step(dt: number): void {
        if (!Number.isFinite(dt) || dt <= 0) return;
        if (this.state !== 'ready' && this.state !== 'playing') return;
        if (this.pendingFlap) {
            this.pendingFlap = false;
            this.velocity = Math.min(C.flapVelocity, C.maxRiseSpeed);
            this.flapCount += 1;
            this.state = 'playing';
        }
        if (this.state !== 'playing') return;
        this.velocity = Math.max(-C.maxFallSpeed,
            Math.min(C.maxRiseSpeed, this.velocity - C.gravity * dt));
        this.y += this.velocity * dt;
        this.elapsed += dt;
        const targetSpeed = getDifficulty(this.score).speed;
        this.speed = Math.min(targetSpeed, this.speed + R.speedAcceleration * dt);
        this.field.move(dt, this.speed);

        if (this.y + C.playerRadius >= C.ceiling) {
            this.y = C.ceiling - C.playerRadius;
            this.finish('ceiling');
        } else if (this.y - C.playerRadius <= C.floor) {
            this.y = C.floor + C.playerRadius;
            this.finish('floor');
        } else {
            for (const gate of this.gates) {
                const lower = obstaclePose(gate.lower, gate.lowerWidth, C.floor,
                    gate.centerY - gate.gapHeight / 2, 'lower', this.elapsed, gate.slotId);
                const upper = obstaclePose(gate.upper, gate.upperWidth,
                    gate.centerY + gate.gapHeight / 2, C.ceiling, 'upper', this.elapsed, gate.slotId);
                if (hitsArt(gate.lower, C.playerX, this.y, C.playerRadius, gate.x + lower.offsetX,
                    lower.width, lower.bottom, lower.top)
                    || hitsArt(gate.upper, C.playerX, this.y, C.playerRadius, gate.x + upper.offsetX,
                        upper.width, upper.bottom, upper.top)) {
                    this.finish('obstacle');
                    break;
                }
            }
        }
        if (this.state !== 'playing') return;
        this.score += this.field.collectScore(C.playerX - C.playerRadius);
        this.field.recycle(this.score);
    }

    private finish(reason: Exclude<FailureReason, null>): void {
        this.state = 'gameOver';
        this.failure = reason;
        this.clearPendingInput();
        this.velocity = 0;
    }
}
