/**
 * BODY — the HUD and overlays, as DOM over the canvas (D-032): crisp at any pixel ratio,
 * free for the GPU, and accessible. Cycle 03 adds the three vitals, the carried inventory,
 * the craft card (the four gates made visible), the death overlay, and the level-up beat.
 *
 * It stays as thin as it can: the game's promise is that the world makes the demands, so
 * the interface names them and gets out of the way.
 */

import { formatClock, levelProgress, type MorningReport, type Skills } from '../brain';
import { TUNE } from '../data/tune';
import { CSS } from './theme';

/** A number the HUD reads to paint one vital bar. */
export interface VitalView {
    label: string;
    value: number;
    max: number;
    /** low → danger colour; ok → this colour. */
    okColor: string;
    lowThreshold: number;
}

export interface HudView {
    warmth: number;
    thirst: number;
    hunger: number;
    health: number;
    sheltered: boolean;
    inventory: { wood: number; stone: number; fiber: number; berries: number; coconut: number; shellfish: number };
    tools: { axe: boolean; flask: boolean; flaskSips: number };
    gameHoursElapsed: number;
    goal: string;
    action: { label: string; visible: boolean; ready: boolean };
    secondary: { label: string; visible: boolean };
    skills: Skills;
}

export class Hud {
    private root: HTMLElement;
    private bars: Record<'warmth' | 'thirst' | 'hunger' | 'health', { fill: HTMLElement; label: HTMLElement }>;
    private invRow: HTMLElement;
    private clockLabel: HTMLElement;
    private goalLabel: HTMLElement;
    private actionButton: HTMLButtonElement;
    private hintBox: HTMLElement;
    private hintTimer = 0;
    private lastInv = '';

    private secondaryButton!: HTMLButtonElement;

    constructor(overlay: HTMLElement, onAction: () => void, onSecondary: () => void = () => {}) {
        this.root = document.createElement('div');
        this.root.className = 'hud';
        this.root.innerHTML = `
            <div class="vitals">
                ${vitalMarkup('warmth', 'WARMTH')}
                ${vitalMarkup('thirst', 'THIRST')}
                ${vitalMarkup('hunger', 'HUNGER')}
                ${vitalMarkup('health', 'HEALTH')}
            </div>
            <div class="hud-corner">
                <div class="clock">18:00</div>
            </div>
            <div class="inv"></div>
            <div class="hud-bottom">
                <div class="goal"></div>
                <div class="action-row">
                    <button class="secondary-action" type="button"></button>
                    <button class="action" type="button"></button>
                </div>
            </div>`;
        overlay.appendChild(this.root);

        const bar = (k: string) => ({
            fill: this.root.querySelector(`.v-${k} .vital-fill`) as HTMLElement,
            label: this.root.querySelector(`.v-${k} .vital-label`) as HTMLElement
        });
        this.bars = { warmth: bar('warmth'), thirst: bar('thirst'), hunger: bar('hunger'), health: bar('health') };
        this.invRow = this.root.querySelector('.inv') as HTMLElement;
        this.clockLabel = this.root.querySelector('.clock') as HTMLElement;
        this.goalLabel = this.root.querySelector('.goal') as HTMLElement;
        this.actionButton = this.root.querySelector('.action') as HTMLButtonElement;

        this.actionButton.addEventListener('click', (e) => { e.stopPropagation(); onAction(); });
        this.actionButton.addEventListener('pointerdown', (e) => e.stopPropagation());

        this.secondaryButton = this.root.querySelector('.secondary-action') as HTMLButtonElement;
        this.secondaryButton.addEventListener('click', (e) => { e.stopPropagation(); onSecondary(); });
        this.secondaryButton.addEventListener('pointerdown', (e) => e.stopPropagation());

        this.hintBox = document.createElement('div');
        this.hintBox.className = 'hint';
        overlay.appendChild(this.hintBox);
    }

    update(v: HudView): void {
        this.paintBar('warmth', v.warmth, TUNE.warmthMax, CSS.warm, TUNE.warmthLowThreshold, v.sheltered ? 'rising' : '');
        this.paintBar('thirst', v.thirst, TUNE.thirstMax, '#5ec6e0', TUNE.thirstLowHintAt, '');
        this.paintBar('hunger', v.hunger, TUNE.hungerMax, '#c9a227', TUNE.hungerLowHintAt, '');
        this.paintBar('health', v.health, TUNE.healthMax, CSS.good, TUNE.healthLowHintAt, '');

        this.clockLabel.textContent = formatClock(v.gameHoursElapsed);
        this.goalLabel.textContent = v.goal;

        this.paintInventory(v);

        this.actionButton.style.display = v.action.visible ? 'block' : 'none';
        this.actionButton.textContent = v.action.label;
        this.actionButton.classList.toggle('ready', v.action.ready);

        this.secondaryButton.style.display = v.secondary.visible ? 'block' : 'none';
        this.secondaryButton.textContent = v.secondary.label;
    }

    private paintBar(k: 'warmth' | 'thirst' | 'hunger' | 'health', value: number, max: number, ok: string, low: number, trend: string): void {
        const bar = this.bars[k];
        const ratio = Math.max(0, Math.min(1, value / max));
        bar.fill.style.width = `${ratio * 100}%`;
        const isLow = value <= low;
        bar.fill.style.background = isLow ? CSS.danger : ok;
        const word = isLow ? 'low' : trend || '';
        bar.label.textContent = word ? `${Math.round(value)} · ${word}` : `${Math.round(value)}`;
    }

    private paintInventory(v: HudView): void {
        const items: Array<[string, number | boolean | string]> = [
            ['wood', v.inventory.wood],
            ['stone', v.inventory.stone],
            ['fiber', v.inventory.fiber],
            ['berries', v.inventory.berries],
            ['coconut', v.inventory.coconut],
            ['shellfish', v.inventory.shellfish],
            ['axe', v.tools.axe],
            ['flask', v.tools.flask ? (v.tools.flaskSips > 0 ? 'full' : 'empty') : false]
        ];
        const key = JSON.stringify(items);
        if (key === this.lastInv) return;
        this.lastInv = key;

        const label: Record<string, string> = {
            wood: 'Wood', stone: 'Stone', fiber: 'Fibre', berries: 'Berries',
            coconut: 'Coconut', shellfish: 'Shellfish'
        };
        const chips: string[] = [];
        for (const [name, val] of items) {
            if (name === 'axe') {
                if (val) chips.push(`<span class="chip tool">Axe</span>`);
            } else if (name === 'flask') {
                if (val) chips.push(`<span class="chip tool">Flask · ${val}</span>`);
            } else if (typeof val === 'number' && val > 0) {
                chips.push(`<span class="chip">${label[name]} ${val}</span>`);
            }
        }
        this.invRow.innerHTML = chips.join('');
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

function vitalMarkup(key: string, name: string): string {
    return `<div class="vital v-${key}">
        <div class="vital-name">${name}</div>
        <div class="vital-bar"><div class="vital-fill"></div></div>
        <div class="vital-label"></div>
    </div>`;
}

// ---- Panels -------------------------------------------------------------

function panel(overlay: HTMLElement, className: string): HTMLElement {
    const element = document.createElement('div');
    element.className = `panel ${className}`;
    overlay.appendChild(element);
    element.addEventListener('pointerdown', (event) => event.stopPropagation());
    return element;
}

function fade(element: HTMLElement, then: () => void): void {
    element.classList.add('leaving');
    window.setTimeout(() => { element.remove(); then(); }, 320);
}

export function showColdOpen(overlay: HTMLElement, title: string, body: string, onBegin: () => void): void {
    const el = panel(overlay, 'cold-open');
    el.innerHTML = `<h1>${title}</h1><p>${body.replace(/\n/g, '<br>')}</p><button class="primary" type="button">Wake</button>`;
    el.querySelector('button')!.addEventListener('click', () => fade(el, onBegin));
    requestAnimationFrame(() => el.classList.add('visible'));
}

export function showMorningReport(overlay: HTMLElement, report: MorningReport, onDismiss: () => void): void {
    const el = panel(overlay, 'report');
    const lines = report.lines.map((l) => `<p>${l}</p>`).join('');
    el.innerHTML = `<h2>${report.title}</h2><div class="subtitle">${report.subtitle}</div><div class="lines">${lines}</div><button class="primary" type="button">Back to the island</button>`;
    let done = false;
    el.querySelector('button')!.addEventListener('click', () => { if (done) return; done = true; fade(el, onDismiss); });
    requestAnimationFrame(() => el.classList.add('visible'));
}

/** The death overlay: a plain, one-line cause, and a way back (charter §I.18 rule 3). */
export function showDeath(overlay: HTMLElement, cause: string, deaths: number, onWake: () => void): void {
    const el = panel(overlay, 'death');
    el.innerHTML = `
        <h2>You died of ${cause}.</h2>
        <p class="subtitle">You wash ashore again — everything you made is still yours.</p>
        <p class="death-count">${deaths === 1 ? 'First death.' : `Death #${deaths}.`}</p>
        <button class="primary" type="button">Wake ashore</button>`;
    let done = false;
    el.querySelector('button')!.addEventListener('click', () => { if (done) return; done = true; fade(el, onWake); });
    requestAnimationFrame(() => el.classList.add('visible'));
}

/** The craft card: the four gates shown plainly — what you have, what you still need. */
export function showCraftCard(
    overlay: HTMLElement,
    have: { wood: number; stone: number; fiber: number },
    onCraft: () => void,
    onClose: () => void
): void {
    const el = panel(overlay, 'craft');
    const need = { wood: TUNE.axeWoodCost, stone: TUNE.axeStoneCost, fiber: TUNE.axeFiberCost };
    const row = (name: string, h: number, n: number) =>
        `<div class="gate ${h >= n ? 'met' : 'unmet'}"><span>${name}</span><span>${h} / ${n}</span></div>`;
    const ready = have.wood >= need.wood && have.stone >= need.stone && have.fiber >= need.fiber;
    el.innerHTML = `
        <h2>Crude axe</h2>
        <p class="subtitle">Gather the parts. Knowledge, this time, is in your hands.</p>
        <div class="gates">
            ${row('Wood', have.wood, need.wood)}
            ${row('Stone', have.stone, need.stone)}
            ${row('Fibre', have.fiber, need.fiber)}
        </div>
        <button class="primary craft-btn" type="button" ${ready ? '' : 'disabled'}>${ready ? 'Make the axe' : 'Not enough yet'}</button>
        <button class="quiet close-btn" type="button">Close</button>`;
    let done = false;
    if (ready) {
        el.querySelector('.craft-btn')!.addEventListener('click', () => { if (done) return; done = true; fade(el, onCraft); });
    }
    el.querySelector('.close-btn')!.addEventListener('click', () => { if (done) return; done = true; fade(el, onClose); });
    requestAnimationFrame(() => el.classList.add('visible'));
}

/** A brief toast when a skill levels — mastery, felt (§I.9). */
export function levelToast(overlay: HTMLElement, skill: string, level: number): void {
    const el = document.createElement('div');
    el.className = 'level-toast';
    el.innerHTML = `<strong>${skill}</strong> reached level ${level}<br><span>the work comes easier now</span>`;
    overlay.appendChild(el);
    requestAnimationFrame(() => el.classList.add('visible'));
    window.setTimeout(() => { el.classList.remove('visible'); window.setTimeout(() => el.remove(), 400); }, 2600);
}

export function showSettings(overlay: HTMLElement, current: number, onPick: (v: number) => void, onClose: () => void): void {
    const el = panel(overlay, 'settings');
    el.innerHTML = `
        <h2>Look sensitivity</h2>
        <p class="subtitle">How far the camera swings when you drag.</p>
        <div class="choices">
            <button type="button" data-value="0.6">Gentle</button>
            <button type="button" data-value="1">Standard</button>
            <button type="button" data-value="1.6">Quick</button>
        </div>
        <button class="primary done" type="button">Done</button>`;
    const buttons = [...el.querySelectorAll<HTMLButtonElement>('.choices button')];
    const paint = (value: number) => buttons.forEach((b) => b.classList.toggle('on', Number(b.dataset.value) === value));
    paint(current);
    for (const b of buttons) b.addEventListener('click', () => { const val = Number(b.dataset.value); paint(val); onPick(val); });
    let done = false;
    el.querySelector('.done')!.addEventListener('click', () => { if (done) return; done = true; fade(el, onClose); });
    requestAnimationFrame(() => el.classList.add('visible'));
}

export function addSettingsButton(overlay: HTMLElement, onOpen: () => void): void {
    const button = document.createElement('button');
    button.className = 'settings-button';
    button.type = 'button';
    button.textContent = 'Look';
    button.addEventListener('pointerdown', (e) => e.stopPropagation());
    button.addEventListener('click', (e) => { e.stopPropagation(); onOpen(); });
    overlay.appendChild(button);
}

void levelProgress; // reserved for a later HUD skill meter
