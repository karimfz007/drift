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
    /** The 5th vital (C05): a slow, full-day rhythm. Shown last — it is the quietest bar,
     *  a soft debuff rather than an urgent pressure. */
    energy: number;
    sheltered: boolean;
    inventory: { wood: number; stone: number; fiber: number; berries: number; coconut: number; shellfish: number };
    tools: { axe: boolean; flask: boolean; flaskSips: number };
    /** Carry load (D-059). Shown as a chip only once past the top band — below that the
     *  system genuinely has no effect and a permanent readout would be noise. Root cause it
     *  addresses: carry weight was not surfaced ANYWHERE in the body layer, so a player had
     *  no way to notice a band change, and past the Heavy threshold nothing changed again
     *  either. Honest-systems: this reports real state, never a scare number. */
    carry: { kg: number; overloaded: boolean };
    gameHoursElapsed: number;
    goal: string;
    action: { label: string; visible: boolean; ready: boolean };
    secondary: { label: string; visible: boolean };
    skills: Skills;
}

export class Hud {
    private root: HTMLElement;
    private bars: Record<'warmth' | 'thirst' | 'hunger' | 'health' | 'energy', { fill: HTMLElement; label: HTMLElement }>;
    private invRow: HTMLElement;
    private clockLabel: HTMLElement;
    private goalLabel: HTMLElement;
    private actionButton: HTMLButtonElement;
    private hintBox: HTMLElement;
    private hintTimer = 0;
    private lastInv = '';

    private secondaryButton!: HTMLButtonElement;

    constructor(
        overlay: HTMLElement,
        onAction: () => void,
        onSecondary: () => void = () => {},
        onEat: (food: 'berries' | 'coconut' | 'shellfish') => void = () => {},
        onDrinkFlask: () => void = () => {}
    ) {
        this.root = document.createElement('div');
        this.root.className = 'hud';
        this.root.innerHTML = `
            <div class="vitals">
                ${vitalMarkup('warmth', 'WARMTH')}
                ${vitalMarkup('thirst', 'THIRST')}
                ${vitalMarkup('hunger', 'HUNGER')}
                ${vitalMarkup('health', 'HEALTH')}
                ${vitalMarkup('energy', 'ENERGY')}
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
        this.bars = { warmth: bar('warmth'), thirst: bar('thirst'), hunger: bar('hunger'), health: bar('health'), energy: bar('energy') };
        this.invRow = this.root.querySelector('.inv') as HTMLElement;
        this.clockLabel = this.root.querySelector('.clock') as HTMLElement;
        this.goalLabel = this.root.querySelector('.goal') as HTMLElement;
        this.actionButton = this.root.querySelector('.action') as HTMLButtonElement;

        this.actionButton.addEventListener('click', (e) => { e.stopPropagation(); onAction(); });
        this.actionButton.addEventListener('pointerdown', (e) => e.stopPropagation());

        this.secondaryButton = this.root.querySelector('.secondary-action') as HTMLButtonElement;
        this.secondaryButton.addEventListener('click', (e) => { e.stopPropagation(); onSecondary(); });
        this.secondaryButton.addEventListener('pointerdown', (e) => e.stopPropagation());

        //  Food chips eat directly — eating is not a world object, so it stays out of the
        //  world-tap model and off the button stack (D-042). One tap on the chip, one bite.
        this.invRow.addEventListener('pointerdown', (e) => e.stopPropagation());
        this.invRow.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            const food = target.closest('[data-food]') as HTMLElement | null;
            if (food) { e.stopPropagation(); onEat(food.dataset.food as 'berries' | 'coconut' | 'shellfish'); return; }
            //  A filled flask is a drink you carry: tap it to sip inland (restores the C03
            //  verb the direct-world model would otherwise have stranded — see D-042 audit).
            if (target.closest('[data-drink="flask"]')) { e.stopPropagation(); onDrinkFlask(); }
        });

        this.hintBox = document.createElement('div');
        this.hintBox.className = 'hint';
        overlay.appendChild(this.hintBox);
    }

    update(v: HudView): void {
        this.paintBar('warmth', v.warmth, TUNE.warmthMax, CSS.warm, TUNE.warmthLowThreshold, v.sheltered ? 'rising' : '');
        this.paintBar('thirst', v.thirst, TUNE.thirstMax, '#5ec6e0', TUNE.thirstLowHintAt, '');
        this.paintBar('hunger', v.hunger, TUNE.hungerMax, '#c9a227', TUNE.hungerLowHintAt, '');
        this.paintBar('health', v.health, TUNE.healthMax, CSS.good, TUNE.healthLowHintAt, '');
        this.paintBar('energy', v.energy, TUNE.energyMax, '#b79ee0', TUNE.energyLowThreshold, '');

        this.clockLabel.textContent = formatClock(v.gameHoursElapsed);
        this.goalLabel.textContent = v.goal;

        this.paintInventory(v);

        this.actionButton.style.display = v.action.visible ? 'block' : 'none';
        this.actionButton.textContent = v.action.label;
        this.actionButton.classList.toggle('ready', v.action.ready);

        this.secondaryButton.style.display = v.secondary.visible ? 'block' : 'none';
        this.secondaryButton.textContent = v.secondary.label;
    }

    private paintBar(k: 'warmth' | 'thirst' | 'hunger' | 'health' | 'energy', value: number, max: number, ok: string, low: number, trend: string): void {
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
            ['flask', v.tools.flask ? (v.tools.flaskSips > 0 ? 'full' : 'empty') : false],
            //  D-059: part of the inventory key so the chip repaints when the load changes,
            //  not only when a stack count does. Rounded to whole kg — the same precision
            //  the vitals labels use, and the number shown is the true carried mass.
            ['carry', v.carry.overloaded ? `over:${Math.round(v.carry.kg)}` : false]
        ];
        const key = JSON.stringify(items);
        if (key === this.lastInv) return;
        this.lastInv = key;

        const label: Record<string, string> = {
            wood: 'Wood', stone: 'Stone', fiber: 'Fibre', berries: 'Berries',
            coconut: 'Coconut', shellfish: 'Shellfish'
        };
        const edible = new Set(['berries', 'coconut', 'shellfish']);
        const chips: string[] = [];
        for (const [name, val] of items) {
            if (name === 'axe') {
                if (val) chips.push(`<span class="chip tool">Axe</span>`);
            } else if (name === 'flask') {
                //  A full flask is tappable (a carried drink); an empty one is just a chip.
                if (val === 'full') chips.push(`<span class="chip tool drink" data-drink="flask" role="button" title="Tap to drink">Flask · full</span>`);
                else if (val) chips.push(`<span class="chip tool">Flask · ${val}</span>`);
            } else if (name === 'carry') {
                //  D-059: only shown once the load is genuinely past the top band, where
                //  extra weight starts costing continuously. Below that the system has no
                //  effect and a permanent readout would be noise.
                if (val) chips.push(`<span class="chip warn" title="Overloaded — slower on foot, and every effort costs more">Overloaded · ${Math.round(v.carry.kg)} kg</span>`);
            } else if (typeof val === 'number' && val > 0) {
                //  Food chips are tappable ("Eat" affordance); materials are plain.
                const eat = edible.has(name) ? ` data-food="${name}" role="button" title="Tap to eat"` : '';
                const cls = edible.has(name) ? 'chip food' : 'chip';
                chips.push(`<span class="${cls}"${eat}>${label[name]} ${val}</span>`);
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

/** A material key the Build panel can gate a recipe on (Ch.1 v3, D-055 adds sharpblade). */
type BuildMaterial = 'wood' | 'stone' | 'fiber' | 'sharpblade';

/** One buildable's cost and current holdings, for the Build panel. */
export interface BuildItemView {
    have: Partial<Record<BuildMaterial, number>>;
    /** Already built/crafted — the item shows as done, no button. */
    done: boolean;
}

export interface BuildCardView {
    torch: BuildItemView;
    axe: BuildItemView;
    shelter: BuildItemView;
    storage: BuildItemView;
    /** The stone hammer (Ch.1 v3, D-055) — a fifth, one-time Build-panel entry. */
    stoneHammer: BuildItemView;
}

/** Knapping (Ch.1 v3, D-055): repeatable, not a one-time build — no "done" state, just a
 *  standing stone-cost gate, shown only once the hammer is owned. */
export interface KnapView {
    owned: boolean;
    stoneHave: number;
    stoneCost: number;
    sharpbladeHave: number;
}

//  When a part is short, say where it comes from — the C03 defect was fibre feeling
//  sourceless (D-040/D-043). A met gate needs no hint; a short one names the source.
const MATERIAL_SOURCE: Record<string, string> = {
    Wood: 'driftwood on the sand, deadfall by the trees',
    Stone: 'grey rock outcrops on the beach',
    Fibre: 'reeds at the pond, or a coconut palm',
    'Sharp blade': 'knap raw stone with a stone hammer, below'
};

function buildItemMarkup(
    title: string,
    subtitle: string,
    item: BuildItemView,
    need: Partial<Record<BuildMaterial, number>>,
    doneLabel: string,
    buttonLabel: string,
    buttonClass: string
): string {
    if (item.done) {
        return `<div class="build-item done"><h2>${title}</h2><p class="subtitle">${doneLabel}</p></div>`;
    }
    const labels: Record<BuildMaterial, string> = { wood: 'Wood', stone: 'Stone', fiber: 'Fibre', sharpblade: 'Sharp blade' };
    const rows = (Object.keys(need) as BuildMaterial[]).map((key) => {
        const n = need[key] ?? 0;
        const h = item.have[key] ?? 0;
        const met = h >= n;
        const label = labels[key];
        const hint = met ? '' : `<div class="gate-hint">from ${MATERIAL_SOURCE[label]}</div>`;
        return `<div class="gate ${met ? 'met' : 'unmet'}"><span>${label}</span><span>${h} / ${n}</span></div>${hint}`;
    }).join('');
    const ready = (Object.keys(need) as BuildMaterial[]).every((key) => (item.have[key] ?? 0) >= (need[key] ?? 0));
    return `
        <div class="build-item">
            <h2>${title}</h2>
            <p class="subtitle">${subtitle}</p>
            <div class="gates">${rows}</div>
            <button class="primary ${buttonClass}" type="button" ${ready ? '' : 'disabled'}>${ready ? buttonLabel : 'Not enough yet'}</button>
        </div>`;
}

/** Knapping's own small markup — repeatable, so never a "done" state like the crafts
 *  above; just a standing gate, shown only once the stone hammer is owned. */
function knapMarkup(view: KnapView): string {
    if (!view.owned) return '';
    const met = view.stoneHave >= view.stoneCost;
    return `
        <div class="build-item knap-item">
            <h2>Knap a sharp blade</h2>
            <p class="subtitle">Turn raw stone into the blade the axe needs. Repeatable.</p>
            <div class="gates"><div class="gate ${met ? 'met' : 'unmet'}"><span>Stone</span><span>${view.stoneHave} / ${view.stoneCost}</span></div></div>
            <p class="subtitle">Sharp blades in hand: ${view.sharpbladeHave}</p>
            <button class="primary knap-btn" type="button" ${met ? '' : 'disabled'}>${met ? 'Knap a blade' : 'Not enough stone'}</button>
        </div>`;
}

/**
 * The Build panel (C05, +stone hammer at Ch.1 v3/D-055): every entry independently
 * gated — a page each, never a shared priority slot (that is exactly the bug class
 * D-040/D-042 fixed once already; a second shared slot here would only invite it back).
 */
export function showBuildCard(
    overlay: HTMLElement,
    view: BuildCardView,
    knap: KnapView,
    onCraftTorch: () => void,
    onCraftAxe: () => void,
    onBuildShelter: () => void,
    onBuildStorage: () => void,
    onCraftStoneHammer: () => void,
    onKnapSharpblade: () => void,
    onClose: () => void
): void {
    const el = panel(overlay, 'build');
    el.innerHTML = `
        <div class="build-list">
            ${buildItemMarkup('Torch', 'Wood and fibre — light it at any active fire.', view.torch,
                { wood: TUNE.torchWoodCost, fiber: TUNE.torchFiberCost }, 'Owned.', 'Make the torch', 'torch-btn')}
            ${buildItemMarkup('Crude axe', 'Gather the parts. Knowledge, this time, is in your hands.', view.axe,
                { wood: TUNE.axeWoodCost, sharpblade: TUNE.axeSharpbladeCost, fiber: TUNE.axeFiberCost }, 'Owned.', 'Make the axe', 'axe-btn')}
            ${buildItemMarkup('Shelter', 'Somewhere to rest — it becomes home.', view.shelter,
                { wood: TUNE.shelterWoodCost, stone: TUNE.shelterStoneCost, fiber: TUNE.shelterFiberCost }, 'Standing.', 'Raise the shelter', 'shelter-btn')}
            ${buildItemMarkup('Storage', 'A second place to keep what you gather.', view.storage,
                { wood: TUNE.storageWoodCost, stone: TUNE.storageStoneCost }, 'Set.', 'Set the crate', 'storage-btn')}
            ${buildItemMarkup('Stone hammer', 'Tier 0. Its one job: knapping stone into a blade, below.', view.stoneHammer,
                { wood: TUNE.stoneHammerWoodCost, stone: TUNE.stoneHammerStoneCost }, 'Owned.', 'Make the hammer', 'stonehammer-btn')}
            ${knapMarkup(knap)}
        </div>
        <button class="quiet close-btn" type="button">Close</button>`;
    let done = false;
    const bind = (selector: string, action: () => void) => {
        const btn = el.querySelector(selector);
        btn?.addEventListener('click', () => { if (done) return; done = true; fade(el, action); });
    };
    bind('.torch-btn', onCraftTorch);
    bind('.axe-btn', onCraftAxe);
    bind('.shelter-btn', onBuildShelter);
    bind('.storage-btn', onBuildStorage);
    bind('.stonehammer-btn', onCraftStoneHammer);
    bind('.knap-btn', onKnapSharpblade);
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

/** First-time identity toast: names a resource the first time it is picked up (D-043). */
export function pickupToast(overlay: HTMLElement, label: string): void {
    const el = document.createElement('div');
    el.className = 'pickup-toast';
    el.innerHTML = `<strong>${label}</strong><br><span>new to your pack</span>`;
    overlay.appendChild(el);
    requestAnimationFrame(() => el.classList.add('visible'));
    window.setTimeout(() => { el.classList.remove('visible'); window.setTimeout(() => el.remove(), 400); }, 2200);
}

export function showSettings(overlay: HTMLElement, testSpeedEnabled: boolean, onToggleTestSpeed: (v: boolean) => void, onClose: () => void, getDebugInfo: () => string): void {
    const el = panel(overlay, 'settings');
    el.innerHTML = `
        <h2>Settings</h2>
        <label class="toggle-row">
            <span>Fast movement (testing)</span>
            <input type="checkbox" class="test-speed">
        </label>
        <p class="subtitle">A test aid, not a gameplay mechanic — off by default.</p>
        <button class="quiet copy-debug" type="button">Copy debug info</button>
        <p class="subtitle debug-copied" hidden>Copied — paste it into a message.</p>
        <button class="primary done" type="button">Done</button>`;
    const testSpeedInput = el.querySelector<HTMLInputElement>('.test-speed')!;
    testSpeedInput.checked = testSpeedEnabled;
    testSpeedInput.addEventListener('change', () => onToggleTestSpeed(testSpeedInput.checked));
    //  Harness-fidelity mandate (C1 ruling, D-050): a report the automated suite never
    //  reproduces needs a way off the director's own phone that isn't "describe it from
    //  memory." This copies the trace, the last 20 taps, and — the number that most often
    //  settles it — how many of each resource kind remain, so a "this tree does nothing"
    //  report can distinguish a real defect from an honestly emptied-out world.
    el.querySelector('.copy-debug')!.addEventListener('click', () => {
        const text = getDebugInfo();
        const shown = el.querySelector<HTMLElement>('.debug-copied')!;
        navigator.clipboard?.writeText(text).then(
            () => { shown.hidden = false; window.setTimeout(() => { shown.hidden = true; }, 3000); },
            () => { shown.textContent = 'Could not copy — check clipboard permission.'; shown.hidden = false; }
        );
    });
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
