import {
    _decorator, Color, Component, EventTouch, game, Game, Graphics, Label,
    Layers, Node, profiler, Sprite, UITransform, view,
} from 'cc';
import { FLIGHT_CONFIG as C } from '../config/FlightConfig';
import { GAME_CONFIG } from '../config/GameConfig';
import { HERO_LAYOUTS, HERO_PRESENTATION } from '../config/ArtManifest';
import { MOTION_RULES, OBSTACLES, THEMES } from '../config/ObstacleConfig';
import { RunOptions } from './ObstacleField';
import { MotionFrame } from './ObstacleMotion';
import { drawMotionFrame } from './ObstacleMotionRenderer';
import { sampleRichMotion } from './RichObstacleMotion';
import { loadProductionArt, ProductionArt } from './ProductionArt';
import { heroFrame, layoutScale } from './ArtAnimation';
import { obstaclePose } from './ObstaclePose';
import { sceneMotion, SCENE_MOTION } from './SceneMotion';
import { FlightInput } from '../input/FlightInput';
import { FlightModel, RunState } from './FlightModel';

const { ccclass } = _decorator;
const INK = new Color(72, 57, 45);
const RED = new Color(185, 67, 47);
const PAPER = new Color(249, 245, 231);
const GOLD = new Color(216, 178, 95);

interface ObstacleView {
    node: Node;
    graphics: Graphics;
    effects: Graphics;
    lower: Label;
    upper: Label;
    generation: number;
    scored: boolean;
    motionTick: number;
    frames: { lower: MotionFrame; upper: MotionFrame } | null;
    lowerArt: Sprite;
    upperArt: Sprite;
}

@ccclass('GrayboxGame')
export class GrayboxGame extends Component {
    public readonly simulation = new FlightModel();
    private flightInput: FlightInput | null = null;
    private accumulator = 0;
    private lastState: RunState = 'ready';
    private armed = false;
    private lastFlapCount = 0;
    private flapFlash = 0;
    private world!: Node;
    private touchSurface!: Node;
    private firstTapHint!: Label;
    private player!: Node;
    private flapGraphics!: Graphics;
    private obstacleViews: ObstacleView[] = [];
    private frame!: Graphics;
    private themeLabel!: Label;
    private scoreLabel!: Label;
    private statusLabel!: Label;
    private panel!: Node;
    private panelTitle!: Label;
    private panelCopy!: Label;
    private actionLabel!: Label;
    private art!: ProductionArt;
    private heroSprite!: Sprite;
    private background!: Sprite;
    private banks: { sprite: Sprite; index: number; near: boolean }[] = [];
    private idleTime = 0;
    private hitTime = 0;
    private lastFlapTime = 0;
    private hidden = false;
    private scoreMoment = -100;
    private lastScore = 0;
    private scorePop!: Label;
    private impact!: Graphics;
    private currentHeroFrame = 0;
    private sceneryTime = 0;
    private sceneryTick = -1;
    private sceneryEffects!: Graphics;

    protected async start(): Promise<void> {
        profiler.hideStats();
        const loading = this.makeLabel('ArtLoading', this.node, '正在展开哪吒的冒险画卷…', 26, 0, 0, PAPER);
        try { this.art = await loadProductionArt(); }
        catch {
            if (!this.isValid) return;
            loading.string = '画卷加载失败，点此重试';
            loading.node.on(Node.EventType.TOUCH_END, () => { loading.node.destroy(); void this.start(); });
            return;
        }
        if (!this.isValid) return;
        loading.node.destroy();
        this.buildView();
        this.flightInput = new FlightInput(this.touchSurface, () => {
            if (this.armed) this.simulation.requestFlap();
        }, () => this.simulation.clearPendingInput());
        game.on(Game.EVENT_HIDE, this.onHide, this);
        // Showing the app leaves it paused; only an explicit button resumes it.
        game.on(Game.EVENT_SHOW, this.onShow, this);
        this.refreshPanel();
    }

    protected onDestroy(): void {
        this.flightInput?.dispose();
        game.off(Game.EVENT_HIDE, this.onHide, this);
        game.off(Game.EVENT_SHOW, this.onShow, this);
    }

    protected update(dt: number): void {
        if (!this.world) return;
        this.world.setPosition(0, 0);
        const scale = layoutScale(view.getVisibleSize().height);
        this.world.setScale(scale, scale, 1);
        const previousElapsed = this.simulation.elapsed;
        const idleSceneryDelta = !this.hidden && this.simulation.state === 'ready' ? Math.min(dt, 0.05) : 0;
        if (!this.hidden && this.simulation.state === 'ready') {
            this.idleTime += Math.min(dt, 0.05);
        }
        if (this.armed && (this.simulation.state === 'playing' || this.simulation.state === 'ready')) {
            this.accumulator += Math.min(Math.max(dt, 0), C.maxFrameDelta);
            while (this.accumulator >= C.fixedStep
                && (this.simulation.state === 'playing' || this.simulation.state === 'ready')) {
                this.simulation.step(C.fixedStep);
                this.accumulator -= C.fixedStep;
            }
        } else {
            this.accumulator = 0;
        }
        const simulatedDelta = Math.max(0, this.simulation.elapsed - previousElapsed);
        this.sceneryTime += simulatedDelta > 0 ? simulatedDelta : idleSceneryDelta;
        this.player.setPosition(C.playerX, this.simulation.y);
        if (this.simulation.flapCount !== this.lastFlapCount) {
            this.lastFlapCount = this.simulation.flapCount;
            this.flapFlash = 0.14;
            this.lastFlapTime = this.simulation.elapsed;
        }
        if (this.simulation.state === 'playing') {
            this.flapFlash = Math.max(0, this.flapFlash - dt);
            const targetAngle = Math.max(-32, Math.min(22, this.simulation.velocity / 16));
            this.player.angle += (targetAngle - this.player.angle) * (1 - Math.exp(-10 * dt));
        }
        this.flapGraphics.clear();
        if (this.flapFlash > 0) {
            this.flapGraphics.strokeColor = GOLD;
            this.flapGraphics.lineWidth = 4;
            this.flapGraphics.moveTo(-36, -16);
            this.flapGraphics.lineTo(-61, -26);
            this.flapGraphics.moveTo(-38, 0);
            this.flapGraphics.lineTo(-66, 0);
            this.flapGraphics.stroke();
        }
        this.firstTapHint.node.active = this.armed && this.simulation.state === 'ready';
        this.drawObstacles();
        if (this.simulation.state === 'gameOver' && !this.hidden) this.hitTime = Math.min(0.42, this.hitTime + Math.min(dt, 0.05));
        this.drawPresentation(scale);
        this.scoreLabel.string = `${this.simulation.score} 分`;
        this.statusLabel.string = this.simulation.state === 'ready' ? '风正好，出发吧' : `已穿越 ${this.simulation.score} 组 · ${this.simulation.velocity > 0 ? '踏风而起' : '轻盈滑翔'}`;
        if (this.lastState !== this.simulation.state) {
            if (this.simulation.state === 'paused' || this.simulation.state === 'gameOver') {
                this.flightInput?.clear();
            }
            this.refreshPanel();
            this.lastState = this.simulation.state;
        }
        if (this.simulation.state === 'gameOver') this.refreshPanel();
    }

    private startRun(options: RunOptions = {}): void {
        this.flightInput?.clear();
        this.accumulator = 0;
        this.player.angle = 0;
        this.flapFlash = 0;
        this.lastFlapCount = 0;
        this.idleTime = 0; this.hitTime = 0; this.lastFlapTime = 0;
        this.sceneryTime = 0; this.sceneryTick = -1;
        this.lastScore = 0; this.scoreMoment = -100;
        this.armed = true;
        this.simulation.start(options);
        for (const view of this.obstacleViews) { view.generation = -1; view.motionTick = -1; }
        this.themeLabel.string = `${THEMES[this.simulation.theme].name} · 奇遇`;
        this.background.spriteFrame = this.art.background[this.simulation.theme];
        for (const bank of this.banks) bank.sprite.spriteFrame = this.art.foreground[this.simulation.theme];
        this.drawFrame();
        this.lastState = 'ready';
        this.refreshPanel();
    }

    private onHide(): void {
        this.hidden = true;
        this.flightInput?.clear();
        this.simulation.pause();
        this.accumulator = 0;
        this.refreshPanel();
    }

    private onShow(): void {
        this.hidden = false;
        this.flightInput?.clear();
        this.accumulator = 0;
        this.refreshPanel();
    }

    private refreshPanel(): void {
        const state = this.simulation.state;
        this.panel.active = state === 'paused' || (state === 'gameOver' && this.hitTime >= 0.42) || !this.armed;
        if (state === 'ready') {
            this.panelTitle.string = '风起，出发';
            this.panelCopy.string = '点击起飞，连点保持飞行\n不点击会自然下落\n点击开始后，再点一下起飞';
            this.actionLabel.string = '开始试玩';
        } else if (state === 'paused') {
            this.panelTitle.string = '已暂停';
            this.panelCopy.string = '离开画面时已清除输入\n点击继续后，点按屏幕飞行';
            this.actionLabel.string = '继续飞行';
        } else if (state === 'gameOver') {
            const reasons = { ceiling: '碰到了上边界', floor: '碰到了下边界', obstacle: '碰到了障碍' };
            this.panelTitle.string = '再飞一次';
            this.panelCopy.string = `${this.simulation.failure ? reasons[this.simulation.failure] : ''}\n通过 ${this.simulation.score} 组 · 飞行 ${this.simulation.elapsed.toFixed(1)} 秒\n试试调整点击的节奏`;
            this.actionLabel.string = '重新开始';
        }
    }

    private buildView(): void {
        this.world = this.makeNode('GrayboxWorld', this.node, 750, 1334);
        this.background = this.makeSprite('PaintedBackground', this.world, 800, 1420);
        this.background.spriteFrame = this.art.background.sky;
        for (const near of [false, true]) for (let i = 0; i < 3; i++) {
            const sprite = this.makeSprite(`${near ? 'Near' : 'Mid'}Scenery_${i}`, this.world, 1200, 400);
            sprite.spriteFrame = this.art.foreground.sky;
            sprite.color = new Color(255, 255, 255, near ? 240 : 110);
            this.banks.push({ sprite, index: i, near });
        }
        this.sceneryEffects = this.makeNode('AmbientSceneMotion', this.world, 750, 980).addComponent(Graphics);
        this.frame = this.makeNode('Playfield', this.world, 750, 1334).addComponent(Graphics);
        this.drawFrame();
        this.makeLabel('GameTitle', this.world, GAME_CONFIG.title, 37, 0, 595, INK);
        this.themeLabel = this.makeLabel('PhaseTag', this.world, '神话绘卷 · 点击飞行', 22, -100, 548, INK);
        this.themeLabel.node.getComponent(UITransform)!.setContentSize(360, 40);
        this.scoreLabel = this.makeLabel('Score', this.world, '0 分', 25, 160, 548, INK);
        this.scoreLabel.node.getComponent(UITransform)!.setContentSize(150, 40);
        this.statusLabel = this.makeLabel('FlightStatus', this.world, '', 23, 0, -558, INK);
        this.makeLabel('ControlHint', this.world, '手机点按 / 电脑点击鼠标或轻按空格', 19, 0, -602, INK);
        const pool = this.makeNode('ObstaclePool', this.world, 750, 1334);
        this.obstacleViews = this.simulation.gates.map((gate) => {
            const node = this.makeNode(`ObstaclePair_${gate.slotId}`, pool, 120, 980);
            const graphics = node.addComponent(Graphics);
            const lowerArt = this.makeSprite('LowerArtwork', node, 100, 400);
            const upperArt = this.makeSprite('UpperArtwork', node, 100, 400);
            const effects = this.makeNode('InteriorMotion', node, 120, 980).addComponent(Graphics);
            const lower = this.makeLabel('LowerType', node, '', 18, 0, 0, PAPER);
            const upper = this.makeLabel('UpperType', node, '', 18, 0, 0, PAPER);
            lower.node.active = false; upper.node.active = false;
            for (const label of [lower, upper]) label.node.getComponent(UITransform)!.setContentSize(120, 60);
            node.active = false;
            return { node, graphics, effects, lower, upper, generation: -1, scored: false,
                motionTick: -1, frames: null, lowerArt, upperArt };
        });
        this.touchSurface = this.makeNode('FlightTouchSurface', this.world, 750, C.ceiling - C.floor);
        this.touchSurface.setPosition(0, (C.ceiling + C.floor) / 2);
        this.player = this.makeNode('GrayboxPlayer', this.world, 56, 56);
        const hero = this.player.addComponent(Graphics);
        hero.clear();
        this.heroSprite = this.makeSprite('NezhaArtwork', this.player, HERO_PRESENTATION.displaySize, HERO_PRESENTATION.displaySize);
        this.heroSprite.node.getComponent(UITransform)!.setAnchorPoint(HERO_PRESENTATION.anchor[0], HERO_PRESENTATION.anchor[1]);
        this.heroSprite.spriteFrame = this.art.hero[0];
        this.applyHeroFrame(0);
        this.flapGraphics = this.makeNode('FlapFeedback', this.player, 100, 100).addComponent(Graphics);
        this.firstTapHint = this.makeLabel('FirstTapHint', this.world, '点一下，开始飞行', 26, 0, 115, INK);
        this.firstTapHint.node.active = false;
        this.makeLabel('BoundaryNote', this.world, '穿越一组 +1 分 · 雷光暗下时也要避开', 17, 0, -642, INK);
        this.scorePop = this.makeLabel('ScorePop', this.world, '+1', 35, 0, 0, new Color(255, 223, 139));
        this.scorePop.node.active = false;
        this.impact = this.makeNode('HitBurst', this.world, 200, 200).addComponent(Graphics);
        this.panel = this.makeNode('RunPanel', this.world, 600, 390);
        const panel = this.panel.addComponent(Graphics);
        // Block the panel's entire rectangle, including non-button text and padding.
        this.panel.on(Node.EventType.TOUCH_START, (event: EventTouch) => { event.propagationStopped = true; }, this);
        this.panel.on(Node.EventType.TOUCH_END, (event: EventTouch) => { event.propagationStopped = true; }, this);
        panel.fillColor = new Color(76, 55, 37, 45);
        panel.roundRect(-306, -205, 612, 400, 24); panel.fill();
        panel.fillColor = new Color(255, 249, 230, 248);
        panel.roundRect(-300, -195, 600, 390, 22);
        panel.fill(); panel.lineWidth = 2; panel.strokeColor = GOLD; panel.stroke();
        panel.roundRect(-286, -181, 572, 362, 16); panel.stroke();
        panel.fillColor = GOLD;
        for (const x of [-250, 250]) { panel.circle(x, 140, 5); panel.fill(); }
        this.panelTitle = this.makeLabel('PanelTitle', this.panel, '', 40, 0, 120, INK);
        this.panelCopy = this.makeLabel('PanelDescription', this.panel, '', 23, 0, 20, INK);
        const action = this.makeNode('PrimaryAction', this.panel, 340, 76);
        action.setPosition(0, -115);
        const button = action.addComponent(Graphics);
        button.fillColor = RED; button.roundRect(-170, -38, 340, 76, 28); button.fill();
        button.strokeColor = GOLD; button.lineWidth = 2; button.roundRect(-164, -32, 328, 64, 24); button.stroke();
        this.actionLabel = this.makeLabel('ActionLabel', action, '', 27, 0, 0, PAPER);
        // The label is visual; the parent owns the button's touch target.
        action.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
            event.propagationStopped = true;
            if (this.simulation.state === 'paused') {
                this.hidden = false;
                this.flightInput?.clear(); this.simulation.resume(); this.lastState = 'playing'; this.refreshPanel();
            } else if (this.simulation.state === 'ready' || this.simulation.state === 'gameOver') {
                this.startRun();
            }
        }, this);
        const pause = this.makeNode('PauseAction', this.world, 84, 60);
        pause.setPosition(295, 548);
        const pausePlate = pause.addComponent(Graphics);
        pausePlate.fillColor = new Color(255, 248, 225, 230); pausePlate.roundRect(-42, -26, 84, 52, 20); pausePlate.fill();
        pausePlate.strokeColor = GOLD; pausePlate.lineWidth = 1.5; pausePlate.stroke();
        this.makeLabel('PauseLabel', pause, '暂停', 21, 0, 0, INK);
        pause.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
            event.propagationStopped = true;
            if (this.simulation.state === 'playing') this.onHide();
        }, this);
    }

    private drawObstacles(): void {
        for (const gate of this.simulation.gates) {
            const view = this.obstacleViews[gate.slotId];
            view.node.active = this.armed;
            view.node.setPosition(gate.x, 0);
            const bottomTop = gate.centerY - gate.gapHeight / 2;
            const topBottom = gate.centerY + gate.gapHeight / 2;
            if (view.generation !== gate.generation || view.scored !== gate.scored) {
                if (view.generation !== gate.generation) view.motionTick = -1;
                view.generation = gate.generation;
                view.scored = gate.scored;
                const g = view.graphics;
                g.clear();
                view.lowerArt.spriteFrame = this.art.obstacles[gate.lower];
                view.upperArt.spriteFrame = this.art.obstacles[gate.upper];
                view.lowerArt.node.getComponent(UITransform)!.setContentSize(gate.lowerWidth, bottomTop - C.floor);
                view.upperArt.node.getComponent(UITransform)!.setContentSize(gate.upperWidth, C.ceiling - topBottom);
                view.lowerArt.node.setPosition(0, (C.floor + bottomTop) / 2);
                view.upperArt.node.setPosition(0, (C.ceiling + topBottom) / 2);
                g.lineWidth = 1;
                g.strokeColor = new Color(216, 178, 95, gate.scored ? 0 : 95);
                g.moveTo(gate.width / 2, bottomTop); g.lineTo(gate.width / 2, topBottom); g.stroke();
                view.lower.string = OBSTACLES[gate.lower].name;
                view.upper.string = OBSTACLES[gate.upper].name;
                view.lower.node.setPosition(0, Math.max(C.floor + 28, bottomTop - 108));
                view.upper.node.setPosition(0, Math.min(C.ceiling - 28, topBottom + 108));
            }
            const lower = obstaclePose(gate.lower, gate.lowerWidth, C.floor, bottomTop, 'lower', this.simulation.elapsed, gate.slotId);
            const upper = obstaclePose(gate.upper, gate.upperWidth, topBottom, C.ceiling, 'upper', this.simulation.elapsed, gate.slotId);
            view.lowerArt.node.getComponent(UITransform)!.setContentSize(lower.width, lower.top - lower.bottom);
            view.lowerArt.node.setPosition(lower.offsetX, (lower.top + lower.bottom) / 2);
            view.lowerArt.color = new Color(...lower.tint);
            view.upperArt.node.getComponent(UITransform)!.setContentSize(upper.width, upper.top - upper.bottom);
            view.upperArt.node.setPosition(upper.offsetX, (upper.top + upper.bottom) / 2);
            view.upperArt.color = new Color(...upper.tint);
            // Offscreen effects do not need tessellation; pool nodes are never created here.
            if (!this.armed || Math.abs(gate.x) > 375 + gate.width / 2 + 4) continue;
            const dynamic = OBSTACLES[gate.lower].motion !== 'static' || OBSTACLES[gate.upper].motion !== 'static';
            const tick = Math.floor(this.simulation.elapsed * MOTION_RULES.framesPerSecond);
            if (view.motionTick >= 0 && (!dynamic || view.motionTick === tick)) continue;
            view.motionTick = tick;
            const time = tick / MOTION_RULES.framesPerSecond;
            const lowerFx = obstaclePose(gate.lower, gate.lowerWidth, C.floor, bottomTop, 'lower', time, gate.slotId);
            const upperFx = obstaclePose(gate.upper, gate.upperWidth, topBottom, C.ceiling, 'upper', time, gate.slotId);
            view.frames = {
                lower: sampleRichMotion(gate.lower, lowerFx.width, lowerFx.bottom, lowerFx.top, time, gate.slotId),
                upper: sampleRichMotion(gate.upper, upperFx.width, upperFx.bottom, upperFx.top, time, gate.slotId),
            };
            view.effects.clear();
            drawMotionFrame(view.effects, view.frames.lower, lowerFx.offsetX);
            drawMotionFrame(view.effects, view.frames.upper, upperFx.offsetX);
        }
    }

    private drawFrame(): void {
        const g = this.frame;
        g.clear();
        g.fillColor = new Color(255, 248, 226, this.simulation.theme === 'sky' ? 52 : 36);
        g.rect(-375, C.floor, 750, C.ceiling - C.floor); g.fill();
        g.fillColor = new Color(255, 248, 226, 232);
        g.rect(-375, C.ceiling + 6, 750, 190); g.fill();
        g.rect(-375, -700, 750, 194); g.fill();
        g.fillColor = GOLD;
        g.rect(-375, C.floor - 4, 750, 4); g.rect(-375, C.ceiling, 750, 4); g.fill();
        g.strokeColor = new Color(188, 143, 73, 140); g.lineWidth = 1;
        g.moveTo(-90, 575); g.lineTo(90, 575); g.stroke();
    }

    private drawPresentation(scale: number): void {
        const m = this.simulation;
        const time = this.sceneryTime;
        const height = view.getVisibleSize().height / scale;
        const bgHeight = Math.max(height + 80, (750 / scale + 80) * 1672 / 941);
        this.background.node.getComponent(UITransform)!.setContentSize(bgHeight * 941 / 1672, bgHeight);
        this.background.node.setPosition(Math.sin(time * 0.1) * 18, Math.sin(time * 0.08) * 4);
        for (const bank of this.banks) {
            const width = bank.near ? 1200 : 1700;
            bank.sprite.node.getComponent(UITransform)!.setContentSize(width, width / 3);
            const speed = bank.near ? SCENE_MOTION.nearSpeed : SCENE_MOTION.midSpeed;
            const y = m.theme === 'sky' ? (bank.near ? -500 : 450) : (bank.near ? -540 : -440);
            bank.sprite.node.setPosition((bank.index - 1) * width - (time * speed % width), y + Math.sin(time * 0.5) * (bank.near ? 4 : 7));
        }
        const sceneryTick = Math.floor(time * 20);
        if (sceneryTick !== this.sceneryTick) {
            this.sceneryTick = sceneryTick;
            this.sceneryEffects.clear();
            drawMotionFrame(this.sceneryEffects, sceneMotion(m.theme, sceneryTick / 20));
        }
        if (m.state !== 'paused') {
            this.currentHeroFrame = heroFrame(m.state, m.velocity, m.elapsed, this.idleTime,
                m.elapsed - this.lastFlapTime, this.hitTime);
            this.applyHeroFrame(this.currentHeroFrame);
            this.heroSprite.node.setPosition(0, m.state === 'ready' ? Math.sin(this.idleTime * 3) * 3 : 0);
        }
        // Decorative sparks follow the actor, not its collider.
        if (m.state === 'playing') {
            for (let i = 0; i < 7; i++) {
                const phase = (m.elapsed * 2 + i / 7) % 1;
                this.flapGraphics.fillColor = new Color(255, 203, 91, Math.round((1 - phase) * 140));
                this.flapGraphics.circle(-30 - phase * 60, -28 + Math.sin(i * 2 + time) * 8, 1 + (1 - phase) * 1.6);
                this.flapGraphics.fill();
            }
        }
        if (m.score > this.lastScore) { this.lastScore = m.score; this.scoreMoment = m.elapsed; }
        const scoreAge = m.elapsed - this.scoreMoment;
        this.scorePop.node.active = scoreAge >= 0 && scoreAge < 0.65 && this.armed;
        if (this.scorePop.node.active) {
            this.scorePop.node.setPosition(C.playerX + 72, m.y + 45 + scoreAge * 65);
            this.scorePop.color = new Color(255, 222, 127, Math.round(255 * (1 - scoreAge / 0.65)));
        }
        this.impact.clear();
        if (m.state === 'gameOver' && this.hitTime < 0.42) {
            this.impact.node.setPosition(C.playerX, m.y);
            const progress = this.hitTime / 0.42;
            this.impact.strokeColor = new Color(255, 223, 143, Math.round((1 - progress) * 230));
            this.impact.lineWidth = 3;
            this.impact.circle(0, 0, 30 + progress * 48); this.impact.stroke();
            for (let i = 0; i < 8; i++) {
                const a = i * Math.PI / 4;
                this.impact.fillColor = new Color(255, 206, 95, Math.round((1 - progress) * 240));
                this.impact.circle(Math.cos(a) * (35 + progress * 50), Math.sin(a) * (35 + progress * 50), 3);
                this.impact.fill();
            }
        }
    }

    private makeSprite(name: string, parent: Node, width: number, height: number): Sprite {
        const sprite = this.makeNode(name, parent, width, height).addComponent(Sprite);
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        return sprite;
    }

    private applyHeroFrame(index: number): void {
        const layout = HERO_LAYOUTS[index];
        this.heroSprite.spriteFrame = this.art.hero[index];
        const transform = this.heroSprite.node.getComponent(UITransform)!;
        transform.setContentSize(layout.width, layout.height);
        transform.setAnchorPoint(layout.anchor[0], layout.anchor[1]);
    }

    private makeNode(name: string, parent: Node, width: number, height: number): Node {
        const node = new Node(name);
        node.layer = Layers.Enum.UI_2D;
        parent.addChild(node);
        node.addComponent(UITransform).setContentSize(width, height);
        return node;
    }

    private makeLabel(name: string, parent: Node, text: string, size: number, x: number, y: number, color: Color): Label {
        const node = this.makeNode(name, parent, 650, size * 1.5);
        node.setPosition(x, y);
        const label = node.addComponent(Label);
        label.string = text; label.fontSize = size; label.lineHeight = size * 1.5;
        label.color = color; label.horizontalAlign = Label.HorizontalAlign.CENTER;
        return label;
    }
}
