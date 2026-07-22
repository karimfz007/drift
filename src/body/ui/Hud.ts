/**
 * BODY — the HUD: warmth, wood, clock.
 *
 * Accessibility baseline (charter §I.18 rule 7): no information by colour alone. The
 * warmth bar carries a number and a word ("warm" / "cold" / "freezing"); the wood count
 * is a number, not a pile; the clock is text.
 */

import { Scene } from 'phaser';
import { TUNE } from '../../data/tune';
import { WORLD } from '../../data/world';
import { formatClock } from '../../brain';
import { CSS, DEPTH, LAYOUT, MOTION, PALETTE, TYPE } from '../theme';

export class Hud {
    private barFill: Phaser.GameObjects.Rectangle;
    private barLabel: Phaser.GameObjects.Text;
    private woodText: Phaser.GameObjects.Text;
    private clockText: Phaser.GameObjects.Text;
    private lastWood = -1;

    constructor(private readonly scene: Scene) {
        const x = 22;
        const y = LAYOUT.hudTop;

        scene.add
            .rectangle(0, 0, WORLD.width, LAYOUT.hudHeight + LAYOUT.hudTop, PALETTE.hudBack, 0.62)
            .setOrigin(0)
            .setDepth(DEPTH.hud);

        scene.add
            .text(x, y + 2, 'WARMTH', { ...TYPE.label, fontSize: '13px' })
            .setDepth(DEPTH.hud + 1);

        scene.add
            .rectangle(x, y + 24, LAYOUT.barWidth, LAYOUT.barHeight, PALETTE.night, 0.85)
            .setOrigin(0)
            .setStrokeStyle(2, PALETTE.hudEdge, 1)
            .setDepth(DEPTH.hud + 1);

        this.barFill = scene.add
            .rectangle(x + 2, y + 26, LAYOUT.barWidth - 4, LAYOUT.barHeight - 4, PALETTE.warm, 1)
            .setOrigin(0)
            .setDepth(DEPTH.hud + 2);

        this.barLabel = scene.add
            .text(x, y + 52, '', { ...TYPE.label, fontSize: '15px' })
            .setDepth(DEPTH.hud + 2);

        this.woodText = scene.add
            .text(WORLD.width - 22, y + 20, 'Wood 0', { ...TYPE.hud, align: 'right' })
            .setOrigin(1, 0)
            .setDepth(DEPTH.hud + 2);

        this.clockText = scene.add
            .text(WORLD.width - 22, y + 48, '18:00', { ...TYPE.label, fontSize: '16px' })
            .setOrigin(1, 0)
            .setDepth(DEPTH.hud + 2);
    }

    update(warmth: number, wood: number, gameHoursElapsed: number, sheltered: boolean): void {
        const ratio = Math.max(0, Math.min(1, warmth / TUNE.warmthMax));
        //  Scale rather than resize: Shape geometry is baked at construction.
        this.barFill.scaleX = ratio;

        const freezing = warmth <= TUNE.warmthLowThreshold;
        this.barFill.fillColor = freezing
            ? PALETTE.danger
            : sheltered
                ? PALETTE.warm
                : PALETTE.cold;

        //  One word, and it must never contradict the bar: warming beats freezing only
        //  once the fire has actually pulled you back off the floor.
        const word = sheltered
            ? freezing ? 'freezing · warming' : 'warming'
            : freezing
                ? 'freezing'
                : warmth >= TUNE.warmthMax - 1
                    ? 'warm'
                    : 'cooling';
        this.barLabel.setText(`${Math.round(warmth)} / ${TUNE.warmthMax} — ${word}`);
        this.barLabel.setColor(freezing ? CSS.danger : sheltered ? CSS.good : CSS.textDim);

        if (wood !== this.lastWood) {
            this.woodText.setText(`Wood ${wood}`);
            if (this.lastWood >= 0 && wood > this.lastWood) this.pulseCount();
            this.lastWood = wood;
        }

        this.clockText.setText(formatClock(gameHoursElapsed));
    }

    /** The count pulse — one of the six grounded feedback beats. */
    private pulseCount(): void {
        this.scene.tweens.add({
            targets: this.woodText,
            scale: { from: 1, to: 1.35 },
            duration: MOTION.countPulse,
            yoyo: true,
            ease: 'Quad.easeOut'
        });
    }
}
