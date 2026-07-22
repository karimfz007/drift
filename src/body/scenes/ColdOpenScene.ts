/**
 * BODY — the cold open. Charter §I.18 rule 1: no tutorial panel. A title, two lines of
 * situation, and the first tap is also the first instruction.
 */

import { Scene } from 'phaser';
import { COLD_OPEN, WORLD } from '../../data/world';
import { CSS, DEPTH, MOTION, PALETTE, TYPE } from '../theme';
import { grantControl } from '../runtime';

export class ColdOpenScene extends Scene {
    constructor() {
        super('ColdOpen');
    }

    create(): void {
        const cx = WORLD.width / 2;

        this.add
            .rectangle(0, 0, WORLD.width, WORLD.height, PALETTE.night, 1)
            .setOrigin(0)
            .setDepth(DEPTH.terrain);

        //  A cold horizon behind the words, so the card already reads as the place.
        const horizon = this.add.graphics().setDepth(DEPTH.terrain + 1);
        horizon.fillStyle(PALETTE.seaDeep, 1);
        horizon.fillRect(0, WORLD.height * 0.62, WORLD.width, WORLD.height * 0.38);
        horizon.fillStyle(PALETTE.sandWet, 0.35);
        horizon.fillRect(0, WORLD.height * 0.78, WORLD.width, WORLD.height * 0.22);

        const title = this.add
            .text(cx, WORLD.height * 0.34, COLD_OPEN.title, TYPE.title)
            .setOrigin(0.5)
            .setAlpha(0)
            .setDepth(DEPTH.panel);

        const body = this.add
            .text(cx, WORLD.height * 0.46, COLD_OPEN.body, {
                ...TYPE.body,
                align: 'center',
                lineSpacing: 10,
                color: CSS.textDim
            })
            .setOrigin(0.5)
            .setAlpha(0)
            .setDepth(DEPTH.panel);

        const prompt = this.add
            .text(cx, WORLD.height * 0.72, 'Tap to wake', { ...TYPE.label, color: CSS.warm })
            .setOrigin(0.5)
            .setAlpha(0)
            .setDepth(DEPTH.panel);

        this.tweens.add({ targets: title, alpha: 1, duration: 900, delay: 200 });
        this.tweens.add({ targets: body, alpha: 1, duration: 900, delay: 900 });
        this.tweens.add({
            targets: prompt,
            alpha: { from: 0, to: 1 },
            duration: 700,
            delay: 1700,
            onComplete: () => {
                this.tweens.add({
                    targets: prompt,
                    alpha: 0.35,
                    duration: 1100,
                    yoyo: true,
                    repeat: -1
                });
            }
        });

        //  Any tap begins — which is also the gesture that unlocks audio on mobile.
        this.input.once('pointerdown', () => {
            grantControl();
            this.cameras.main.fadeOut(MOTION.panelFade, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Island'));
        });
    }
}
