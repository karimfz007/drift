/**
 * BODY — touch controls: left thumb steers, right thumb looks, a tap reaches out.
 *
 * One pointer handler owns everything, for the same reason Cycle 01 ended up there
 * (D-020): two input paths mean one of them is silently broken on somebody's device.
 * Priority is resolved once, in `onDown`, and never revisited mid-gesture:
 *
 *   1. A press that lands on a wood node or the fire is an interaction, wherever it is.
 *   2. Otherwise, a press in the lower-left is the movement stick.
 *   3. Otherwise, it is the look drag — and if it never really moved, it was a tap.
 *
 * That order is what makes "the wood is behind the joystick" not a trap.
 */

import { TUNE } from '../data/tune';

export interface StickVector {
    x: number;
    y: number;
    /** 0 when idle, up to 1 at full thumb travel. */
    magnitude: number;
}

export interface ControlHandlers {
    /** A press landed on something interactable. Return true to claim the gesture. */
    onPressWorld: (screenX: number, screenY: number) => boolean;
    /** The claimed press ended (or was cancelled). */
    onReleaseWorld: () => void;
    /** A quick press-and-release that was not a drag: reach out at this point. */
    onTap: (screenX: number, screenY: number) => void;
    /** Any input at all — resets the idle-hint timer. */
    onActivity: () => void;
}

const TAP_MAX_MS = 320;
const TAP_MAX_MOVE_PX = 14;

export class Controls {
    private stickPointer: number | null = null;
    private lookPointer: number | null = null;
    private worldPointer: number | null = null;

    private stickOriginX = 0;
    private stickOriginY = 0;
    private stick: StickVector = { x: 0, y: 0, magnitude: 0 };

    private lookLastX = 0;
    private lookLastY = 0;
    private lookDeltaX = 0;
    private lookDeltaY = 0;

    private pressStartedAt = 0;
    private pressStartX = 0;
    private pressStartY = 0;
    private pressMoved = 0;

    private stickBase: HTMLElement;
    private stickKnob: HTMLElement;

    constructor(
        private readonly surface: HTMLElement,
        private readonly overlay: HTMLElement,
        private readonly handlers: ControlHandlers
    ) {
        this.stickBase = document.createElement('div');
        this.stickBase.className = 'stick-base';
        this.stickKnob = document.createElement('div');
        this.stickKnob.className = 'stick-knob';
        this.overlay.appendChild(this.stickBase);
        this.overlay.appendChild(this.stickKnob);
        this.setStickVisible(false);

        surface.addEventListener('pointerdown', this.onDown, { passive: false });
        surface.addEventListener('pointermove', this.onMove, { passive: false });
        surface.addEventListener('pointerup', this.onUp, { passive: false });
        surface.addEventListener('pointercancel', this.onUp, { passive: false });
        surface.addEventListener('pointerleave', this.onUp, { passive: false });
    }

    /** True where the lower-left belongs to the steering thumb. */
    private inStickZone(x: number, y: number): boolean {
        const rect = this.surface.getBoundingClientRect();
        return x - rect.left < rect.width * 0.52 && y - rect.top > rect.height * 0.48;
    }

    private onDown = (event: PointerEvent): void => {
        event.preventDefault();
        this.handlers.onActivity();

        this.pressStartedAt = performance.now();
        this.pressStartX = event.clientX;
        this.pressStartY = event.clientY;
        this.pressMoved = 0;

        //  1. Did the player press something in the world?
        if (this.worldPointer === null && this.handlers.onPressWorld(event.clientX, event.clientY)) {
            this.worldPointer = event.pointerId;
            return;
        }

        //  2. The steering thumb.
        if (this.stickPointer === null && this.inStickZone(event.clientX, event.clientY)) {
            this.stickPointer = event.pointerId;
            this.stickOriginX = event.clientX;
            this.stickOriginY = event.clientY;
            this.moveStickVisual(event.clientX, event.clientY);
            this.setStickVisible(true);
            return;
        }

        //  3. The look drag (which may still turn out to be a tap).
        if (this.lookPointer === null) {
            this.lookPointer = event.pointerId;
            this.lookLastX = event.clientX;
            this.lookLastY = event.clientY;
        }
    };

    private onMove = (event: PointerEvent): void => {
        const dx = event.clientX - this.pressStartX;
        const dy = event.clientY - this.pressStartY;
        this.pressMoved = Math.max(this.pressMoved, Math.hypot(dx, dy));

        if (event.pointerId === this.stickPointer) {
            event.preventDefault();
            this.handlers.onActivity();
            this.updateStick(event.clientX, event.clientY);
            return;
        }

        if (event.pointerId === this.lookPointer) {
            event.preventDefault();
            this.lookDeltaX += event.clientX - this.lookLastX;
            this.lookDeltaY += event.clientY - this.lookLastY;
            this.lookLastX = event.clientX;
            this.lookLastY = event.clientY;
            if (this.pressMoved > TAP_MAX_MOVE_PX) this.handlers.onActivity();
        }
    };

    private onUp = (event: PointerEvent): void => {
        const heldMs = performance.now() - this.pressStartedAt;
        const wasTap = heldMs <= TAP_MAX_MS && this.pressMoved <= TAP_MAX_MOVE_PX;

        if (event.pointerId === this.worldPointer) {
            this.worldPointer = null;
            this.handlers.onReleaseWorld();
            return;
        }

        if (event.pointerId === this.stickPointer) {
            this.stickPointer = null;
            this.stick = { x: 0, y: 0, magnitude: 0 };
            this.setStickVisible(false);
            //  A quick jab in the stick zone was aimed at the world, not at steering.
            if (wasTap) this.handlers.onTap(event.clientX, event.clientY);
            return;
        }

        if (event.pointerId === this.lookPointer) {
            this.lookPointer = null;
            if (wasTap) this.handlers.onTap(event.clientX, event.clientY);
        }
    };

    private updateStick(x: number, y: number): void {
        const dx = x - this.stickOriginX;
        const dy = y - this.stickOriginY;
        const distance = Math.hypot(dx, dy);
        const clamped = Math.min(distance, TUNE.joystickRadius);

        this.moveStickVisual(
            this.stickOriginX + (distance > 0 ? (dx / distance) * clamped : 0),
            this.stickOriginY + (distance > 0 ? (dy / distance) * clamped : 0)
        );

        const normalised = clamped / TUNE.joystickRadius;
        if (normalised < TUNE.joystickDeadzone || distance === 0) {
            this.stick = { x: 0, y: 0, magnitude: 0 };
            return;
        }

        //  Rescale past the deadzone so the first responsive pixel is a slow walk,
        //  not a jump to half speed.
        const magnitude = (normalised - TUNE.joystickDeadzone) / (1 - TUNE.joystickDeadzone);
        this.stick = { x: dx / distance, y: dy / distance, magnitude };
    }

    private moveStickVisual(knobX: number, knobY: number): void {
        this.stickBase.style.transform = `translate(${this.stickOriginX}px, ${this.stickOriginY}px)`;
        this.stickKnob.style.transform = `translate(${knobX}px, ${knobY}px)`;
    }

    private setStickVisible(visible: boolean): void {
        this.stickBase.style.opacity = visible ? '1' : '0';
        this.stickKnob.style.opacity = visible ? '1' : '0';
    }

    /** The steering vector, in screen space: y is "up the screen" = away from the camera. */
    read(): StickVector {
        return this.stick;
    }

    /** Consume the accumulated look drag, in radians. */
    takeLook(sensitivity: number): { yaw: number; pitch: number } {
        const scale = 0.0042 * sensitivity;
        const yaw = this.lookDeltaX * scale;
        const pitch = this.lookDeltaY * scale;
        this.lookDeltaX = 0;
        this.lookDeltaY = 0;
        return { yaw, pitch };
    }

    /** Cancel every in-flight gesture — used when a panel takes the screen. */
    releaseAll(): void {
        this.stickPointer = null;
        this.lookPointer = null;
        if (this.worldPointer !== null) {
            this.worldPointer = null;
            this.handlers.onReleaseWorld();
        }
        this.stick = { x: 0, y: 0, magnitude: 0 };
        this.lookDeltaX = 0;
        this.lookDeltaY = 0;
        this.setStickVisible(false);
    }
}
