/**
 * BODY — the HUD and the overlays, as DOM on top of the canvas (D-032).
 *
 * Text in the DOM is crisp at any device pixel ratio, costs the GPU nothing, wraps and
 * scales with the player's own font settings, and is reachable by a screen reader — all
 * of which the accessibility baseline in §I.18 rule 7 asks for and none of which comes
 * free from text drawn into a 3D scene.
 *
 * The HUD stays deliberately thin: Cycle 02's promise is that the fire lives in the
 * world, not in a UI, so the interface's job is to stay out of the way.
 */

import { formatClock, type MorningReport } from '../brain';
import { TUNE } from '../data/tune';
import { CSS } from './theme';

export class Hud {
    private root: HTMLElement;
    private warmthFill: HTMLElement;
    private warmthLabel: HTMLElement;
    private woodLabel: HTMLElement;
    private clockLabel: HTMLElement;
    private goalLabel: HTMLElement;
    private actionButton: HTMLButtonElement;
    private hintBox: HTMLElement;
    private hintTimer = 0;
    private lastWood = -1;

    constructor(overlay: HTMLElement, onAction: () => void) {
        this.root = document.createElement('div');
        this.root.className = 'hud';
        this.root.innerHTML = `
            <div class="hud-top">
                <div class="vital">
                    <div class="vital-name">WARMTH</div>
                    <div class="vital-bar"><div class="vital-fill"></div></div>
                    <div class="vital-label"></div>
                </div>
                <div class="hud-right">
                    <div class="wood">Wood 0</div>
                    <div class="clock">18:00</div>
                </div>
            </div>
            <div class="hud-bottom">
                <div class="goal"></div>
                <button class="action" type="button"></button>
            </div>`;
        overlay.appendChild(this.root);

        this.warmthFill = this.root.querySelector('.vital-fill') as HTMLElement;
        this.warmthLabel = this.root.querySelector('.vital-label') as HTMLElement;
        this.woodLabel = this.root.querySelector('.wood') as HTMLElement;
        this.clockLabel = this.root.querySelector('.clock') as HTMLElement;
        this.goalLabel = this.root.querySelector('.goal') as HTMLElement;
        this.actionButton = this.root.querySelector('.action') as HTMLButtonElement;

        this.actionButton.addEventListener('click', (event) => {
            event.stopPropagation();
            onAction();
        });
        //  The HUD must never eat a world tap that merely passed over it.
        this.actionButton.addEventListener('pointerdown', (event) => event.stopPropagation());

        this.hintBox = document.createElement('div');
        this.hintBox.className = 'hint';
        overlay.appendChild(this.hintBox);
    }

    update(options: {
        warmth: number;
        wood: number;
        gameHoursElapsed: number;
        sheltered: boolean;
        goal: string;
        action: { label: string; visible: boolean; ready: boolean };
    }): void {
        const ratio = Math.max(0, Math.min(1, options.warmth / TUNE.warmthMax));
        this.warmthFill.style.width = `${ratio * 100}%`;

        const freezing = options.warmth <= TUNE.warmthLowThreshold;
        this.warmthFill.style.background = freezing
            ? CSS.danger
            : options.sheltered
                ? CSS.warm
                : '#74a7d8';

        //  Never a colour alone, and never a word that contradicts the bar.
        const word = options.sheltered
            ? freezing ? 'freezing · warming' : 'warming'
            : freezing
                ? 'freezing'
                : options.warmth >= TUNE.warmthMax - 1
                    ? 'warm'
                    : 'cooling';
        this.warmthLabel.textContent = `${Math.round(options.warmth)} / ${TUNE.warmthMax} — ${word}`;
        this.warmthLabel.style.color = freezing ? CSS.danger : options.sheltered ? CSS.good : CSS.textDim;

        if (options.wood !== this.lastWood) {
            this.woodLabel.textContent = `Wood ${options.wood}`;
            if (this.lastWood >= 0 && options.wood > this.lastWood) {
                this.woodLabel.classList.remove('pulse');
                void this.woodLabel.offsetWidth; // restart the animation
                this.woodLabel.classList.add('pulse');
            }
            this.lastWood = options.wood;
        }

        this.clockLabel.textContent = formatClock(options.gameHoursElapsed);
        this.goalLabel.textContent = options.goal;

        this.actionButton.style.display = options.action.visible ? 'block' : 'none';
        this.actionButton.textContent = options.action.label;
        this.actionButton.classList.toggle('ready', options.action.ready);
    }

    showHint(message: string, seconds: number): void {
        this.hintBox.textContent = message;
        this.hintBox.classList.add('visible');
        window.clearTimeout(this.hintTimer);
        this.hintTimer = window.setTimeout(() => this.hideHint(), seconds * 1000);
    }

    hideHint(): void {
        this.hintBox.classList.remove('visible');
    }
}

// ---- Panels -------------------------------------------------------------

function panel(overlay: HTMLElement, className: string): HTMLElement {
    const element = document.createElement('div');
    element.className = `panel ${className}`;
    overlay.appendChild(element);
    //  A panel swallows every gesture underneath it, so the world cannot be played blind.
    element.addEventListener('pointerdown', (event) => event.stopPropagation());
    return element;
}

export function showColdOpen(
    overlay: HTMLElement,
    title: string,
    body: string,
    onBegin: () => void
): void {
    const element = panel(overlay, 'cold-open');
    element.innerHTML = `
        <h1>${title}</h1>
        <p>${body.replace(/\n/g, '<br>')}</p>
        <button class="primary" type="button">Wake</button>`;
    element.querySelector('button')!.addEventListener('click', () => {
        element.classList.add('leaving');
        window.setTimeout(() => element.remove(), 320);
        onBegin();
    });
    requestAnimationFrame(() => element.classList.add('visible'));
}

export function showMorningReport(
    overlay: HTMLElement,
    report: MorningReport,
    onDismiss: () => void
): void {
    const element = panel(overlay, 'report');
    const lines = report.lines.map((line) => `<p>${line}</p>`).join('');
    element.innerHTML = `
        <h2>${report.title}</h2>
        <div class="subtitle">${report.subtitle}</div>
        <div class="lines">${lines}</div>
        <button class="primary" type="button">Back to the island</button>`;

    let dismissed = false;
    element.querySelector('button')!.addEventListener('click', () => {
        if (dismissed) return;
        dismissed = true;
        element.classList.add('leaving');
        window.setTimeout(() => element.remove(), 320);
        onDismiss();
    });
    requestAnimationFrame(() => element.classList.add('visible'));
}

export function showSettings(
    overlay: HTMLElement,
    current: number,
    onPick: (sensitivity: number) => void,
    onClose: () => void
): void {
    const element = panel(overlay, 'settings');
    element.innerHTML = `
        <h2>Look sensitivity</h2>
        <p class="subtitle">How far the camera swings when you drag.</p>
        <div class="choices">
            <button type="button" data-value="0.6">Gentle</button>
            <button type="button" data-value="1">Standard</button>
            <button type="button" data-value="1.6">Quick</button>
        </div>
        <button class="primary done" type="button">Done</button>`;

    const buttons = [...element.querySelectorAll<HTMLButtonElement>('.choices button')];
    const paint = (value: number) => {
        for (const button of buttons) {
            button.classList.toggle('on', Number(button.dataset.value) === value);
        }
    };
    paint(current);

    for (const button of buttons) {
        button.addEventListener('click', () => {
            const value = Number(button.dataset.value);
            paint(value);
            onPick(value);
        });
    }

    let closed = false;
    element.querySelector('.done')!.addEventListener('click', () => {
        if (closed) return;
        closed = true;
        element.classList.add('leaving');
        window.setTimeout(() => element.remove(), 320);
        onClose();
    });
    requestAnimationFrame(() => element.classList.add('visible'));
}

/** The small persistent button that opens settings. */
export function addSettingsButton(overlay: HTMLElement, onOpen: () => void): void {
    const button = document.createElement('button');
    button.className = 'settings-button';
    button.type = 'button';
    button.textContent = 'Look';
    button.addEventListener('pointerdown', (event) => event.stopPropagation());
    button.addEventListener('click', (event) => {
        event.stopPropagation();
        onOpen();
    });
    overlay.appendChild(button);
}
