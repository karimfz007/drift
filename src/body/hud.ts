/**
 * BODY — the HUD and overlays, as DOM over the canvas (D-032): crisp at any pixel ratio,
 * free for the GPU, and accessible. Cycle 03 adds the three vitals, the carried inventory,
 * the craft card (the four gates made visible), the death overlay, and the level-up beat.
 *
 * It stays as thin as it can: the game's promise is that the world makes the demands, so
 * the interface names them and gets out of the way.
 */

import { formatClock, levelProgress, type Food, type MorningReport, type RadioPanelView, type ReadoutRow, type Skills } from '../brain';

/** Player-facing names for the shipped skills. */
const SKILL_LABEL: Record<string, string> = { woodcutting: 'Woodcutting', foraging: 'Foraging' };

/**
 * SKILL STANDING, IN WORDS — never the number.
 *
 * The device harness caught this within one run of shipping it: this panel's law is that
 * **not one raw score leaks to the player**, and I printed "Level 3" and "45%" straight into
 * it. The law is not decoration. §12's whole position is that a survivor knows what they can
 * DO, not what integer sits behind it, and the capacities beside these rows have obeyed it
 * since they shipped. A skill is no more entitled to an exception than a capacity is.
 *
 * The BAR still carries the precision — a filled track is a quantity you can see without
 * being told a figure, which is how the vital bars have always worked.
 */
function skillStanding(level: number): string {
    if (level <= 1) return 'new to it';
    if (level === 2) return 'getting the hang of it';
    if (level <= 4) return 'practised';
    if (level <= 6) return 'skilled';
    return 'expert';
}

/** The same rule for progress: a word, not a percentage. */
function progressWord(fraction: number): string {
    if (fraction < 0.2) return 'Barely started';
    if (fraction < 0.5) return 'Some way';
    if (fraction < 0.8) return 'Most of the way';
    return 'Nearly there';
}
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
    inventory: { wood: number; stone: number; fiber: number; berries: number; coconut: number; shellfish: number; meat: number; fish: number };
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
    //  `secondary` IS GONE (ITEM 1, this batch) — the Build door it fed no longer exists.
    //  See `Hud`'s own constructor comment and the ledger entry for the full account.
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

    constructor(
        overlay: HTMLElement,
        onAction: () => void,
        onEat: (food: Food) => void = () => {},
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

        //  LAW 126's GLOBAL BUILD BUTTON WAS RETIRED long before this batch — the element
        //  never existed here even at C05's own peak. What THIS batch retires is what
        //  replaced it: the Backpack's own "make something" door (`onSecondary`/`openMaker`/
        //  `makerEntry`, all removed together) — construction now happens purely through
        //  Combine, which needs no door of its own to open.

        //  Food chips eat directly — eating is not a world object, so it stays out of the
        //  world-tap model and off the button stack (D-042). One tap on the chip, one bite.
        this.invRow.addEventListener('pointerdown', (e) => e.stopPropagation());
        this.invRow.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            const food = target.closest('[data-food]') as HTMLElement | null;
            if (food) { e.stopPropagation(); onEat(food.dataset.food as Food); return; }
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
            //  FISHING — meat and fish are chips because they are FOOD, and until now the
            //  meat had no chip because it had no eat path at all. See `Food` in vitals.ts.
            ['meat', v.inventory.meat],
            ['fish', v.inventory.fish],
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
            coconut: 'Coconut', shellfish: 'Shellfish', meat: 'Meat', fish: 'Fish'
        };
        const edible = new Set(['berries', 'coconut', 'shellfish', 'meat', 'fish']);
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
/**
 * A PANEL IS BORN UNDER THE FINGER THAT OPENED IT, and for 300 ms it must not answer to it.
 *
 * THE DEFECT THIS FIXES, measured rather than reasoned about. Every panel here is
 * `position: absolute; inset: 0` — full screen — and it is created DURING the tap that opens
 * it. The browser then dispatches that same touch's compatibility `click`, and by the time it
 * lands the panel exists underneath it. So the gesture that opened the panel also PRESSES it.
 *
 * A device probe caught it on the backpack: tapping the pack on the survivor's back opened
 * the Backpack, and the trailing click landed on `.growth-btn` — "What the island has taught
 * you" — which sits at that pixel. The panel switched itself to Skills before the player's
 * thumb had left the glass. Two pixels higher and it presses **Build**. The `pointerdown`
 * guard below cannot stop it: the panel did not exist when `pointerdown` fired, so there is
 * nothing to stop propagating — the click is dispatched straight to the new element.
 *
 * That is FIX 5's whole mystery, carried unexplained across many sweeps as "the pack is not
 * tappable". The pack was always tappable. The panel it opened was pressing its own buttons.
 *
 * WHY A CLASS AND NOT AN INLINE STYLE. The first attempt set `pointerEvents = 'none'` on
 * the container and changed nothing: `#ui button { pointer-events: auto }` is more specific,
 * so every button inside stayed hit-testable while the probe's own readout said `pe=none`.
 * The `.arming` rules in `index.html` carry the `#ui` id so they outrank it.
 *
 * WHY `pointer-events` AT ALL, and why it is the right instrument. It blocks HIT-TESTED input — a
 * real finger, a real stray click — and leaves DIRECT DISPATCH alone, so `element.click()`
 * still works. That is exactly the distinction that matters: the stray click is a hit test on
 * a surface the player never aimed at, while a programmatic press is somebody naming the
 * button. It needs no `isTrusted` sniffing and no special case for the harness.
 *
 * THE WINDOW IS THE FADE-IN, not an invented number: `.panel` transitions opacity over 300 ms
 * (`index.html`), so this is precisely "while it is still appearing". A player cannot
 * deliberately press a button that is not yet fully on screen, and a touch that lands there
 * anyway is one they aimed at the world behind it.
 */
function panel(overlay: HTMLElement, className: string): HTMLElement {
    const element = document.createElement('div');
    element.className = `panel ${className} arming`;
    overlay.appendChild(element);
    element.addEventListener('pointerdown', (event) => event.stopPropagation());
    requestAnimationFrame(() => element.classList.add('visible'));
    window.setTimeout(() => element.classList.remove('arming'), TUNE.panelArmDelayMs);
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

/** Mirrors `DeathReview` from the brain. This layer renders it and derives nothing. */
export interface DeathReviewView {
    cause: string;
    chain: string[];
    warnings: string[];
    couldHave: string[];
    lifetime: string;
    legacy: string[];
}

/**
 * THE DEATH OVERLAY — Slice 3. Two beats, in order, on one surface.
 *
 * It used to be one line and a "Wake ashore" button, which was right for a game where you
 * woke up. You do not wake up. So the overlay now does what permadeath obliges it to do:
 * explain the death completely, then hand the player to a different person.
 *
 * THE TWO-BEAT STRUCTURE IS THE DESIGN. The review is read first and dismissed deliberately;
 * only then does the arrival play. Showing them together would blur the one thing this whole
 * slice is about — that the person reading the review and the person on the beach are not the
 * same person. The button between them is the boundary, and it is worth a tap.
 *
 * Every line comes from the brain. This function chooses no words of its own, because a
 * sentence written here would be a claim about game state made by the layer least able to
 * check it — which is how a review starts telling comfortable lies.
 */
export function showDeath(
    overlay: HTMLElement,
    review: DeathReviewView,
    arrival: string[],
    deaths: number,
    onWake: () => void,
): void {
    const el = panel(overlay, 'death');
    const list = (items: string[], cls: string) =>
        items.length === 0 ? '' : `<ul class="${cls}">${items.map((t) => `<li>${t}</li>`).join('')}</ul>`;

    const renderReview = () => {
        el.innerHTML = `
            <h2>${review.cause}</h2>
            <p class="subtitle">${review.lifetime}</p>
            <div class="death-section"><h3>What happened</h3>${list(review.chain, 'death-chain')}</div>
            ${review.warnings.length ? `<div class="death-section"><h3>What you were shown</h3>${list(review.warnings, 'death-warnings')}</div>` : ''}
            ${review.couldHave.length ? `<div class="death-section"><h3>What was in reach</h3>${list(review.couldHave, 'death-couldhave')}</div>` : ''}
            ${review.legacy.length ? `<div class="death-section"><h3>What you leave</h3>${list(review.legacy, 'death-legacy')}</div>` : ''}
            <p class="death-count">${deaths === 1 ? 'The first to die here.' : `The ${ordinal(deaths)} to die here.`}</p>
            <button class="primary" type="button">Go on</button>`;
        el.querySelector('button')!.addEventListener('click', renderArrival, { once: true });
    };

    const renderArrival = () => {
        el.innerHTML = `
            <h2>Someone else</h2>
            ${arrival.map((line) => `<p class="arrival-line">${line}</p>`).join('')}
            <button class="primary" type="button">Get up</button>`;
        let done = false;
        el.querySelector('button')!.addEventListener('click', () => {
            if (done) return; done = true; fade(el, onWake);
        });
    };

    renderReview();
}

function ordinal(n: number): string {
    const suffix = n % 100 >= 11 && n % 100 <= 13 ? 'th'
        : n % 10 === 1 ? 'st' : n % 10 === 2 ? 'nd' : n % 10 === 3 ? 'rd' : 'th';
    return `${n}${suffix}`;
}

/**
 * WHAT A PILE COULD BECOME, as this layer receives it. Mirrors `CombineSlate` from the brain
 * and derives NOTHING.
 *
 * `unknownCount` is an integer and that is the entire Law 95 guarantee: the brain hands over
 * no id, no name and no ordering for an unknown outcome, so this layer cannot leak an identity
 * however carelessly it renders. Do not widen it.
 */
//  `MATERIAL_SOURCE` IS GONE (ITEM 3, this batch) — it existed to answer "where is fibre"
//  for exactly one reader, the known-list's own shortfall line, which is retired with it.
//  See the ledger entry for the full account.

//  `KnownRecipeView` AND THE WHOLE KNOWN-LIST ARE GONE (ITEM 3, this batch — see the
//  ledger). [[RULING 1]]'s own promise was that a demonstrated recipe stays VISIBLE, with
//  its shortfall shown, even unaffordable — a promise about a browsable LIST. This batch
//  removes the list itself: there is no surface left in the game that answers "what do I
//  know" independent of what is in your hands. What replaces it is not a smaller list, it
//  is the slate's own existing answer to a narrower, more honest question — "what does
//  THIS staged pile make" — which is the only question RULING 1's list was ever a proxy
//  for. See the ledger entry for the full account of what that ruling supersedes and why.

export interface CombineSlateView {
    known: Array<{ recipeId: string; name: string }>;
    unknownCount: number;
}

/** Mirrors `GrowthReport` from the brain. This layer renders it and derives nothing. */
export interface GrowthReportView {
    capacities: Array<{ label: string; standing: string; where: string; how: string }>;
    crossings: Array<{ title: string; note: string; achieved: boolean; missing: string | null }>;
    summary: string;
}

/** A thought the survivor is having but cannot act on yet — from `panelHints`. RELOCATED
 *  (item 1, this batch) from the Build panel to the Inventory tab, alongside the combine
 *  row it is actually a nudge toward — see `inventoryBody`. The brain-side mechanism
 *  (`panelHints`, `reveal.ts`) is unchanged; only where it is read from moved. */
export interface PanelHintView {
    recipeId: string;
    prompt: string;
}

//  `BuildItemView`/`BuildCardView` ARE GONE (ITEM 1, this batch). `showBuildCard`'s own
//  render had already been reduced, over several prior sessions, to a hint block and a
//  close button — every row these two interfaces described was computed in `game.ts` and
//  never once read by the template. See the ledger entry for the full audit.



//  `showBuildCard` IS GONE (ITEM 1, this batch). Its own template had been reduced, over
//  [[D-165]]/[[D-172]]/[[D-174]], to a hint block and a close button — every craft row it
//  once drew was retired first and its own `view` fields (`BuildCardView`, removed above)
//  kept being computed in `game.ts` and passed in after the markup that would have used
//  them was already gone. The hint block itself was real, not vestigial — see
//  `inventoryBody`, where `panelHints` now renders using the same classes
//  (`build-item hint-item`, `build-head`, `hint-line`, `hint-how`) this function used, so no
//  test asserting on those classes needed to change shape, only which panel it looks in.

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
    //  ITEM 1, THIRD SYMPTOM — AND IT IS A LABEL DEFECT, NOT THE PREDICATE ONE.
    //
    //  The director reported "a backpack present on a fresh life despite `backpack: false`,
    //  with no code path to true", and measuring it showed exactly that: `tools.backpack` is
    //  false from arrival to fire-lighting, no Backpack row is ever revealed — and a BACKPACK
    //  IS DRAWN IN THE CORNER OF THE SCREEN the whole time. Nothing was wrong with the state.
    //  The picture was lying about it, which is the fourth report on one word.
    //
    //  Both icons ship and the class chooses. Without a pack the survivor is carrying things
    //  the way the backpack recipe itself describes — "Carry properly instead of in your arms"
    //  — so the empty-handed affordance is an ARMFUL, and the pack appears when one is made.
    //  The affordance stays a drawn object rather than a word, which is what the 2026-07-27
    //  fix above was for: that reasoning holds, it was simply drawing the wrong object.
    button.innerHTML = `
        <svg class="pack-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path class="pack-strap" d="M8.5 7.5V6a3.5 3.5 0 0 1 7 0v1.5" fill="none" stroke-width="1.8" stroke-linecap="round"/>
            <rect class="pack-body" x="4.5" y="7.5" width="15" height="13" rx="3.2"/>
            <rect class="pack-flap" x="9.5" y="12" width="5" height="4.2" rx="1.1"/>
        </svg>
        <svg class="arms-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path class="arms-cradle" d="M4 12.5c0 4 3.6 6.5 8 6.5s8-2.5 8-6.5" fill="none" stroke-width="1.8" stroke-linecap="round"/>
            <path class="arms-limb" d="M4 12.5V9M20 12.5V9" fill="none" stroke-width="1.8" stroke-linecap="round"/>
            <rect class="arms-bundle" x="7.5" y="7" width="9" height="6.4" rx="1.6"/>
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
let packHasPackShown: boolean | null = null;

export function paintBackpackLoad(overlay: HTMLElement, kg: number, overloaded: boolean, hasPack: boolean): void {
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
    //  Which object is drawn. Cached like everything else here: this runs every frame, the p95
    //  frame budget is law, and toggling only on change costs nothing.
    if (hasPack !== packHasPackShown) {
        packLoadLabel.closest('.carried-button')?.classList.toggle('has-pack', hasPack);
        packHasPackShown = hasPack;
    }
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
    //  What carrying looks like before there is a pack to carry in — the backpack recipe's
    //  own words for it ("Carry properly instead of in your arms"), and the same correction
    //  [[D-154]] made to the carry ICON. The hub must not name a thing nobody owns.
    arms: 'In your arms',
    backpack: 'Backpack',
    storage: 'Storage'
};

const TOOL_LABEL: Record<string, string> = {
    axe: 'Axe',
    stoneHammer: 'Stone hammer',
    spear: 'Spear',
    backpack: 'Backpack',
    torch: 'Torch',
    flask: 'Flask'
};

export const MATERIAL_LABEL: Record<string, string> = {
    wood: 'Wood', stone: 'Stone', fiber: 'Fibre', berries: 'Berries',
    coconut: 'Coconut', shellfish: 'Shellfish', sharpblade: 'Sharp blade',
    //  THE WRECK SLICE. Named as a survivor would name them, not as cargo manifest entries.
    metal: 'Hull plate', wiring: 'Cable', glass: 'Glass', medicine: 'Medical store', meat: 'Meat',
    //  What a drunk coconut leaves behind. Named for the object, not the recipe it might feed.
    shell: 'Coconut shell', fish: 'Fish',
    //  ITEM 3 (this batch) — the stone hammer, now a real combine chip like anything else.
    stonehammer: 'Stone hammer'
};

export interface LoadoutPanelView {
    /** DROP 6 — what the body knows, derived by `readoutRows`. */
    readout?: ReadoutRow[];
    /** DROP 5 — the receiver, derived by `radioPanelView`. Absent for an older caller.
     *  Note the shape has no send half: see `RadioPanelView`. */
    radio?: RadioPanelView;
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
    /** item 11 — the OTHER act, offered beside it rather than instead of it. A survivor with
     *  full hands and a full box wants both on screen and has only ever been shown one. */
    storageTakeAction: string | null;
    /** Mend button label, or null when the box does not need (or cannot take) wood. */
    repairLabel: string | null;
    /** Materials the player can try putting together (Try-Combining, D-063 item 4).
     *  Empty when there is nothing to experiment with. */
    combinable: string[];
    //  `known`/`selectedKnown` ARE GONE (ITEM 3, this batch). [[RULING 1]]'s list is
    //  retired outright, not merely hidden — see the ledger entry and the comment above
    //  `CombineSlateView` for what answers "what do I know" now instead.
    /** RELOCATED from the Build panel (item 1, this batch) — the discovery-nudge hints
     *  `panelHints` (reveal.ts) produces, rendered in `inventoryBody` now. */
    hints: PanelHintView[];
    /** LAW 126: the Backpack's other two tabs. Both are READ from the brain — this layer
     *  renders them and derives nothing, exactly as the Inventory tab already does. */
    vitals: BodyReportView;
    vitalsExtra?: VitalsExtraView;
    /** Item 4 — the two shipped skills, which this panel never showed. */
    playerSkills?: Skills;
    //  `maker` IS GONE (ITEM 1, this batch) — the Build door it opened no longer exists;
    //  see the ledger entry for the full account of `makerOffers`'s own retirement.
    skills: GrowthReportView;
}

/** Which of Law 126's three primary tabs is showing. There is no fourth, by law. */
export type BackpackTab = 'inventory' | 'vitals' | 'skills';

/** Mirrors `BodyReport` from the brain. */
export interface BodyReportView {
    lines: Array<{ label: string; standing: string; cause: string | null; pressing: boolean }>;
    summary: string;
}

/**
 * The loadout panel (v0_7 §9, D-063): all six access zones, contents plus mass and bulk,
 * and storage inspectable IN PLACE — nothing has to be hauled out to be looked at, which
 * is the C05 note this unparks.
 *
 * Input safety is the caller's (`beginPanel`/`endPanel` in game.ts); this function only
 * draws and reports intent. The close button is the single obvious close action §9 requires.
 */
/**
 * THE BACKPACK HUB (Law 126, Slice 2C Boundary 1).
 *
 * *"The Backpack contains only Inventory, Vitals and Skills as primary tabs."* Two of the
 * three already shipped as separate surfaces — the loadout panel and the growth card — so
 * this unifies them rather than rebuilding them. The Skills tab renders `growthBody`, the
 * very function the standalone card renders, so there is one markup and not two that drift.
 *
 * THE PANEL KEEPS EACH TAB'S OWN CLASS. Showing Inventory it is `panel backpack loadout`;
 * showing Skills it is `panel backpack growth`. That is not a compatibility hack — the panel
 * genuinely IS the loadout surface while showing inventory — and it means the forty-odd
 * existing selectors across the harness and body keep resolving. Renaming them all would
 * have been a large diff whose only product was risk.
 */
const TAB_LABEL: Record<BackpackTab, string> = {
    inventory: 'Inventory', vitals: 'Vitals', skills: 'Skills',
};

function tabBar(active: BackpackTab): string {
    return `<div class="backpack-tabs">${(['inventory', 'vitals', 'skills'] as BackpackTab[])
        .map((t) => `<button class="backpack-tab${t === active ? ' active' : ''}" data-tab="${t}" type="button">${TAB_LABEL[t]}</button>`)
        .join('')}</div>`;
}

/**
 * The Vitals tab. Reads `bodyReport` and renders it — the bars already carry the summary, so
 * what this adds is the CAUSE, which is the part a player can act on.
 */
/** Item 3 — what the Vitals tab now also carries: the wound, and both hands. */
/** The five rungs in the player's words. No severity number ever reaches the screen. */
const ILLNESS_LABEL: Record<string, string> = {
    well: 'Well',
    unsettled: 'Off-colour',
    ailing: 'Sickening',
    feverish: 'Feverish',
    'gravely-ill': 'Gravely ill',
};

export interface VitalsExtraView {
    injuries: { bleeding: number; limp: number; pain: number };
    injuryNote: string | null;
    /** DROP 3 — the illness, on the same surface as the wound and in the same shape. */
    illness: { stage: string; note: string | null };
    /** THE WRECK SLICE — the medical store, offered where the sickness is READ. It works
     *  anywhere, which is the whole payoff of the crossing, so it must not be bound to a
     *  world object the way binding a wound is bound to the shelter. */
    medicine: { held: number; usable: boolean; blocker: string | null };
    /** P0-2 — the bandage, offered where the wound is READ. The verb has existed since Drop 2
     *  and had no surface here: the tab described a walk to the shelter that the rule never
     *  required, and gave no way to act. */
    bandage: { canBind: boolean; blocker: string | null };
    /** WAVE 0 — treated water, carried. Read here because a sip is a thing you do to your
     *  body, and because boiled water is the one drink that follows you inland. */
    water: { note: string | null; canDrink: boolean };
    activeHand: string | null;
    supportHand: string | null;
    equippable: string[];
    /** RULING (C1) — RELOCATED FROM THE BUILD PANEL, same mechanism (`session().sleep()`,
     *  unchanged — it always worked from anywhere; `canSleep` is unconditionally true and
     *  `isShelteredSleep` only ever set the QUALITY, never the possibility). Only the surface
     *  moved: a tired survivor comes here to ask "how am I doing", not to the construction
     *  panel, and the old location was documented as an exception with nowhere else to be —
     *  this is that else. */
    rest: { sheltered: boolean };
    /**
     * RULING (C1) — F3, RELOCATED FROM THE BUILD PANEL, same source (`refugeReport`,
     * unchanged — it already answered gracefully with no shelter built at all: "No shelter.
     * The night takes its full toll..."). An EARLIER ruling had explicitly kept this one
     * reading in Build on purpose ("the pivot removed the catalogue, NOT the panel — the
     * refuge reading survives", SLICE 2B's own words) while everything else controllable
     * left; this ruling overturns that specific keep, on the same reasoning sleep/knap
     * already proved out — a survivor asking "how am I doing tonight" comes here, not to the
     * construction surface, and what a shelter is doing FOR you right now is exactly that
     * question, not a different one. Nothing about the reading changes, only where it lives. */
    refuge: { line: string; working: boolean; reductionPct: number; status: string };
    /** WAVE 1 — found, not crafted, not held in a hand: `salvageTools` is a capability the
     *  tide can wash up (see `shore.ts`'s TOOL fate), and it needed a surface of its own once
     *  it stopped fitting `TOOL_IDS`' hand-equippable shape. This is that surface — the
     *  commitment the fix for `wave0.test.ts`'s HELD-or-MADE invariant made explicit rather
     *  than quietly working around. */
    salvageTools: boolean;
}

function vitalsBody(view: BodyReportView, extra?: VitalsExtraView): string {
    const rows = view.lines.map((l) => `
        <div class="vital-line${l.pressing ? ' pressing' : ''}">
            <div class="build-head"><strong>${l.label}</strong><span class="standing-chip">${l.standing}</span></div>
            ${l.cause ? `<p class="subtitle vital-cause">${l.cause}</p>` : ''}
        </div>`).join('');
    //  ITEM 3 — THE WOUND, SHOWN HERE AND NOT ONLY AS A HUD LINE. The HUD note is one
    //  sentence that appears and passes; this is the place a survivor comes to ask "how bad
    //  is it, actually". Each condition reports its own state in its own units, because
    //  bleeding, a limp and pain are three different problems with three different answers.
    const injuryRows = !extra || (!extra.injuries.bleeding && !extra.injuries.limp && !extra.injuries.pain)
        ? '<div class="vital-line"><div class="build-head"><strong>Injuries</strong><span class="standing-chip">None</span></div></div>'
        : `
        <div class="vital-line pressing">
            <div class="build-head"><strong>Injuries</strong><span class="standing-chip">Hurt</span></div>
            ${extra.injuries.bleeding > 0 ? `
                <p class="subtitle vital-cause">Bleeding. Fibre, wound tight.</p>
                ${extra.bandage.canBind
                    ? '<button class="primary bind-btn" type="button">Bind it</button>'
                    : `<p class="subtitle vital-cause">${extra.bandage.blocker ?? 'Nothing to bind it with.'}</p>`}` : ''}
            ${extra.injuries.limp > 0 ? `<p class="subtitle vital-cause">Limping — about ${Math.ceil(extra.injuries.limp)} more hour(s).</p>` : ''}
            ${extra.injuries.pain > 0 ? '<p class="subtitle vital-cause">In pain — every job is costing you more.</p>' : ''}
        </div>`;

    //  DROP 3 — SICKNESS, beside the wound rather than anywhere new. A survivor asking
    //  'how bad is it' means both, and the standing chip carries the rung by NAME so the
    //  five-stage grammar is legible here and not only in the passing HUD line. No
    //  severity number reaches the screen: the stage word and the cause sentence are the
    //  whole readout, exactly as the growth panel's standings are.
    const illnessRow = !extra ? '' : extra.illness.stage === 'well'
        ? '<div class="vital-line"><div class="build-head"><strong>Sickness</strong><span class="standing-chip">Well</span></div></div>'
        : `
        <div class="vital-line pressing">
            <div class="build-head"><strong>Sickness</strong><span class="standing-chip">${ILLNESS_LABEL[extra.illness.stage] ?? extra.illness.stage}</span></div>
            ${extra.illness.note ? `<p class="subtitle vital-cause">${extra.illness.note}</p>` : ''}
            ${extra.medicine.held > 0 ? `
                <p class="subtitle">Medical store: ${extra.medicine.held} — salvaged from the wreck.</p>
                <button class="primary medicine-btn" type="button" ${extra.medicine.usable ? '' : 'disabled'}>${extra.medicine.usable ? 'Take the medicine' : (extra.medicine.blocker ?? 'Not now')}</button>` : ''}
        </div>`;

    //  WAVE 0 — WHAT YOU ARE CARRYING TO DRINK, and whether it is safe. Untreated water says
    //  so; boiled water offers the sip. The row is absent entirely when there is no vessel,
    //  because a survivor who has made nothing should not read an empty slot.
    const waterRow = !extra || extra.water.note === null ? '' : `
        <div class="vital-line${extra.water.canDrink ? '' : ' pressing'}">
            <div class="build-head"><strong>Water</strong></div>
            <p class="subtitle vital-cause">${extra.water.note}</p>
            ${extra.water.canDrink ? '<button class="primary drink-clean-btn" type="button">Drink it</button>' : ''}
        </div>`;

    //  BOTH HANDS, equippable from here. Reuses the shipped carriage mechanism rather than a
    //  second one: `equipToActiveHand` / `equipToSupportHand` enforce the same rules,
    //  including the two-handed constraint that is why `supportHand` is modelled at all.
    const handRows = !extra ? '' : `
        <div class="vital-line">
            <div class="build-head"><strong>Hands</strong><span class="standing-chip">L: ${extra.supportHand ?? 'empty'} · R: ${extra.activeHand ?? 'empty'}</span></div>
            ${extra.equippable.length === 0 ? '<p class="subtitle vital-cause">Nothing made yet to hold.</p>' : `
            <div class="hand-chips">${extra.equippable.map((t) => `
                <button class="quiet hand-chip" data-hand="left" data-tool="${t}" type="button">L: ${t}</button>
                <button class="quiet hand-chip" data-hand="right" data-tool="${t}" type="button">R: ${t}</button>`).join('')}</div>`}
        </div>`;

    //  THE MEDICAL STORE SITS FIRST WHEN THERE IS ONE TO TAKE — D-053's precedent, applied
    //  to the surface an ill survivor actually comes to.
    //
    //  Rest was hoisted to the top of the Build panel for exactly this reason: the card grew
    //  past the 412 px fold and a device probe found the sleep button rendering below it,
    //  reachable only by scrolling. The panels are scrollable by [[D-052]]'s design so nothing
    //  was unreachable — but *"a primary action a tired player is hunting for should not need
    //  a scroll to be seen"*. `WRECK 6` has been red since [[D-125]] reading `off-screen`,
    //  left red on purpose because whether a medical store is that kind of action was a
    //  design call rather than the builder's. It has now been ruled: it is. Illness is a real
    //  and sometimes urgent system, and an ill survivor hunting for their medicine is that
    //  player exactly.
    //
    //  CONDITIONAL, and the condition is the action. The row leads only while the sickness is
    //  PRESSING — while there is something to do about it. A survivor who is well reads their
    //  body in its natural order and is not greeted by a Sickness heading saying "Well". So
    //  this hoists an ACTION to where it can be seen, which is what the precedent did; it
    //  does not reorder a readout.
    const illnessLeads = Boolean(extra) && extra!.illness.stage !== 'well';

    //  RULING (C1) — F3, RELOCATED FROM THE BUILD PANEL. Same classes, same wording, same
    //  source (`refugeReport`) as the row it replaces — see `VitalsExtraView.refuge`'s own
    //  doc for why this specific reading was an EXPLICIT earlier keep, now overturned rather
    //  than an oversight caught. Placed just above Rest: both are "the shelter and the
    //  night", read together — what it is doing for you, and what to do about the night
    //  itself.
    const refugeRow = !extra ? '' : `
        <div class="vital-line refuge-item ${extra.refuge.working ? 'refuge-on' : 'refuge-off'}">
            <div class="build-head"><strong>Shelter${extra.refuge.working ? `  ·  −${extra.refuge.reductionPct}% cold` : ''}</strong></div>
            <p class="subtitle refuge-line">${extra.refuge.line}</p>
        </div>`;

    //  RULING (C1) — REST, RELOCATED FROM THE BUILD PANEL. Same wording as the row it
    //  replaces, so nothing a returning player learned to read stops being true; only where
    //  they go to read it changed. Not marked `pressing`: sleep is always available (`canSleep`
    //  is unconditionally true), so this is an ordinary action row like Hands, not an alert
    //  like Injuries or Sickness — there is nothing wrong here to flag.
    const restRow = !extra ? '' : `
        <div class="vital-line">
            <div class="build-head"><strong>${extra.rest.sheltered ? 'Sleep in the shelter' : 'Sleep on the ground'}</strong></div>
            <p class="subtitle">${extra.rest.sheltered
                ? 'A roof over you. You will wake properly rested.'
                : 'No roof, no bedding. You will rest, but not well — and the weather gets at you.'}</p>
            <button class="primary sleep-btn" type="button">${extra.rest.sheltered ? 'Sleep' : 'Sleep rough'}</button>
        </div>`;

    //  WAVE 1 — A FOUND CAPABILITY, READ HERE RATHER THAN IN A HAND SLOT. Shown always, not
    //  only once found: a survivor who has never seen this row would have no way to know it
    //  was a thing the tide could bring, the same reasoning `handRows` shows an honest
    //  "nothing made yet" rather than disappearing entirely.
    const salvageToolsRow = !extra ? '' : `
        <div class="vital-line">
            <div class="build-head"><strong>Salvage tools</strong><span class="standing-chip">${extra.salvageTools ? 'Found' : 'Not found'}</span></div>
            <p class="subtitle vital-cause">${extra.salvageTools
                ? 'A file, a pry bar, a length of good line — enough to work heavier salvage properly.'
                : 'Nothing yet for serious teardown work. The tide sometimes brings a real tool ashore.'}</p>
        </div>`;

    return `
        <h2>How you are</h2>
        <p class="subtitle vitals-summary">${view.summary}</p>
        <div class="build-list">${illnessLeads ? illnessRow : ''}${rows}${injuryRows}${illnessLeads ? '' : illnessRow}${waterRow}${handRows}${salvageToolsRow}${refugeRow}${restRow}</div>`;
}

export function showLoadout(
    overlay: HTMLElement,
    view: LoadoutPanelView,
    onEquip: (tool: string) => void,
    onStow: () => void,
    onClose: () => void,
    onUseStorage: () => void = () => {},
    onRepairStorage: () => void = () => {},
    //  THE REDESIGN'S THREE CALLBACKS, replacing `onTryCombine`. `onSlate` is a pure READ —
    //  what could this pile become — and the other two are the commits, one per intention.
    onSlate: (materials: string[]) => CombineSlateView = () => ({ known: [], unknownCount: 0 }),
    onCombine: (materials: string[], recipeId: string) => void = () => {},
    onDiscover: (materials: string[]) => void = () => {},
    onDrop: (material: string) => void = () => {},
    onEquipHand: (tool: string, hand: 'left' | 'right') => void = () => {},
    /** THE WRECK SLICE — spend one salvaged medical store. Defaulted like every optional
     *  handler here, so an older call site cannot fail to compile. */
    onTakeMedicine: () => void = () => {},
    onPreview: (materials: string[]) => string | null = () => null,
    //  `onGrowth` is gone: the growth card is a TAB now, not a separate surface, so the
    //  shortcut switches tabs rather than opening one. Retiring the parameter rather than
    //  leaving it inert — a hook nothing calls is the next reader's false lead.
    tab: BackpackTab = 'inventory',
    onTab: (next: BackpackTab) => void = () => {},
    //  `onMake` IS GONE (ITEM 1, this batch) — the Build panel it opened no longer exists.
    //  A genuinely removed MIDDLE parameter, not an appended one — every positional
    //  argument after it shifts, and the call site (game.ts) was rewritten in the same
    //  edit rather than left to drift, per this file's own "grows safely at its tail" rule
    //  for what removal does NOT get to skip.
    //  DROP 5 — appended at the END, like every optional handler here, so no existing
    //  positional call site shifts. Inserting them mid-list broke two of them at once.
    /** Toggle the receiver. There is no send counterpart, by design. */
    onListen: () => void = () => {},
    onLogSignal: (signalId: string) => void = () => {},
    //  P0-2 — bind the wound from where it is READ. Appended at the END of this positional
    //  list on purpose: inserting it beside `onTakeMedicine`, where it belongs by subject,
    //  silently shifted every later argument by one and handed `onPreview`'s function to a
    //  `() => void` slot. A long positional signature only grows safely at its tail.
    onBindWound: () => void = () => {},
    /** WAVE 0 — drink the water you treated. Appended at the tail, as `onBindWound` was. */
    onDrinkClean: () => void = () => {},
    /** RULING (C1) — sleep, relocated from the Build panel. Appended at the tail, as every
     *  optional handler here has been since P0-2 found the cost of doing otherwise. */
    onSleep: () => void = () => {},
    //  `onSelectKnown` IS GONE (ITEM 3, this batch) — the known-list row it expanded no
    //  longer exists. See the ledger entry; the call site shift is the same "rewritten, not
    //  drifted" discipline `onMake`'s own removal note above states.
    //  RULING (C1), this batch — EVERY RECIPE IS BUILT BY STAGING IN COMBINE, KNAP INCLUDED.
    //  `onKnapSharpblade` (a direct-tap action bypassing staging entirely, the ONE remaining
    //  violation of that rule — every other known-list entry already staged its materials)
    //  is retired with it; knapping now succeeds through the SAME `onCombine` path as
    //  everything else, once `stone` is staged and the slate shows "Knapped blade" as a
    //  known option — see `experiment.ts`'s own `canExperimentWith` for the narrow arity-1
    //  exception this shape needed to be reachable there at all.
    //
    //  `onCanAttempt` REPLACES the hardcoded "two or more picked" floor `redraw` used to
    //  enforce locally: that floor is correct for ordinary combining but was ALSO the thing
    //  standing between knap and a real staging path (its own recipe has one slot, not two).
    //  Delegating to the brain's own `canExperimentWith` — the exact function that gates the
    //  real attempt — means this can never drift from what the attempt itself would allow;
    //  two copies of one rule, checked separately, is the destroy-gap bug this project keeps
    //  finding under a different name.
    onCanAttempt: (materials: string[]) => boolean = (materials) => materials.length >= TUNE.combineMinInputs,
    /**
     * WHY NOT — and this exists because SESSION 1 gave the gate a reason worth hearing.
     *
     * `onCanAttempt` answers yes/no, and `redraw` used to BLANK the evidence line whenever the
     * answer was no. That was survivable while the only way to fail was "you have picked fewer
     * than two things", which the panel makes obvious by looking at it. Law 220's third
     * relation is not obvious by looking at it: a survivor stages haft, head and binding, the
     * Combine button greys, and nothing on screen says that two hands cannot hold three
     * things. A silently disabled button IS the refusal-without-a-reason shape [[D-042]] and
     * Law 26 both forbid — *the world tells you first* — so the brain's own sentence is shown
     * in the same place the evidence line already speaks from.
     */
    onWhyNot: (materials: string[]) => string | null = () => null,
    /** item 11 — taking, as its own act. Appended LAST so every existing positional call site
     *  keeps exactly the behaviour it had; a caller that does not pass it simply has no take
     *  button, which is the pre-item-11 world. */
    onTakeStorage: () => void = () => {}
): void {
    //  The panel carries the hub class AND the active tab's own class, so `.panel.loadout`
    //  and `.panel.growth` both keep resolving exactly where they always did.
    const el = panel(overlay, `backpack ${tab === 'skills' ? 'growth' : tab === 'vitals' ? 'vitals' : 'loadout'}`);
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
            //  item 11 — BOTH, WHEN BOTH ARE POSSIBLE. The box used to infer which one act it
            //  was willing to do from whether your hands were empty, so taking anything out
            //  meant first putting everything in. Two buttons, no inference.
            view.storageTakeAction ? `<button class="quiet take-storage-btn" type="button">${view.storageTakeAction}</button>` : ''
          }${
            view.repairLabel ? `<button class="quiet repair-btn" type="button">${view.repairLabel}</button>` : ''
          }${
            view.storageAction || view.storageTakeAction || view.repairLabel ? '' : '<p class="subtitle">The box is empty, and so are your hands.</p>'
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
    //  THE REDESIGN, and why each piece is where it is:
    //
    //    THE SLATE IS LIVE. It lists what this pile could become and redraws on every chip, so
    //    the survivor sees the answer BEFORE anything is spent. The old surface staged,
    //    committed, and only then said something.
    //
    //    KNOWN slots are named and selectable — naming what you have already made has not been
    //    a spoiler since [[D-156]].
    //
    //    UNKNOWN slots are grey, disabled, and carry NOTHING that identifies them: no name, no
    //    id, no data attribute, no per-slot text. They are generated from an INTEGER, which is
    //    the only thing the brain hands over, so this markup could not leak an identity if it
    //    tried. Law 95 held by construction rather than by remembering — which matters, because
    //    every previous version of this rule lived in a sentence somebody had to remember not
    //    to write.
    //
    //    TWO VERBS, because they are two intentions. Combine commits to a thing you know;
    //    Discover commits to finding out what a grey slot is. The old flow made those a single
    //    press with a question in between, so wanting to experiment meant first being offered
    //    something you already knew and then declining it.
    //  SIMPLIFIED BACK, ITEM 3 (this batch). This gate carried a standing exception —
    //  `hasStandaloneKnown` — for the one recipe (knap) whose real ingredient could not be
    //  staged as a chip, only owned. Now the stone hammer IS a chip (`Inventory.stonehammer`,
    //  `materials.ts`), so a survivor holding the hammer and stone genuinely holds TWO
    //  combinable things and clears this floor with no help — the exception did not widen,
    //  it stopped being reachable. `view.combinable.length >= 2` is the whole gate again, the
    //  same shape it had before knap ever needed a floor-bend.
    //
    //  THE KNOWN-LIST'S OWN HALF OF THIS ROW IS GONE (item 3) — see the ledger entry. What
    //  is left below is exactly what the pre-[[RULING 1]] row already was: chips, a slate,
    //  Combine and Discover. Nothing here answers "what do I know" any more; the slate
    //  answers "what does THIS pile make", named if you know it, "?" if you do not.
    const combineRow = view.combinable.length >= 2
        ? `<div class="combine-row">
             <p class="subtitle">Put two to four things together.</p>
             <div class="combine-chips">${view.combinable.map((m) =>
                `<button class="quiet combine-chip" data-mat="${m}" type="button">${MATERIAL_LABEL[m] ?? m}</button>`
             ).join('')}</div>
             <div class="combine-slate"></div>
             <p class="subtitle evidence-line"></p>
             <div class="combine-actions">
               <button class="primary combine-btn" type="button" disabled>Combine</button>
               <button class="quiet discover-btn" type="button" disabled>Discover</button>
             </div>
           </div>`
        : '';

    //  ITEM 2 — THE DROP ROW. Put something down rather than carrying it forever. Sits with
    //  the combine row because both are things you do WITH what you carry, and because the
    //  drop clock is a fact about a carried thing's future.
    const dropRow = !view.atStorage && view.combinable.length > 0
        ? `<div class="drop-row">
             <p class="subtitle">Set something down. It keeps for three days, then weathers away.</p>
             <div class="drop-chips">${view.combinable.map((m) =>
                `<button class="quiet drop-chip" data-drop="${m}" type="button">Drop ${MATERIAL_LABEL[m] ?? m}</button>`
             ).join('')}</div>
           </div>`
        : '';

    //  DROP 5 — THE SET, on the Inventory tab because a receiver is a thing you CARRY.
    //
    //  Register named per [[D-138]]: one rung of ENDING E03. The shape is Drop 4's — what it
    //  is, what handling it tells you, and where you stand — observations and open questions,
    //  never a finished answer. NOTHING HERE SENDS, and there is no view field a send control
    //  could bind to even if somebody reached for one.
    const radioRow = !view.radio?.owned ? '' : `
        <div class="build-item radio-item">
            <div class="build-head"><strong>The receiver</strong><span class="standing-chip">${view.radio.listening ? 'Listening' : 'Off'}</span></div>
            <p class="subtitle">${view.radio.sight}</p>
            <p class="subtitle radio-charge">${view.radio.charge}</p>
            <p class="subtitle radio-note">${view.radio.note}</p>
            <p class="subtitle radio-read">${view.radio.lines.join('  ·  ')}</p>
            <button class="primary listen-btn" type="button" ${view.radio.blocker && !view.radio.listening ? 'disabled' : ''}>${
                view.radio.listening ? 'Stop listening' : (view.radio.blocker ?? 'Listen')}</button>
            ${view.radio.heard.length === 0 ? '' : `
            <div class="radio-heard">${view.radio.heard.map((h: RadioPanelView['heard'][number]) => `
                <p class="subtitle radio-fragment">${h.callSign} — ${h.text}</p>
                ${h.loggable ? `<button class="quiet log-signal-btn" data-signal="${h.id}" type="button">Write down ${h.callSign}</button>` : ''}`).join('')}
            ${view.radio.writeBlocker ? `<p class="subtitle radio-writeblock">${view.radio.writeBlocker}</p>` : ''}</div>`}
        </div>`;

    //  RELOCATED FROM THE BUILD PANEL (ITEM 1, this batch), same classes `showBuildCard`
    //  used (`build-item hint-item` / `build-head` / `hint-line` / `hint-how`) so nothing
    //  that asserted on them needed to change shape, only which panel to look in. Placed
    //  above the combine row it is a nudge TOWARD — Law 113's scaffold pointing at the exact
    //  gesture below it, not a separate destination the way the Build panel's door was.
    const hintsRow = !view.hints.length ? '' : `
        <div class="build-item hint-item">
             <div class="build-head"><strong>Something is nagging at you</strong></div>
             ${view.hints.map((h) => `<p class="subtitle hint-line" data-hint="${h.recipeId}">${h.prompt}</p>`).join('')}
             <p class="subtitle hint-how">Try putting things together.</p>
        </div>`;

    const inventoryBody = `
        <h2>${view.atStorage ? 'The store box' : 'Carried'}</h2>
        <p class="subtitle load-line">${view.massKg.toFixed(1)} kg · bulk ${view.bulk.toFixed(1)}</p>
        ${storageRow}
        ${equipRow}
        ${radioRow}
        <button class="quiet growth-btn" type="button">What the island has done to you</button>
        ${hintsRow}
        ${combineRow}
        ${dropRow}
        <div class="zones">${zoneRows}</div>`;

    const activeBody = tab === 'vitals' ? vitalsBody(view.vitals, view.vitalsExtra)
        : tab === 'skills' ? growthBody(view.skills, view.playerSkills, view.readout)
        : inventoryBody;

    el.innerHTML = `${tabBar(tab)}${activeBody}
        <button class="primary close-btn" type="button">Close</button>`;

    //  Switching re-renders in place rather than closing and reopening: the panel lock is
    //  already held, and releasing it between tabs would let a world tap through the gap —
    //  the exact class of leak D-063's INPUT SAFETY law exists to prevent.
    //  ITEM 2 — one listener for every drop chip, delegated so a re-render cannot strand it.
    for (const chip of el.querySelectorAll<HTMLButtonElement>('.hand-chip')) {
        chip.addEventListener('click', () => {
            const tool = chip.dataset.tool;
            const hand = chip.dataset.hand === 'left' ? 'left' : 'right';
            if (tool) onEquipHand(tool, hand);
        });
    }
    //  THE WRECK SLICE — the medical store, bound here for the same reason the hand chips
    //  are: the Vitals tab re-renders in place on every tab switch, so a listener attached
    //  once at construction would be stranded the first time the player looks at Skills and
    //  comes back. Re-queried on each render, exactly as above.
    const medBtn = el.querySelector<HTMLButtonElement>('.medicine-btn');
    if (medBtn && !medBtn.disabled) {
        medBtn.addEventListener('click', () => { onTakeMedicine(); fade(el, onClose); });
    }
    //  P0-2 — re-queried on each render for exactly the reason the medicine button is: the
    //  Vitals tab re-renders in place on every tab switch, so a listener bound once at
    //  construction is stranded the first time the player looks at Skills and comes back.
    const bindBtn = el.querySelector<HTMLButtonElement>('.bind-btn');
    if (bindBtn) bindBtn.addEventListener('click', () => { onBindWound(); fade(el, onClose); });
    const drinkBtn = el.querySelector<HTMLButtonElement>('.drink-clean-btn');
    if (drinkBtn) drinkBtn.addEventListener('click', () => { onDrinkClean(); fade(el, onClose); });
    //  RULING (C1) — sleep, relocated from the Build panel. NOT the medicine/bind/drink
    //  shape (act now, fade separately): sleep opens a SECOND panel — the morning report,
    //  through its own `beginPanel`/`endPanel` pair — and that panel's lock uses the SAME
    //  flag this one does. Acting before the fade would run `openReport`'s `beginPanel()`
    //  while THIS panel's lock is still held, and the fade's own deferred close would then
    //  release the REPORT's lock out from under it 320 ms later. `fade(el, onSleep)` is the
    //  Build panel's original shape, unchanged: the single deferred close IS the action, so
    //  `trySleep`'s `openReport` only ever runs after this panel's own lock is truly gone.
    const sleepBtn = el.querySelector<HTMLButtonElement>('.sleep-btn');
    if (sleepBtn) sleepBtn.addEventListener('click', () => { fade(el, onSleep); });
    //  DROP 5 — the two radio controls, re-queried on each render for the same reason the
    //  hand chips and the medical store are: the panel re-renders in place on every tab
    //  switch, so a listener attached once at construction is stranded the first time the
    //  player looks at Skills and comes back.
    const listenBtn = el.querySelector<HTMLButtonElement>('.listen-btn');
    if (listenBtn && !listenBtn.disabled) {
        listenBtn.addEventListener('click', () => { onListen(); fade(el, onClose); });
    }
    for (const btn of el.querySelectorAll<HTMLButtonElement>('.log-signal-btn')) {
        btn.addEventListener('click', () => {
            const id = btn.dataset.signal;
            if (id) { onLogSignal(id); fade(el, onClose); }
        });
    }
    for (const chip of el.querySelectorAll<HTMLButtonElement>('.drop-chip')) {
        chip.addEventListener('click', () => {
            const mat = chip.dataset.drop;
            if (mat) { onDrop(mat); fade(el, onClose); }
        });
    }
    //  `.make-btn`/`onMake` AND `.known-row`/`onSelectKnown` ARE GONE (ITEMS 1 AND 3, this
    //  batch) — the Build panel they opened, and the known-list row they expanded, no
    //  longer exist. See the ledger entry for the full account.

    el.querySelectorAll<HTMLButtonElement>('.backpack-tab').forEach((b) => {
        b.addEventListener('click', () => {
            const next = (b.dataset.tab ?? 'inventory') as BackpackTab;
            if (next === tab) return;
            el.remove();
            onTab(next);
        });
    });

    el.querySelectorAll<HTMLButtonElement>('.equip-btn').forEach((b) => {
        b.addEventListener('click', () => { onEquip(b.dataset.tool ?? ''); fade(el, onClose); });
    });
    el.querySelector<HTMLButtonElement>('.stow-btn')?.addEventListener('click', () => { onStow(); fade(el, onClose); });
    el.querySelector<HTMLButtonElement>('.use-storage-btn')?.addEventListener('click', () => { onUseStorage(); fade(el, onClose); });
    el.querySelector<HTMLButtonElement>('.take-storage-btn')?.addEventListener('click', () => { onTakeStorage(); fade(el, onClose); });
    el.querySelector<HTMLButtonElement>('.repair-btn')?.addEventListener('click', () => { onRepairStorage(); fade(el, onClose); });
    //  Selection: tap a chip to pick it, tap again to drop it. Two to four, per the crafting
    //  spec's own range — the old hard pair was the discovery probe's arity, not the spec's,
    //  and it left `storage` and `stonehammer` permanently unreachable because wood+stone
    //  always resolved to the shelter. The button stays asleep below two, so the verb can
    //  never fire half-formed.
    //
    //  RULING (C1), this batch — "TWO TO FOUR" NOW HAS ITS ONE NAMED EXCEPTION, and it is
    //  checked through `onCanAttempt` rather than repeated here as a second `=== 1` special
    //  case: knap's own single-material shape either passes the brain's real gate or it does
    //  not, and this surface only ever asks, never re-derives.
    const picked: string[] = [];
    let chosenRecipe: string | null = null;
    const combineBtn = el.querySelector<HTMLButtonElement>('.combine-btn');
    const discoverBtn = el.querySelector<HTMLButtonElement>('.discover-btn');
    const slateEl = el.querySelector<HTMLElement>('.combine-slate');

    /** Redraw the slate for the current pile. The surface is a pure function of the selection. */
    const redraw = (): void => {
        const enough = onCanAttempt(picked);
        const slate: CombineSlateView = enough ? onSlate(picked) : { known: [], unknownCount: 0 };
        //  A selection cannot survive a pile change that removes it.
        if (chosenRecipe && !slate.known.some((k) => k.recipeId === chosenRecipe)) chosenRecipe = null;

        if (slateEl) {
            const knownMarkup = slate.known.map((k) =>
                `<button class="quiet slate-slot known${chosenRecipe === k.recipeId ? ' chosen' : ''}" data-recipe="${k.recipeId}" type="button">${k.name}</button>`
            ).join('');
            //  Generated from a COUNT. Every unknown slot is byte-identical to every other, so
            //  there is nothing to read off one of them — not a name, not an order, not a hint.
            const unknownMarkup = Array.from({ length: slate.unknownCount }, () =>
                '<button class="quiet slate-slot unknown" type="button" disabled aria-disabled="true">?</button>'
            ).join('');
            const nothing = !enough
                ? '<p class="subtitle">Pick two or more.</p>'
                : (slate.known.length + slate.unknownCount === 0
                    ? '<p class="subtitle">Nothing comes to mind for these.</p>'
                    : '');
            slateEl.innerHTML = nothing + knownMarkup + unknownMarkup;
            slateEl.querySelectorAll<HTMLButtonElement>('.slate-slot.known').forEach((slot) => {
                slot.addEventListener('click', () => {
                    const id = slot.dataset.recipe ?? '';
                    chosenRecipe = chosenRecipe === id ? null : id;
                    redraw();
                });
            });
        }
        if (combineBtn) combineBtn.disabled = !enough || chosenRecipe === null;
        //  OFFERED WHENEVER TWO THINGS ARE STAGED. Gating this on `unknownCount > 0` disabled the
        //  verb for a pile that makes nothing — which is exactly the attempt [[D-055]]'s journal
        //  exists to record, so the one gesture that could teach "these two do not go together"
        //  was the one gesture refused. The brain still refuses the genuinely pointless case (a
        //  pile whose every outcome you already hold) and says so out loud.
        //  ...BUT NOT WHEN THERE IS GENUINELY NOTHING TO FIND. The distinction the first cut
        //  missed is between a pool that is EMPTY and a pool that is FULLY KNOWN, and
        //  `unknownCount` is zero for both:
        //
        //    empty pool        — the pile makes nothing, and trying is the null attempt D-055
        //                        journals. Offered.
        //    fully known pool  — every outcome is already held. Nothing to find, and a button
        //                        that is always going to refuse is a control telling a small lie.
        //
        //  Pool size is `known.length + unknownCount`, so the two cases are separable here.
        if (discoverBtn) {
            const nothingLeftToFind = slate.known.length > 0 && slate.unknownCount === 0;
            discoverBtn.disabled = !enough || nothingLeftToFind;
        }

        //  The evidence line stays as it was: it speaks about PROPERTIES and never identity,
        //  and it is the one part of the old surface the redesign does not replace.
        //  SPEAKS EITHER WAY NOW: the properties preview when the pile CAN be attempted, and
        //  the brain's own refusal when it cannot. Blanking on refusal is what left Law 220's
        //  gate silent — see `onWhyNot`'s own note. Still never names an outcome in either
        //  branch: `onPreview` is property-only by Law 95, and `canExperimentWith`'s refusals
        //  name the enabler ("a workbench would hold the third steady"), never the product.
        const ev = el.querySelector('.evidence-line');
        if (ev) ev.textContent = enough ? (onPreview(picked) ?? '') : (onWhyNot(picked) ?? '');
    };

    el.querySelectorAll<HTMLButtonElement>('.combine-chip').forEach((chip) => {
        chip.addEventListener('click', () => {
            const mat = chip.dataset.mat ?? '';
            const at = picked.indexOf(mat);
            if (at >= 0) { picked.splice(at, 1); chip.classList.remove('picked'); }
            else if (picked.length < TUNE.combineMaxInputs) { picked.push(mat); chip.classList.add('picked'); }
            redraw();
        });
    });
    redraw();

    combineBtn?.addEventListener('click', () => {
        //  SAME GATE THE SLATE ITSELF WAS DRAWN UNDER (`onCanAttempt`, not a re-derived
        //  length check) — a pile the slate showed as attemptable must be one the button
        //  agrees is attemptable, on the same call, not a second opinion that could drift.
        if (onCanAttempt(picked) && chosenRecipe) {
            onCombine([...picked], chosenRecipe);
            fade(el, onClose);
        }
    });
    discoverBtn?.addEventListener('click', () => {
        if (onCanAttempt(picked)) { onDiscover([...picked]); fade(el, onClose); }
    });

    //  The old standalone entry point, kept as a shortcut INTO the Skills tab. Same
    //  selector, same destination — it just no longer opens a competing surface.
    el.querySelector<HTMLButtonElement>('.growth-btn')?.addEventListener('click', () => {
        el.remove();
        onTab('skills');
    });
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
    el.innerHTML = growthBody(report) + '<button class="primary close-btn" type="button">Close</button>';
    el.querySelector('.close-btn')!.addEventListener('click', () => fade(el, onClose));
}

/**
 * The Skills tab's body, extracted so the Backpack hub renders exactly what the standalone
 * card did — the same markup, not a second copy that drifts from it.
 */
function growthBody(report: GrowthReportView, skills?: Skills, readout?: ReadoutRow[]): string {
    //  NOT `growth-item`. These rows carried it in the first cut and the full sweep caught
    //  it immediately: the harness counts `.growth-item` to assert §12's EIGHT capacities,
    //  and three readout rows made it eleven. [[D-113]] recorded this exact defect once
    //  already — skill rows reusing the capacity class — so this is the second time the
    //  class has been borrowed and the second time a count caught it. Its own class only.
    //  DROP 6 — WHAT THE BODY KNOWS, at the top of the tab because it is the answer to the
    //  question the tab is opened to ask. Concrete change, then a band, then a bar — and
    //  every one of them read from `readoutRows`, the SAME function the world-first
    //  announcements use. Six surfaces each deriving their own version is how the screen
    //  comes to disagree with the hands, which is the failure this pass exists to avoid.
    const readoutRowsHtml = !readout?.length ? '' : `
        <div class="build-list readout-list">${readout.map((r) => `
            <div class="readout-item standing-${r.reading.standing.replace(/\s+/g, '-')}">
                <div class="build-head"><strong>${r.label}</strong><span class="standing-chip">${r.reading.standing}</span></div>
                <p class="subtitle readout-line">${r.reading.sentence}</p>
                <div class="readout-bar"><span style="width:${Math.round(r.reading.progress * 100)}%"></span></div>
            </div>`).join('')}</div>`;

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

    //  ITEM 4 — THE ACTUAL SKILLS, which this tab did not show at all.
    //
    //  It carried §12's capacities and §15's crossings, both of which are about what the
    //  island has done to the BODY. Neither is a skill. `woodcutting` and `foraging` have
    //  shipped since Cycle 03 with levels and XP that drive real speed multipliers, and a
    //  survivor had nowhere to see either number — so "am I getting better at this" was
    //  answerable only by feel.
    //
    //  Shown FIRST, above the capacities: a skill is the thing the player is deliberately
    //  practising, and the capacities are what happens to them while they do it. Progress is
    //  read from `levelProgress`, the same function the level-up beat uses, so the bar and
    //  the beat can never disagree about how close you are.
    const skillRows = !skills ? '' : (Object.entries(skills) as Array<[string, { level: number; xp: number }]>)
        .map(([name, sk]) => {
            const pct = Math.round(levelProgress(sk) * 100);
            return `
        <div class="skill-row">
            <div class="build-head"><strong>${SKILL_LABEL[name] ?? name}</strong><span class="standing-chip">${skillStanding(sk.level)}</span></div>
            <div class="skill-bar"><div class="skill-fill" style="width:${pct}%"></div></div>
            <p class="growth-how">${progressWord(levelProgress(sk))} toward the next.</p>
        </div>`;
        }).join('');

    return `
        <h2>What the island has done to you</h2>
        ${readoutRowsHtml}
        <p class="subtitle growth-summary">${report.summary}</p>
        <div class="build-list">
            ${skillRows ? `<div class="growth-divider">What you are practising</div>${skillRows}<div class="growth-divider">What it has made of you</div>` : ''}
            ${capacityRows}
            <div class="growth-divider">Where two things meet</div>
            ${crossRows}
        </div>`;
}

/** One human outcome offered at a site, mirroring `SiteReading` from the brain. */
export interface SiteOutcomeView {
    outcome: string;
    label: string;
    buildable: boolean;
    reason: string | null;
}

/**
 * THE SITE CARD (§9.6, Law 126) — contextual construction's surface.
 *
 * This is what replaces the global Build button for anything that goes IN A PLACE. It opens
 * where the survivor chose, it names what they get in human terms rather than by object, and
 * a blocked outcome is SHOWN greyed with the one true reason — the same rule the radial
 * circle's blocked segments follow, for the same reason: hiding a thing you nearly have
 * teaches nothing, while showing it with its reason teaches exactly what to fix.
 *
 * It renders `availableOutcomes` and decides nothing. The site's viability, the ordering of
 * the reasons and the wording all live in `construction.ts`, where a unit test can reach
 * them; this layer draws the answer.
 */
export function showSiteCard(
    overlay: HTMLElement,
    outcomes: SiteOutcomeView[],
    onChoose: (outcome: string) => void,
    onClose: () => void
): void {
    const el = panel(overlay, 'site');
    const rows = outcomes.map((o) => `
        <div class="build-item site-item ${o.buildable ? 'ready' : 'blocked'}">
            <div class="build-head"><strong>${o.label}</strong></div>
            ${o.reason ? `<p class="subtitle site-reason">${o.reason}</p>` : ''}
            ${o.buildable
                ? `<button class="primary site-btn" data-outcome="${o.outcome}" type="button">Build it here</button>`
                : ''}
        </div>`).join('');
    el.innerHTML = `
        <h2>Here</h2>
        <p class="subtitle site-lead">What do you need this ground for?</p>
        <div class="build-list">${rows}</div>
        <button class="primary close-btn" type="button">Not here</button>`;
    let done = false;
    el.querySelectorAll<HTMLButtonElement>('.site-btn').forEach((b) => {
        b.addEventListener('click', () => {
            if (done) return;
            done = true;
            fade(el, () => onChoose(b.dataset.outcome ?? ''));
        });
    });
    el.querySelector('.close-btn')!.addEventListener('click', () => {
        if (done) return;
        done = true;
        fade(el, onClose);
    });
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
    //  FIVE VERBS IS CROWDED. At the certified arc, adjacent centres sit ~75px apart with a
    //  116px segment, so from five onward they overlap and hit-testing returns the neighbour
    //  rather than the button under the thumb. The class narrows the segments; the ARC is
    //  untouched, because SLICE 2's ONE-THUMB REACH gate certifies that geometry and a fix
    //  that moved it would be trading a certified property for an uncertified one.
    const el = panel(overlay, `verb-circle${options.length >= 5 ? ' crowded' : ''}`);

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
