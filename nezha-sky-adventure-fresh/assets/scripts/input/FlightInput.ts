import { EventKeyboard, EventTouch, input, Input, KeyCode, Node } from 'cc';

/** One command per new press, scoped to the playfield so UI touches cannot flap. */
export class FlightInput {
    private activeTouch: number | null = null;
    private spaceDown = false;

    public constructor(
        private readonly playfield: Node,
        private readonly onTap: () => void,
        private readonly onCancel: () => void,
    ) {
        playfield.on(Node.EventType.TOUCH_START, this.onStart, this);
        playfield.on(Node.EventType.TOUCH_END, this.onEnd, this);
        playfield.on(Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
        input.on(Input.EventType.TOUCH_END, this.onEnd, this);
        input.on(Input.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
    }

    public clear(): void {
        this.activeTouch = null;
        // Keep the key latch until KEY_UP: clearing a queue must not turn OS repeat
        // events from a held key into fresh presses after resume/restart.
        this.onCancel();
    }

    public dispose(): void {
        this.clear();
        this.playfield.off(Node.EventType.TOUCH_START, this.onStart, this);
        this.playfield.off(Node.EventType.TOUCH_END, this.onEnd, this);
        this.playfield.off(Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
        input.off(Input.EventType.TOUCH_END, this.onEnd, this);
        input.off(Input.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
    }

    private onStart(event: EventTouch): void {
        if (this.activeTouch !== null) return;
        this.activeTouch = event.getID();
        this.onTap();
    }

    private onEnd(event: EventTouch): void {
        if (this.activeTouch !== event.getID()) return;
        this.activeTouch = null;
    }

    private onTouchCancel(event: EventTouch): void {
        if (this.activeTouch !== event.getID()) return;
        this.activeTouch = null;
        this.onCancel();
    }

    private onKeyDown(event: EventKeyboard): void {
        if (event.keyCode !== KeyCode.SPACE || this.spaceDown) return;
        this.spaceDown = true;
        this.onTap();
    }

    private onKeyUp(event: EventKeyboard): void {
        if (event.keyCode !== KeyCode.SPACE) return;
        this.spaceDown = false;
    }
}
