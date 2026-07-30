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
            if (target.closest('[data-drink="flask"]')) { e.stopPropagation(); onDrinkFlask(); return; }
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

/**
 * Creates a panel **and schedules its own reveal.**
 *
 * The reveal belongs here, not at the call sites, because a `.panel` is `inset: 0`,
 * `pointer-events: auto` and `opacity: 0` until it gets the `visible` class. A panel that
 * is never revealed is therefore not merely unseen — it is a full-screen invisible sheet
 * that swallows every tap, while the game's own `panelOpen` gate refuses to open anything
 * else (Settings included) and the clock keeps advancing. That is indistinguishable from a
 * total input freeze, and it is exactly what shipped: `showLoadout` was the one panel that
 * forgot the line, so tapping Carried bricked the session (URGENT FIX, 2026-07-27).
 *
 * "Every panel must remember to reveal itself" is the invariant that failed, so the helper
 * that creates panels now owns it. No call site can get it wrong again.
 */
function panel(overlay: HTMLElement, className: string): HTMLElement {
    const element = document.createElement('div');
    element.className = `panel ${className}`;
    overlay.appendChild(element);
    element.addEventListener('pointerdown', (event) => event.stopPropagation());
    requestAnimationFrame(() => element.classList.add('visible'));
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
}

export function showMorningReport(overlay: HTMLElement, report: MorningReport, onDismiss: () => void): void {
    const el = panel(overlay, 'report');
    const lines = report.lines.map((l) => `<p>${l}</p>`).join('');
    el.innerHTML = `<h2>${report.title}</h2><div class="subtitle">${report.subtitle}</div><div class="lines">${lines}</div><button class="primary" type="button">Back to the island</button>`;
    let done = false;
    el.querySelector('button')!.addEventListener('click', () => { if (done) return; done = true; fade(el, onDismiss); });
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
}

/** A material key the Build panel can gate a recipe on (Ch.1 v3, D-055 adds sharpblade). */
type BuildMaterial = 'wood' | 'stone' | 'fiber' | 'sharpblade';

/** One buildable's cost and current holdings, for the Build panel. */
/** Mirrors `GrowthReport` from the brain. This layer renders it and derives nothing. */
export interface GrowthReportView {
    capacities: Array<{ label: string; standing: string; where: string; how: string }>;
    crossings: Array<{ title: string; note: string; achieved: boolean; missing: string | null }>;
    summary: string;
}

export interface BuildItemView {
    have: Partial<Record<BuildMaterial, number>>;
    /** Already built/crafted — the item shows as done, no button. */
    done: boolean;
    /**
     * May this row exist at all (Slice 2B Stage 2b)? Comes straight from `revealedInPanel`;
     * this layer renders the answer and derives nothing. Before the pivot every row was
     * unconditionally present and the panel was a CATALOGUE, answering "what can I build?"
     * before the player had earned the right to ask. After it, the panel is a RECORD.
     */
    revealed: boolean;
}

/** A thought the survivor is having but cannot act on yet — from `panelHints`. */
export interface PanelHintView {
    recipeId: string;
    prompt: string;
}

export interface BuildCardView {
    torch: BuildItemView;
    axe: BuildItemView;
    shelter: BuildItemView;
    storage: BuildItemView;
    /** The stone hammer (Ch.1 v3, D-055) — a fifth, one-time Build-panel entry. */
    stoneHammer: BuildItemView;
    /**
     * The teaching half of the pivot, and the reason subtraction is survivable. An empty
     * panel with no hints is a dead end and a bug report; an empty panel that says *"the dark
     * is closing in, and you are holding something that burns"* is an invitation. Never names
     * a product — `discovery.ts` holds that line and its tests guard it.
     */
    hints: PanelHintView[];
    /** Mending the shelter, or null when it is whole / out of reach / no wood held.
     *  Lives HERE, on the construction surface, rather than on the secondary button —
     *  the first attempt put it there and it displaced Build itself while the player stood
     *  at their own shelter, which is the same one-control-two-verbs disease it was meant
     *  to cure. The Build card already IS the construction surface; nothing is displaced. */
    mendShelter: { durability: number; max: number; gain: number } | null;
    /**
     * F3 — refuge quality made perceivable (Slice 1 item 2). The exposure model was already
     * honest and entirely invisible: warmth drained more slowly under a shelter and the
     * player was told nothing — not the size of the relief, not that standing six metres away
     * had switched it off, not that being soaked had made the night harsher anyway. A hidden
     * number fails the depth-dial test on all three counts at once, because you cannot
     * influence what you cannot perceive. Comes straight from `refugeReport`; this layer
     * renders it and derives nothing.
     */
    refuge: { line: string; working: boolean; reductionPct: number; status: string };
    /** Resting. Always offered — a tired human can lie down anywhere — but it says plainly
     *  whether this will be a night under the roof or a night on the ground. */
    rest: { sheltered: boolean };
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
    //  THE PIVOT (Slice 2B Stage 2b). An unearned thing is not a greyed-out row with a
    //  teasing cost list — that is still a catalogue, just a rude one. It is ABSENT.
    if (!item.revealed) return '';
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
    onClose: () => void,
    onMendShelter: () => void = () => {},
    onSleep: () => void = () => {}
): void {
    const el = panel(overlay, 'build');
    const hintMarkup = view.hints.length
        ? `<div class="build-item hint-item">
             <div class="build-head"><strong>Something is nagging at you</strong></div>
             ${view.hints.map((h) => `<p class="subtitle hint-line" data-hint="${h.recipeId}">${h.prompt}</p>`).join('')}
             <p class="subtitle hint-how">Open your pack and try putting things together.</p>
           </div>`
        : '';
    el.innerHTML = `
        <div class="build-list">
            ${hintMarkup}
            <!--  F3: what the refuge is doing FOR you, and when it is not, why not and what
                  to do about it. Sits at the top of the construction surface because it is
                  the reason to build or mend anything on the list below it.  -->
            <div class="build-item refuge-item ${view.refuge.working ? 'refuge-on' : 'refuge-off'}">
                <div class="build-head">
                    <strong>Shelter${view.refuge.working ? `  ·  −${view.refuge.reductionPct}% cold` : ''}</strong>
                </div>
                <p class="subtitle refuge-line">${view.refuge.line}</p>
            </div>
            <!--  Rest sits FIRST. The card grew past the 412px fold as items were added,
                  and a device probe caught the sleep button rendering below it
                  (inViewport:false) — reachable only by scrolling. The panel is
                  scrollable by D-052's design so nothing was unreachable, but a
                  primary action a tired player is hunting for should not need a
                  scroll to be seen.  -->
            <div class="build-item rest-item">
                <div class="build-head"><strong>${view.rest.sheltered ? 'Sleep in the shelter' : 'Sleep on the ground'}</strong></div>
                <p class="subtitle">${view.rest.sheltered
                    ? 'A roof over you. You will wake properly rested.'
                    : 'No roof, no bedding. You will rest, but not well — and the weather gets at you.'}</p>
                <button class="primary sleep-btn" type="button">${view.rest.sheltered ? 'Sleep' : 'Sleep rough'}</button>
            </div>
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
            ${view.mendShelter ? `
            <div class="build-item mend-item">
                <div class="build-head"><strong>Mend the shelter</strong></div>
                <p class="subtitle">Worn to ${Math.round(view.mendShelter.durability)}/${view.mendShelter.max}. One wood restores ${view.mendShelter.gain}.</p>
                <button class="primary mend-shelter-btn" type="button">Mend  ·  +${view.mendShelter.gain}</button>
            </div>` : ''}
            ${knapMarkup(knap)}
        </div>
        <button class="quiet close-btn" type="button">Close</button>`;
    let done = false;
    const bind = (selector: string, action: () => void) => {
        const btn = el.querySelector(selector);
        btn?.addEventListener('click', () => { if (done) return; done = true; fade(el, action); });
    };
    bind('.mend-shelter-btn', onMendShelter);
    bind('.sleep-btn', onSleep);
    bind('.torch-btn', onCraftTorch);
    bind('.axe-btn', onCraftAxe);
    bind('.shelter-btn', onBuildShelter);
    bind('.storage-btn', onBuildStorage);
    bind('.stonehammer-btn', onCraftStoneHammer);
    bind('.knap-btn', onKnapSharpblade);
    el.querySelector('.close-btn')!.addEventListener('click', () => { if (done) return; done = true; fade(el, onClose); });
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
}

/**
 * The loadout panel's entry point (D-063). **An explicit, labelled button, not a hidden
 * affordance on the inventory row** — the first attempt made the row itself tappable, and
 * the device harness caught two problems with that at once: it reported `occluded` (the
 * row is a bare flex container, so its centre can land on a gap that another overlay owns),
 * and it was undiscoverable anyway, since nothing told the player the row could be tapped.
 * A named button is both reliably hittable and self-explaining.
 */
export function addCarriedButton(overlay: HTMLElement, onOpen: () => void): void {
    const button = document.createElement('button');
    button.className = 'carried-button';
    button.type = 'button';
    button.setAttribute('aria-label', 'Open what you are carrying');
    //  A pack you can see, not a word you have to interpret (URGENT FIX, 2026-07-27). The
    //  director looked for the bag itself and never found it, because the affordance was a
    //  label reading "Carried" — the object it stands for was nowhere on screen. The strap
    //  and body are drawn rather than lettered so it reads as a thing, and the load line
    //  underneath is filled in by `paintBackpackLoad` as the pack fills.
    button.innerHTML = `
        <svg class="pack-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path class="pack-strap" d="M8.5 7.5V6a3.5 3.5 0 0 1 7 0v1.5" fill="none" stroke-width="1.8" stroke-linecap="round"/>
            <rect class="pack-body" x="4.5" y="7.5" width="15" height="13" rx="3.2"/>
            <rect class="pack-flap" x="9.5" y="12" width="5" height="4.2" rx="1.1"/>
        </svg>
        <span class="pack-load"></span>`;
    button.addEventListener('pointerdown', (e) => e.stopPropagation());
    button.addEventListener('click', (e) => { e.stopPropagation(); onOpen(); });
    overlay.appendChild(button);
}

/**
 * Keeps the pack's own readout honest: what it weighs, and whether that is now costing you.
 * Called every frame from the game's HUD update.
 */
let packLoadLabel: HTMLElement | null = null;
let packLoadShown = '';
let packLoadHeavy: boolean | null = null;

export function paintBackpackLoad(overlay: HTMLElement, kg: number, overloaded: boolean): void {
    //  C3 finding D6 on D-065: this runs every frame, so it caches like the rest of the HUD
    //  rather than querying the DOM and writing unconditionally 60 times a second. The p95
    //  frame-time budget is law, and "it is only a querySelector" is how that gets spent.
    if (!packLoadLabel || !packLoadLabel.isConnected) {
        packLoadLabel = overlay.querySelector<HTMLElement>('.carried-button .pack-load');
        packLoadShown = '';
        packLoadHeavy = null;
    }
    if (!packLoadLabel) return;
    const text = `${kg.toFixed(1)} kg`;
    if (text !== packLoadShown) { packLoadLabel.textContent = text; packLoadShown = text; }
    if (overloaded !== packLoadHeavy) { packLoadLabel.classList.toggle('heavy', overloaded); packLoadHeavy = overloaded; }
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

/** Human labels for the six access zones (v0_7 §9, D-063). */
const ZONE_LABEL: Record<string, string> = {
    activeHand: 'Active hand',
    supportHand: 'Support hand',
    belt: 'Belt',
    pocket: 'Pockets',
    backpack: 'Backpack',
    storage: 'Storage'
};

const TOOL_LABEL: Record<string, string> = {
    axe: 'Axe',
    stoneHammer: 'Stone hammer',
    torch: 'Torch',
    flask: 'Flask'
};

const MATERIAL_LABEL: Record<string, string> = {
    wood: 'Wood', stone: 'Stone', fiber: 'Fibre', berries: 'Berries',
    coconut: 'Coconut', shellfish: 'Shellfish', sharpblade: 'Sharp blade'
};

export interface LoadoutPanelView {
    zones: Array<{ zone: string; tools: string[]; materials: Array<{ kind: string; count: number }> }>;
    massKg: number;
    bulk: number;
    storageOpen: boolean;
    /** Which tools can be taken in hand right now, for the equip row (item 2). */
    equippable: string[];
    activeHand: string | null;
    /** True when the panel was opened by tapping the storage box itself, which is the only
     *  place storing, taking and mending are offered — see the storage row below. */
    atStorage: boolean;
    /** What the bulk move will do, named up front, or null when there is nothing to move. */
    storageAction: string | null;
    /** Mend button label, or null when the box does not need (or cannot take) wood. */
    repairLabel: string | null;
    /** Materials the player can try putting together (Try-Combining, D-063 item 4).
     *  Empty when there is nothing to experiment with. */
    combinable: string[];
}

/**
 * The loadout panel (v0_7 §9, D-063): all six access zones, contents plus mass and bulk,
 * and storage inspectable IN PLACE — nothing has to be hauled out to be looked at, which
 * is the C05 note this unparks.
 *
 * Input safety is the caller's (`beginPanel`/`endPanel` in game.ts); this function only
 * draws and reports intent. The close button is the single obvious close action §9 requires.
 */
export function showLoadout(
    overlay: HTMLElement,
    view: LoadoutPanelView,
    onEquip: (tool: string) => void,
    onStow: () => void,
    onClose: () => void,
    onUseStorage: () => void = () => {},
    onRepairStorage: () => void = () => {},
    onTryCombine: (materials: string[]) => void = () => {},
    onGrowth: () => void = () => {}
): void {
    const el = panel(overlay, 'loadout');
    const zoneRows = view.zones.map((z) => {
        const tools = z.tools.map((t) => `<span class="chip tool">${TOOL_LABEL[t] ?? t}</span>`).join('');
        const mats = z.materials.map((m) => `<span class="chip">${MATERIAL_LABEL[m.kind] ?? m.kind} ${m.count}</span>`).join('');
        const body = tools + mats;
        const empty = body ? '' : '<span class="subtitle">empty</span>';
        return `<div class="zone-row"><div class="zone-name">${ZONE_LABEL[z.zone] ?? z.zone}</div><div class="zone-items">${body}${empty}</div></div>`;
    }).join('');

    //  Item 2 (equip/switch), expressed as the hands zone's own control rather than a
    //  separate screen: whatever is chosen here goes to the active hand and is worn.
    const equipRow = view.equippable.length
        ? `<div class="equip-row">${view.equippable.map((t) =>
            `<button class="quiet equip-btn${view.activeHand === t ? ' held' : ''}" data-tool="${t}" type="button">${TOOL_LABEL[t] ?? t}</button>`
          ).join('')}${view.activeHand ? '<button class="quiet stow-btn" type="button">Stow</button>' : ''}</div>`
        : '<p class="subtitle">Nothing to hold yet.</p>';

    //  Opened at the box: the two things you came to do, named, with the contents in view.
    //  Neither is a lottery any more — the tap used to pick one for you and never say which.
    const storageRow = view.atStorage
        ? `<div class="storage-row">${
            view.storageAction ? `<button class="quiet use-storage-btn" type="button">${view.storageAction}</button>` : ''
          }${
            view.repairLabel ? `<button class="quiet repair-btn" type="button">${view.repairLabel}</button>` : ''
          }${
            view.storageAction || view.repairLabel ? '' : '<p class="subtitle">The box is empty, and so are your hands.</p>'
          }</div>`
        : '';

    //  TRY-COMBINING'S ENTRY POINT (director's playtest). D-063 shipped the whole
    //  experimentation brain — relationships, blueprint minting, the null-outcome journal —
    //  and **no way for a player to reach any of it**. The only caller in the body layer was
    //  `runtime.tryCombine`, the DEBUG hook, which is also what every device check drove: a
    //  vacuous device pass of exactly the kind D-066 exists to catch. Third time for this
    //  failure class after the Build button (D-053) and the loadout panel (D-065).
    //
    //  It lives here because this is the panel about what you are carrying, and combining is
    //  a thing you do with what you carry. Pick two, and the button appears.
    const combineRow = view.combinable.length >= 2
        ? `<div class="combine-row">
             <p class="subtitle">Put two to four things together and see what happens.</p>
             <div class="combine-chips">${view.combinable.map((m) =>
                `<button class="quiet combine-chip" data-mat="${m}" type="button">${MATERIAL_LABEL[m] ?? m}</button>`
             ).join('')}</div>
             <button class="primary try-combine-btn" type="button" disabled>Try combining</button>
           </div>`
        : '';

    el.innerHTML = `
        <h2>${view.atStorage ? 'The store box' : 'Carried'}</h2>
        <p class="subtitle load-line">${view.massKg.toFixed(1)} kg · bulk ${view.bulk.toFixed(1)}</p>
        ${storageRow}
        ${equipRow}
        <button class="quiet growth-btn" type="button">What the island has done to you</button>
        ${combineRow}
        <div class="zones">${zoneRows}</div>
        <button class="primary close-btn" type="button">Close</button>`;

    el.querySelectorAll<HTMLButtonElement>('.equip-btn').forEach((b) => {
        b.addEventListener('click', () => { onEquip(b.dataset.tool ?? ''); fade(el, onClose); });
    });
    el.querySelector<HTMLButtonElement>('.stow-btn')?.addEventListener('click', () => { onStow(); fade(el, onClose); });
    el.querySelector<HTMLButtonElement>('.use-storage-btn')?.addEventListener('click', () => { onUseStorage(); fade(el, onClose); });
    el.querySelector<HTMLButtonElement>('.repair-btn')?.addEventListener('click', () => { onRepairStorage(); fade(el, onClose); });
    //  Selection: tap a chip to pick it, tap again to drop it. Two to four, per the crafting
    //  spec's own range — the old hard pair was the discovery probe's arity, not the spec's,
    //  and it left `storage` and `stonehammer` permanently unreachable because wood+stone
    //  always resolved to the shelter. The button stays asleep below two, so the verb can
    //  never fire half-formed.
    const picked: string[] = [];
    const tryBtn = el.querySelector<HTMLButtonElement>('.try-combine-btn');
    el.querySelectorAll<HTMLButtonElement>('.combine-chip').forEach((chip) => {
        chip.addEventListener('click', () => {
            const mat = chip.dataset.mat ?? '';
            const at = picked.indexOf(mat);
            if (at >= 0) { picked.splice(at, 1); chip.classList.remove('picked'); }
            else if (picked.length < TUNE.combineMaxInputs) { picked.push(mat); chip.classList.add('picked'); }
            if (tryBtn) tryBtn.disabled = picked.length < TUNE.combineMinInputs;
        });
    });
    tryBtn?.addEventListener('click', () => { if (picked.length >= TUNE.combineMinInputs) { onTryCombine([...picked]); fade(el, onClose); } });

    el.querySelector<HTMLButtonElement>('.growth-btn')?.addEventListener('click', () => fade(el, onGrowth));
    el.querySelector<HTMLButtonElement>('.close-btn')!.addEventListener('click', () => fade(el, onClose));
}

/**
 * WHAT THE ISLAND HAS DONE TO YOU (director's playtest, FIX 1) — the growth card.
 *
 * Stage B shipped eight capacities and three crossings with no way to see any of them. This
 * is the way. It renders `growthReport` and derives NOTHING: the bands, the sentences and the
 * ordering are all brain-side, where a test can reach them, because the depth-dial admission
 * test is a claim about content and content asserted only by markup is asserted by nobody.
 *
 * NO NUMBERS. The report carries scores for the harness; this panel shows the band. A
 * castaway does not know they are at 34%, and a screen that tells them turns a body into a
 * character sheet — which is the exact thing §12's capacities exist instead of.
 */
export function showGrowthCard(
    overlay: HTMLElement,
    report: GrowthReportView,
    onClose: () => void
): void {
    const el = panel(overlay, 'growth');
    const capacityRows = report.capacities.map((c) => `
        <div class="growth-item standing-${c.standing.replace(/\s+/g, '-')}">
            <div class="build-head"><strong>${c.label}</strong><span class="standing-chip">${c.standing}</span></div>
            <p class="subtitle">${c.where}</p>
            <p class="growth-how">Comes from ${c.how}.</p>
        </div>`).join('');

    //  The crossings sit BELOW the capacities, because they are about what two things
    //  together buy — you cannot read them first and have them mean anything.
    const crossRows = report.crossings.map((x) => `
        <div class="growth-item cross-item ${x.achieved ? 'crossed' : 'not-yet'}">
            <div class="build-head"><strong>${x.title}</strong>${x.achieved ? '<span class="standing-chip good">together</span>' : ''}</div>
            <p class="subtitle">${x.note}</p>
            ${x.missing ? `<p class="growth-how">${x.missing}</p>` : ''}
        </div>`).join('');

    el.innerHTML = `
        <h2>What the island has done to you</h2>
        <p class="subtitle growth-summary">${report.summary}</p>
        <div class="build-list">
            ${capacityRows}
            <div class="growth-divider">Where two things meet</div>
            ${crossRows}
        </div>
        <button class="primary close-btn" type="button">Close</button>`;
    el.querySelector('.close-btn')!.addEventListener('click', () => fade(el, onClose));
}

/**
 * THE RADIAL CIRCLE (Slice 2).
 *
 * Drawn only when the brain says capability has produced a real choice — `tapOpensCircle`.
 * One option is never a wheel; it is just the verb, and the tap performs it. This panel does
 * not decide that, and must not: it renders what `verbsFor` returned and routes the pick.
 *
 * ONE-THUMB REACH is the constraint that shapes the geometry. Segments are laid out on an arc
 * that opens UPWARD AND INWARD from the tap point, never below it and never past the screen
 * edge, because the thumb that just tapped is the thumb that must reach the answer. A wheel
 * centred on the tap would put a third of its options under the hand that is covering them.
 *
 * BLOCKED SEGMENTS ARE SHOWN, greyed, carrying the one true reason — never hidden. Hiding
 * teaches nothing: the player never learns the flask exists. The reason text is the brain's,
 * verbatim, so this layer cannot soften it into a generic apology.
 */
export interface CircleOption {
    id: string;
    label: string;
    available: boolean;
    reason: string | null;
}

export function showVerbCircle(
    overlay: HTMLElement,
    options: CircleOption[],
    atX: number,
    atY: number,
    onPick: (id: string) => void,
    onCancel: () => void,
): void {
    const el = panel(overlay, 'verb-circle');

    //  The arc opens upward and inward. `inward` flips the sweep when the tap is on the right
    //  half, so segments always fall toward the middle of the screen where a thumb can reach.
    const inward = atX > window.innerWidth / 2 ? -1 : 1;
    const radius = Math.min(132, Math.max(96, window.innerHeight * 0.22));
    const spread = Math.PI * 0.72;
    const start = -Math.PI / 2 - (spread / 2) * inward;

    const segs = options.map((o, i) => {
        const t = options.length === 1 ? 0.5 : i / (options.length - 1);
        const angle = start + spread * t * inward;
        const dx = Math.cos(angle) * radius;
        const dy = Math.sin(angle) * radius;
        return `
            <button class="verb-seg ${o.available ? 'ready' : 'blocked'}" type="button"
                    data-verb="${o.id}" ${o.available ? '' : 'disabled'}
                    style="transform: translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)">
                <span class="verb-label">${o.label}</span>
                ${o.reason ? `<span class="verb-reason">${o.reason}</span>` : ''}
            </button>`;
    }).join('');

    //  KEEP THE WHOLE ARC ON SCREEN. The arc opens upward, so a press near the top of the
    //  viewport threw segments off it — the one-thumb-reach check caught exactly that, three
    //  segments outside the screen. The hub is nudged inward until the arc's own bounding box
    //  fits, rather than the arc being shrunk: a smaller wheel would be harder to hit, which
    //  trades one reach problem for another.
    const pad = 62;                       // half a segment (58px) plus breathing room
    const hubX = Math.min(Math.max(atX, radius + pad), window.innerWidth - radius - pad);
    const hubY = Math.min(Math.max(atY, radius + pad), window.innerHeight - pad);
    el.innerHTML = `<div class="verb-hub" style="left:${hubX}px; top:${hubY}px">${segs}</div>`;

    for (const button of Array.from(el.querySelectorAll<HTMLButtonElement>('.verb-seg.ready'))) {
        button.addEventListener('click', () => {
            const id = button.dataset.verb;
            fade(el, () => { if (id) onPick(id); });
        });
    }
    //  A tap anywhere else closes it. Opening a circle must never trap the player — the same
    //  input-safety rule the loadout panel learned the hard way (D-065).
    el.addEventListener('pointerdown', () => fade(el, onCancel));
}
