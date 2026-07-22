/**
 * BODY — the overlays: the morning report, the settings sheet, and the one contextual
 * hint. Everything here is dismissable with one thumb and never blocks the game for
 * longer than the player wants it to.
 */

import { Scene } from 'phaser';
import { WORLD } from '../../data/world';
import { registerTap } from './Taps';
import type { ControlMode, MorningReport } from '../../brain';
import { CSS, DEPTH, LAYOUT, MOTION, PALETTE, TYPE } from '../theme';

/** A rounded, tappable slab. Never smaller than the minimum touch target. */
export function makeButton(
    scene: Scene,
    x: number,
    y: number,
    label: string,
    onTap: () => void,
    options: { width?: number; tone?: 'primary' | 'quiet' } = {}
): Phaser.GameObjects.Container {
    const width = Math.max(options.width ?? 210, LAYOUT.touchMin * 2);
    const height = LAYOUT.touchMin;
    const primary = (options.tone ?? 'primary') === 'primary';

    const back = scene.add
        .rectangle(0, 0, width, height, primary ? PALETTE.warm : PALETTE.hudBack, primary ? 0.92 : 0.8)
        .setStrokeStyle(2, primary ? PALETTE.flameHot : PALETTE.hudEdge, 1);

    const text = scene.add
        .text(0, 0, label, { ...TYPE.button, color: primary ? CSS.panel : CSS.text })
        .setOrigin(0.5);

    const container = scene.add.container(x, y, [back, text]).setSize(width, height);

    const unregister = registerTap(scene, {
        bounds: () => {
            const scale = container.scale;
            return {
                x: container.x - (width * scale) / 2,
                y: container.y - (height * scale) / 2,
                width: width * scale,
                height: height * scale
            };
        },
        enabled: () => container.active && container.visible && container.alpha > 0.5,
        onTap: () => {
            scene.tweens.add({ targets: container, scale: container.scale * 0.94, duration: 70, yoyo: true });
            onTap();
        }
    });
    container.once('destroy', unregister);

    return container;
}

/** Dim the world behind a panel so the text is legible over any scene state. */
function scrim(scene: Scene): Phaser.GameObjects.Rectangle {
    return scene.add.rectangle(0, 0, WORLD.width, WORLD.height, PALETTE.night, 0.82).setOrigin(0);
}

export function showMorningReport(
    scene: Scene,
    report: MorningReport,
    onDismiss: () => void
): void {
    const layer = scene.add.container(0, 0).setDepth(DEPTH.panel);
    const cx = WORLD.width / 2;

    layer.add(scrim(scene));

    layer.add(
        scene.add.text(cx, 150, report.title, TYPE.heading).setOrigin(0.5)
    );
    layer.add(
        scene.add
            .text(cx, 186, report.subtitle, { ...TYPE.label, color: CSS.warm })
            .setOrigin(0.5)
    );

    let y = 246;
    for (const line of report.lines) {
        const text = scene.add
            .text(LAYOUT.panelPadding + 6, y, line, {
                ...TYPE.body,
                wordWrap: { width: WORLD.width - (LAYOUT.panelPadding + 6) * 2 },
                lineSpacing: 6
            })
            .setOrigin(0, 0);
        layer.add(text);
        y += text.height + 22;
    }

    let dismissing = false;
    layer.add(
        //  Pinned low regardless of how long the report runs: a thumb should not have to
        //  hunt for the way out, and it lands in the same place every morning.
        makeButton(scene, cx, Math.max(y + 50, WORLD.height - 170), 'Back to the island', () => {
            if (dismissing) return;
            dismissing = true;
            scene.tweens.add({
                targets: layer,
                alpha: 0,
                duration: MOTION.panelFade,
                onComplete: () => {
                    layer.destroy(true);
                    onDismiss();
                }
            });
        })
    );

    layer.setAlpha(0);
    scene.tweens.add({ targets: layer, alpha: 1, duration: MOTION.panelFade });
}

export function showSettings(
    scene: Scene,
    current: ControlMode,
    onPick: (mode: ControlMode) => void,
    onClose: () => void
): void {
    const layer = scene.add.container(0, 0).setDepth(DEPTH.panel);
    const cx = WORLD.width / 2;

    layer.add(scrim(scene));
    layer.add(scene.add.text(cx, 210, 'Controls', TYPE.heading).setOrigin(0.5));
    layer.add(
        scene.add
            .text(cx, 254, 'Both play the same. Only walking differs.', {
                ...TYPE.label,
                align: 'center',
                wordWrap: { width: WORLD.width - 80 }
            })
            .setOrigin(0.5)
    );

    const description = scene.add
        .text(cx, 500, '', {
            ...TYPE.body,
            color: CSS.textDim,
            align: 'center',
            wordWrap: { width: WORLD.width - 90 },
            lineSpacing: 6
        })
        .setOrigin(0.5);
    layer.add(description);

    const describe = (mode: ControlMode) =>
        mode === 'tap'
            ? 'Tap the ground to walk there. Tap wood to go and take it.'
            : 'Hold your left thumb in the lower-left to steer. Your right hand stays free for the wood.';

    let picked = current;
    const buttons: Record<ControlMode, Phaser.GameObjects.Container> = {} as never;

    const paint = () => {
        (['tap', 'joystick'] as ControlMode[]).forEach((mode) => {
            const back = buttons[mode].list[0] as Phaser.GameObjects.Rectangle;
            const text = buttons[mode].list[1] as Phaser.GameObjects.Text;
            const on = mode === picked;
            back.setFillStyle(on ? PALETTE.warm : PALETTE.hudBack, on ? 0.92 : 0.8);
            back.setStrokeStyle(2, on ? PALETTE.flameHot : PALETTE.hudEdge, 1);
            text.setColor(on ? CSS.panel : CSS.text);
        });
        description.setText(describe(picked));
    };

    (['tap', 'joystick'] as ControlMode[]).forEach((mode, index) => {
        const label = mode === 'tap' ? 'Tap to move' : 'Thumb stick';
        const button = makeButton(scene, cx, 330 + index * 78, label, () => {
            picked = mode;
            onPick(mode);
            paint();
        }, { width: 300, tone: 'quiet' });
        buttons[mode] = button;
        layer.add(button);
    });

    paint();

    let closing = false;
    layer.add(
        makeButton(scene, cx, 660, 'Done', () => {
            if (closing) return;
            closing = true;
            scene.tweens.add({
                targets: layer,
                alpha: 0,
                duration: MOTION.panelFade,
                onComplete: () => {
                    layer.destroy(true);
                    onClose();
                }
            });
        })
    );

    layer.setAlpha(0);
    scene.tweens.add({ targets: layer, alpha: 1, duration: MOTION.panelFade });
}

/**
 * The contextual hint. One line, one at a time, never a panel — it appears after
 * idleHintSeconds of nothing happening or after repeated failure, and fades itself out.
 */
export class Hint {
    private text: Phaser.GameObjects.Text;
    private timer?: Phaser.Time.TimerEvent;
    private current = '';

    constructor(private readonly scene: Scene) {
        this.text = scene.add
            .text(WORLD.width / 2, LAYOUT.actionBarY - 74, '', {
                ...TYPE.body,
                color: CSS.warm,
                align: 'center',
                wordWrap: { width: WORLD.width - 70 },
                backgroundColor: 'rgba(12, 20, 32, 0.82)',
                padding: { x: 14, y: 9 }
            })
            .setOrigin(0.5)
            .setDepth(DEPTH.worldUi)
            .setAlpha(0);
    }

    show(message: string, visibleSeconds: number): void {
        if (this.current === message && this.text.alpha > 0) return;
        this.current = message;
        this.text.setText(message);
        this.scene.tweens.add({ targets: this.text, alpha: 1, duration: MOTION.hintFade });

        this.timer?.remove();
        this.timer = this.scene.time.delayedCall(visibleSeconds * 1000, () => this.hide());
    }

    hide(): void {
        this.current = '';
        this.scene.tweens.add({ targets: this.text, alpha: 0, duration: MOTION.hintFade });
    }
}
