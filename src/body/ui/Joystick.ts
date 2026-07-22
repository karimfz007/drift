/**
 * BODY — the left-thumb virtual joystick (control mode B).
 *
 * It is *floating*: the stick appears wherever the thumb lands inside its zone, so the
 * player never has to find a fixed pad by feel. Locomotion is the only thing that
 * differs between the two control modes — interaction timing is identical in both,
 * which is what makes the director's PLAYTEST comparison a fair one.
 */

import { Scene } from 'phaser';
import { TUNE } from '../../data/tune';
import { DEPTH, LAYOUT, PALETTE, WORLD_HALF } from '../theme';

export interface JoystickVector {
    x: number;
    y: number;
    /** 0 when idle, up to 1 at full thumb travel. */
    magnitude: number;
}

const IDLE: JoystickVector = { x: 0, y: 0, magnitude: 0 };

export class Joystick {
    private base: Phaser.GameObjects.Arc;
    private knob: Phaser.GameObjects.Arc;
    private hint: Phaser.GameObjects.Arc;
    private pointerId: number | null = null;
    private originX = 0;
    private originY = 0;
    private vector: JoystickVector = { ...IDLE };
    private enabled = false;

    constructor(scene: Scene) {
        this.base = scene.add
            .circle(0, 0, TUNE.joystickRadius, PALETTE.hudBack, 0.34)
            .setStrokeStyle(2, PALETTE.hudEdge, 0.85)
            .setDepth(DEPTH.controls)
            .setVisible(false);

        this.knob = scene.add
            .circle(0, 0, TUNE.joystickRadius * 0.42, PALETTE.text, 0.72)
            .setDepth(DEPTH.controls + 1)
            .setVisible(false);

        //  A permanent, faint resting mark so the zone is discoverable without a tutorial.
        this.hint = scene.add
            .circle(WORLD_HALF * 0.55, LAYOUT.joystickRestY, TUNE.joystickRadius * 0.7, PALETTE.text, 0.05)
            .setStrokeStyle(2, PALETTE.hudEdge, 0.5)
            .setDepth(DEPTH.controls)
            .setVisible(false);
    }

    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
        this.hint.setVisible(enabled);
        if (!enabled) this.release();
    }

    /** True if this pointer landed in the joystick's zone and the stick took it. */
    tryClaim(pointer: Phaser.Input.Pointer): boolean {
        if (!this.enabled || this.pointerId !== null) return false;
        if (pointer.x > WORLD_HALF || pointer.y < LAYOUT.joystickZoneTop) return false;

        this.pointerId = pointer.id;
        this.originX = pointer.x;
        this.originY = pointer.y;
        this.hint.setVisible(false);
        this.base.setPosition(this.originX, this.originY).setVisible(true);
        this.knob.setPosition(this.originX, this.originY).setVisible(true);
        return true;
    }

    move(pointer: Phaser.Input.Pointer): void {
        if (this.pointerId !== pointer.id) return;

        const dx = pointer.x - this.originX;
        const dy = pointer.y - this.originY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const clamped = Math.min(distance, TUNE.joystickRadius);

        if (distance > 0) {
            this.knob.setPosition(
                this.originX + (dx / distance) * clamped,
                this.originY + (dy / distance) * clamped
            );
        }

        const normalised = clamped / TUNE.joystickRadius;
        if (normalised < TUNE.joystickDeadzone || distance === 0) {
            this.vector = { ...IDLE };
            return;
        }

        //  Rescale past the deadzone so the first responsive pixel is a slow walk,
        //  not a jump to half speed.
        const magnitude = (normalised - TUNE.joystickDeadzone) / (1 - TUNE.joystickDeadzone);
        this.vector = { x: dx / distance, y: dy / distance, magnitude };
    }

    releaseIf(pointer: Phaser.Input.Pointer): void {
        if (this.pointerId === pointer.id) this.release();
    }

    release(): void {
        this.pointerId = null;
        this.vector = { ...IDLE };
        this.base.setVisible(false);
        this.knob.setVisible(false);
        this.hint.setVisible(this.enabled);
    }

    read(): JoystickVector {
        return this.vector;
    }

    get isActive(): boolean {
        return this.pointerId !== null;
    }

    destroy(): void {
        this.base.destroy();
        this.knob.destroy();
        this.hint.destroy();
    }
}
