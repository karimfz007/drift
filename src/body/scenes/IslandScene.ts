/**
 * BODY — the island. One handcrafted beach and treeline, drawn in placeholders
 * (charter §II.7), with the whole Cycle 01 steel thread on top of it:
 *
 *   crash → move → gather → fire → warmth → quit → reopen → morning report
 *
 * Nothing in here simulates anything. Every rule it obeys — what wood yields, how fast
 * warmth falls, when the fire dies — is asked of the brain and then drawn.
 */

import { BlendModes, Scene } from 'phaser';
import {
    buildFire,
    canBuildFire,
    canFeedFire,
    distance,
    feedFire,
    fireBurnHoursRemaining,
    gatherNode,
    isFireLit,
    isSheltered,
    timeOfDay,
    type ControlMode,
    type WoodNode
} from '../../brain';
import { TUNE } from '../../data/tune';
import { BANDS, WALKABLE, WORLD } from '../../data/world';
import { Cues, CUES } from '../audio';
import { grantControl, msSinceControl, now, runtime, session } from '../runtime';
import { CSS, DEPTH, LAYOUT, MOTION, PALETTE, TYPE } from '../theme';
import { Hud } from '../ui/Hud';
import { Joystick } from '../ui/Joystick';
import { Hint, makeButton, showMorningReport, showSettings } from '../ui/Panels';
import { routeTap } from '../ui/Taps';

/** Presentation-only constants for the island's look. Gameplay numbers live in tune.ts. */
const LOOK = {
    playerRadius: 15,
    driftwoodLength: 26,
    deadfallRadius: 20,
    nodeTapSlack: 34,
    glowRings: 6,
    nightAlphaMax: 0.66,
    duskStart: 16.5,
    duskEnd: 19,
    dawnStart: 4.5,
    dawnEnd: 7,
    vignetteBands: 9,
    vignetteMaxAlpha: 0.5
} as const;

interface NodeView {
    node: WoodNode;
    body: Phaser.GameObjects.Shape;
    ring: Phaser.GameObjects.Arc;
}

export class IslandScene extends Scene {
    private cues!: Cues;
    private hud!: Hud;
    private hint!: Hint;
    private joystick!: Joystick;

    private player!: Phaser.GameObjects.Arc;
    private playerFacing!: Phaser.GameObjects.Arc;
    private nodeViews: NodeView[] = [];

    private firePit!: Phaser.GameObjects.Arc;
    private fireFlame!: Phaser.GameObjects.Graphics;
    private fireGlow!: Phaser.GameObjects.Graphics;
    private nightTint!: Phaser.GameObjects.Rectangle;
    private vignette!: Phaser.GameObjects.Graphics;
    private holdRing!: Phaser.GameObjects.Graphics;

    private actionButton!: Phaser.GameObjects.Container;
    private actionLabel!: Phaser.GameObjects.Text;
    private actionBack!: Phaser.GameObjects.Rectangle;
    private goalText!: Phaser.GameObjects.Text;

    private moveTarget: { x: number; y: number } | null = null;
    private pendingNodeId: string | null = null;

    private holdNodeId: string | null = null;
    private holdPointerId: number | null = null;
    private holdStartedAtMs = 0;

    private lastInteractionAtMs = 0;
    private consecutiveFailures = 0;
    private vignetteIntensity = -1;
    private reportOpen = false;
    private settingsOpen = false;
    private onVisibility?: () => void;

    constructor() {
        super('Island');
    }

    create(): void {
        grantControl();
        this.cues = new Cues(this);
        const state = session().state;

        this.drawTerrain();
        this.createFire();
        this.createNodes();
        this.createPlayer();

        this.nightTint = this.add
            .rectangle(0, 0, WORLD.width, WORLD.height, PALETTE.night, 0)
            .setOrigin(0)
            .setDepth(DEPTH.tint);

        this.fireGlow = this.add.graphics().setDepth(DEPTH.glow).setBlendMode(BlendModes.ADD);
        this.vignette = this.add.graphics().setDepth(DEPTH.vignette);
        this.holdRing = this.add.graphics().setDepth(DEPTH.worldUi);

        this.hud = new Hud(this);
        this.hint = new Hint(this);
        this.joystick = new Joystick(this);
        this.createActionBar();
        this.createSettingsButton();

        this.joystick.setEnabled(state.settings.controlMode === 'joystick');
        this.lastInteractionAtMs = now();

        this.installInput();
        this.installLifecycle();

        this.cameras.main.fadeIn(MOTION.panelFade, 0, 0, 0);

        //  A returning player is owed the story of their absence before anything else.
        if (runtime.pendingReport) {
            const report = runtime.pendingReport;
            runtime.pendingReport = null;
            this.openReport(report);
        } else if (runtime.isNewRun) {
            this.hint.show('Driftwood on the sand. Take it.', TUNE.hintVisibleSeconds);
        }
    }

    // ---- Construction ---------------------------------------------------

    private drawTerrain(): void {
        const g = this.add.graphics().setDepth(DEPTH.terrain);

        g.fillStyle(PALETTE.seaDeep, 1);
        g.fillRect(0, BANDS.seaTop, WORLD.width, BANDS.surfTop);
        g.fillStyle(PALETTE.sea, 1);
        g.fillRect(0, BANDS.surfTop - 46, WORLD.width, 46);

        //  Surf line: a few overlapping pale arcs, so the waterline reads as water.
        g.fillStyle(PALETTE.surf, 0.75);
        for (let x = -20; x < WORLD.width + 40; x += 62) {
            g.fillEllipse(x, BANDS.beachTop - 22, 96, 26);
        }

        g.fillStyle(PALETTE.sandWet, 1);
        g.fillRect(0, BANDS.surfTop, WORLD.width, BANDS.beachTop - BANDS.surfTop);
        g.fillStyle(PALETTE.sand, 1);
        g.fillRect(0, BANDS.beachTop, WORLD.width, BANDS.scrubTop - BANDS.beachTop);

        //  Dry sand speckle — deterministic offsets, no RNG, so the beach is one beach.
        g.fillStyle(PALETTE.sandHighlight, 0.5);
        for (let i = 0; i < 90; i++) {
            const x = (i * 137) % WORLD.width;
            const y = BANDS.beachTop + ((i * 71) % (BANDS.scrubTop - BANDS.beachTop));
            g.fillCircle(x, y, 2 + (i % 3));
        }

        g.fillStyle(PALETTE.scrub, 1);
        g.fillRect(0, BANDS.scrubTop, WORLD.width, BANDS.treelineTop - BANDS.scrubTop);
        g.fillStyle(PALETTE.treeline, 1);
        g.fillRect(0, BANDS.treelineTop, WORLD.width, BANDS.canopyTop - BANDS.treelineTop);
        g.fillStyle(PALETTE.canopy, 1);
        g.fillRect(0, BANDS.canopyTop, WORLD.width, WORLD.height - BANDS.canopyTop);

        //  Trunks, to say "treeline" without a single asset.
        g.fillStyle(PALETTE.canopy, 0.9);
        for (let i = 0; i < 14; i++) {
            const x = 18 + ((i * 97) % (WORLD.width - 36));
            const y = BANDS.treelineTop + ((i * 53) % 190);
            g.fillEllipse(x, y, 54, 40);
        }
    }

    private createNodes(): void {
        for (const node of session().state.nodes) {
            const body =
                node.kind === 'driftwood'
                    ? this.add
                          .rectangle(node.x, node.y, LOOK.driftwoodLength, 10, PALETTE.driftwood)
                          .setStrokeStyle(2, PALETTE.nodeEdge, 1)
                          .setAngle(((node.x + node.y) % 7) * 12 - 30)
                    : this.add
                          .circle(node.x, node.y, LOOK.deadfallRadius, PALETTE.deadfall)
                          .setStrokeStyle(3, PALETTE.nodeEdge, 1);

            body.setDepth(DEPTH.node);

            const ring = this.add
                .circle(node.x, node.y, LOOK.deadfallRadius + 14)
                .setStrokeStyle(3, PALETTE.flameHot, 0.9)
                .setDepth(DEPTH.worldUi)
                .setVisible(false);

            body.setVisible(node.available);
            this.nodeViews.push({ node, body, ring });
        }
    }

    private createPlayer(): void {
        const { x, y } = session().state.player;
        this.player = this.add
            .circle(x, y, LOOK.playerRadius, PALETTE.player)
            .setStrokeStyle(3, PALETTE.playerEdge, 1)
            .setDepth(DEPTH.player);

        //  A small nub showing which way they are walking — the cheapest legibility win.
        this.playerFacing = this.add
            .circle(x, y - LOOK.playerRadius, 5, PALETTE.playerEdge)
            .setDepth(DEPTH.player + 1);
    }

    private createFire(): void {
        const fire = session().state.fire;
        this.firePit = this.add
            .circle(fire.x, fire.y, 22, PALETTE.fireStone)
            .setStrokeStyle(3, PALETTE.nodeEdge, 1)
            .setDepth(DEPTH.firePit)
            .setVisible(fire.built);

        this.fireFlame = this.add.graphics().setDepth(DEPTH.fire).setVisible(fire.built);
    }

    private createActionBar(): void {
        this.goalText = this.add
            .text(WORLD.width / 2, LAYOUT.actionBarY - 40, '', {
                ...TYPE.label,
                fontSize: '16px',
                align: 'center'
            })
            .setOrigin(0.5)
            .setDepth(DEPTH.controls);

        //  Right of centre, clear of the joystick's half of the screen.
        this.actionButton = makeButton(
            this,
            WORLD.width - 148,
            LAYOUT.actionBarY,
            'Build fire',
            () => this.onActionButton(),
            { width: 250 }
        );
        this.actionButton.setDepth(DEPTH.controls).setVisible(false);
        this.actionBack = this.actionButton.list[0] as Phaser.GameObjects.Rectangle;
        this.actionLabel = this.actionButton.list[1] as Phaser.GameObjects.Text;
    }

    private createSettingsButton(): void {
        const button = makeButton(
            this,
            WORLD.width - 56,
            LAYOUT.hudTop + LAYOUT.hudHeight + 44,
            'Controls',
            () => this.openSettings(),
            { width: LAYOUT.touchMin * 2, tone: 'quiet' }
        );
        button.setDepth(DEPTH.controls).setScale(0.78);
    }

    // ---- Input ----------------------------------------------------------

    private installInput(): void {
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => this.onPointerDown(pointer));
        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => this.joystick.move(pointer));
        this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => this.onPointerUp(pointer));
        this.input.on('pointerupoutside', (pointer: Phaser.Input.Pointer) => this.onPointerUp(pointer));
    }

    private get blocked(): boolean {
        return this.reportOpen || this.settingsOpen;
    }

    private onPointerDown(pointer: Phaser.Input.Pointer): void {
        //  1. Buttons first, and even while a panel is up — that is how panels close.
        if (routeTap(this, pointer.x, pointer.y)) {
            this.lastInteractionAtMs = now();
            return;
        }

        if (this.blocked) return;
        this.lastInteractionAtMs = now();

        //  2. Locomotion thumb (joystick mode only) gets next refusal.
        if (this.joystick.tryClaim(pointer)) {
            session().markFirstMove(msSinceControl());
            return;
        }

        const state = session().state;
        const hit = this.nodeAt(pointer.x, pointer.y);

        //  3. The fire: tap it to feed it.
        if (!hit && state.fire.built && distance(pointer.x, pointer.y, state.fire.x, state.fire.y) < 40) {
            this.tryFeedFire();
            return;
        }

        if (hit) {
            const reach = distance(state.player.x, state.player.y, hit.node.x, hit.node.y);
            if (reach <= TUNE.interactRadius) {
                this.beginInteraction(hit, pointer);
                return;
            }

            if (state.settings.controlMode === 'tap') {
                //  Walk over and, for driftwood, take it on arrival.
                this.ackRing(pointer.x, pointer.y);
                this.cues.play(CUES.target);
                this.moveTarget = this.approachPoint(hit.node);
                this.pendingNodeId = hit.node.id;
                session().markFirstMove(msSinceControl());
                return;
            }

            this.registerFailure('Too far. Walk closer first.');
            return;
        }

        //  4. Empty ground.
        if (state.settings.controlMode === 'tap') {
            if (this.isWalkable(pointer.x, pointer.y)) {
                this.ackRing(pointer.x, pointer.y);
                this.moveTarget = { x: pointer.x, y: pointer.y };
                this.pendingNodeId = null;
                this.consecutiveFailures = 0;
                session().markFirstMove(msSinceControl());
            } else {
                this.registerFailure('You cannot go that way.');
            }
            return;
        }

        this.registerFailure('Nothing there. Steer with your left thumb.');
    }

    private onPointerUp(pointer: Phaser.Input.Pointer): void {
        this.joystick.releaseIf(pointer);
        if (this.holdPointerId === pointer.id) this.cancelHold();
    }

    private nodeAt(x: number, y: number): NodeView | null {
        let best: NodeView | null = null;
        let bestDistance = Infinity;
        for (const view of this.nodeViews) {
            if (!view.node.available) continue;
            const d = distance(x, y, view.node.x, view.node.y);
            if (d <= LOOK.deadfallRadius + LOOK.nodeTapSlack && d < bestDistance) {
                best = view;
                bestDistance = d;
            }
        }
        return best;
    }

    /** Stand just short of the node rather than on top of it. */
    private approachPoint(node: WoodNode): { x: number; y: number } {
        const state = session().state;
        const dx = node.x - state.player.x;
        const dy = node.y - state.player.y;
        const length = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        const stop = Math.max(0, length - TUNE.interactRadius * 0.6);
        return {
            x: state.player.x + (dx / length) * stop,
            y: state.player.y + (dy / length) * stop
        };
    }

    private isWalkable(x: number, y: number): boolean {
        return x >= WALKABLE.minX && x <= WALKABLE.maxX && y >= WALKABLE.minY && y <= WALKABLE.maxY;
    }

    // ---- Gathering ------------------------------------------------------

    private beginInteraction(view: NodeView, pointer: Phaser.Input.Pointer): void {
        this.moveTarget = null;
        this.pendingNodeId = null;
        this.consecutiveFailures = 0;

        if (view.node.kind === 'driftwood') {
            this.collect(view);
            return;
        }

        this.holdNodeId = view.node.id;
        this.holdPointerId = pointer.id;
        this.holdStartedAtMs = now();
        this.cues.play(CUES.target);
        this.cues.startBed(CUES.gather);
    }

    private cancelHold(): void {
        this.holdNodeId = null;
        this.holdPointerId = null;
        this.holdRing.clear();
        this.cues.stopBed(CUES.gather);
    }

    private collect(view: NodeView): void {
        const gained = gatherNode(session().state, view.node.id);
        if (gained <= 0) return;

        view.body.setVisible(false);
        view.ring.setVisible(false);

        this.cues.play(view.node.kind === 'driftwood' ? CUES.pickup : CUES.collected);
        if (view.node.kind === 'deadfall') this.cues.play(CUES.pickup);
        this.spawnMotes(view.node.x, view.node.y, PALETTE.driftwood, 5);
        this.floatText(view.node.x, view.node.y, `+${gained} wood`);

        session().markFirstWood(msSinceControl());
        session().persist(now());
        this.lastInteractionAtMs = now();
        this.hint.hide();
    }

    // ---- Fire -----------------------------------------------------------

    private onActionButton(): void {
        const state = session().state;
        if (!state.fire.built) {
            if (!canBuildFire(state)) {
                this.deniedFire();
                return;
            }
            this.igniteFire();
            return;
        }
        this.tryFeedFire();
    }

    private igniteFire(): void {
        const state = session().state;
        if (!buildFire(state, state.player.x, state.player.y)) return;

        this.firePit.setPosition(state.fire.x, state.fire.y).setVisible(true);
        this.fireFlame.setVisible(true);
        this.cues.play(CUES.ignition);
        this.cues.startBed(CUES.fireloop);

        //  The relief beat: a flash, embers, and the light coming up over ~a second.
        const flash = this.add
            .rectangle(0, 0, WORLD.width, WORLD.height, PALETTE.flameHot, 0.5)
            .setOrigin(0)
            .setDepth(DEPTH.flash);
        this.tweens.add({
            targets: flash,
            alpha: 0,
            duration: MOTION.ignitionFlash,
            onComplete: () => flash.destroy()
        });
        this.spawnMotes(state.fire.x, state.fire.y, PALETTE.ember, 12);

        session().markFireLit(msSinceControl());
        session().persist(now());
        this.lastInteractionAtMs = now();
        this.hint.show('Stay in the firelight. Warmth is coming back.', TUNE.hintVisibleSeconds);
    }

    private tryFeedFire(): void {
        const state = session().state;
        if (!canFeedFire(state)) {
            this.deniedFire();
            return;
        }
        feedFire(state);
        this.cues.play(CUES.collected);
        this.spawnMotes(state.fire.x, state.fire.y, PALETTE.ember, 6);
        this.floatText(state.fire.x, state.fire.y - 24, '+2 hours');
        session().persist(now());
        this.lastInteractionAtMs = now();
    }

    private deniedFire(): void {
        const state = session().state;
        this.cues.play(CUES.denied);
        this.cameras.main.shake(90, 0.003);
        const short = Math.max(0, TUNE.woodPerFire - state.inventory.wood);
        this.hint.show(
            state.fire.built
                ? 'No wood left. Find more at the treeline.'
                : `Not enough wood — ${short} more for a fire.`,
            TUNE.hintVisibleSeconds
        );
    }

    // ---- Feedback -------------------------------------------------------

    private ackRing(x: number, y: number): void {
        const ring = this.add
            .circle(x, y, 12)
            .setStrokeStyle(3, PALETTE.text, 0.9)
            .setDepth(DEPTH.worldUi);
        this.tweens.add({
            targets: ring,
            scale: 2.4,
            alpha: 0,
            duration: MOTION.ackRing,
            ease: 'Quad.easeOut',
            onComplete: () => ring.destroy()
        });
    }

    private spawnMotes(x: number, y: number, colour: number, count: number): void {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count;
            const mote = this.add.circle(x, y, 3, colour, 0.95).setDepth(DEPTH.particles);
            this.tweens.add({
                targets: mote,
                x: x + Math.cos(angle) * (26 + (i % 3) * 8),
                y: y + Math.sin(angle) * (26 + (i % 3) * 8) - 10,
                alpha: 0,
                scale: 0.4,
                duration: MOTION.pickupPop + i * 18,
                ease: 'Quad.easeOut',
                onComplete: () => mote.destroy()
            });
        }
    }

    private floatText(x: number, y: number, label: string): void {
        const text = this.add
            .text(x, y - 18, label, { ...TYPE.label, color: CSS.warm, fontStyle: 'bold' })
            .setOrigin(0.5)
            .setStroke('#12100c', 5)   // legible over pale sand as well as dark scrub
            .setDepth(DEPTH.worldUi);
        this.tweens.add({
            targets: text,
            y: y - 56,
            alpha: 0,
            duration: 700,
            ease: 'Quad.easeOut',
            onComplete: () => text.destroy()
        });
    }

    private registerFailure(message: string): void {
        session().markFailedTap();
        this.consecutiveFailures += 1;
        this.cues.play(CUES.denied);
        if (this.consecutiveFailures >= 2) {
            this.hint.show(message, TUNE.hintVisibleSeconds);
            this.consecutiveFailures = 0;
        }
    }

    // ---- Panels ---------------------------------------------------------

    private openReport(report: Parameters<typeof showMorningReport>[1]): void {
        this.reportOpen = true;
        runtime.reportOpen = true;
        this.cancelHold();
        this.joystick.release();
        showMorningReport(this, report, () => {
            this.reportOpen = false;
            runtime.reportOpen = false;
            this.lastInteractionAtMs = now();
            session().markSteelThreadComplete();
            session().persist(now());
        });
    }

    private openSettings(): void {
        if (this.blocked) return;
        this.settingsOpen = true;
        this.cancelHold();
        this.joystick.release();

        showSettings(
            this,
            session().state.settings.controlMode,
            (mode: ControlMode) => {
                session().setControlMode(mode, now());
                this.joystick.setEnabled(mode === 'joystick');
                this.moveTarget = null;
                this.pendingNodeId = null;
            },
            () => {
                this.settingsOpen = false;
                this.lastInteractionAtMs = now();
            }
        );
    }

    // ---- Lifecycle ------------------------------------------------------

    private installLifecycle(): void {
        this.onVisibility = () => {
            if (document.visibilityState === 'hidden') {
                session().persist(now());
                this.cues.stopAllBeds();
                return;
            }

            //  Back from a backgrounded tab — the same absence maths as a cold reopen.
            const report = session().resume(now());
            this.syncWorldToState();
            if (report && !this.blocked) this.openReport(report);
        };

        document.addEventListener('visibilitychange', this.onVisibility);
        this.events.once('shutdown', () => {
            if (this.onVisibility) document.removeEventListener('visibilitychange', this.onVisibility);
        });
    }

    /** Re-point every visual at the state after a jump in time. */
    private syncWorldToState(): void {
        const state = session().state;
        for (const view of this.nodeViews) {
            view.body.setVisible(view.node.available);
            if (!view.node.available) view.ring.setVisible(false);
        }
        this.firePit.setPosition(state.fire.x, state.fire.y).setVisible(state.fire.built);
        this.fireFlame.setVisible(isFireLit(state));
        if (isFireLit(state)) this.cues.startBed(CUES.fireloop);
        else this.cues.stopBed(CUES.fireloop);
    }

    // ---- Frame ----------------------------------------------------------

    update(_time: number, delta: number): void {
        const s = session();
        s.tick(now());
        const state = s.state;

        if (!this.blocked) {
            this.stepMovement(delta / 1000);
            this.stepHold();
        }

        this.paintPlayer();
        this.paintNodes();
        this.paintFire(delta);
        this.paintLight();
        this.paintActionBar();
        this.stepIdleHint();

        this.hud.update(
            state.warmth,
            state.inventory.wood,
            state.gameHoursElapsed,
            isSheltered(state)
        );
    }

    private stepMovement(dt: number): void {
        const state = session().state;
        let dx = 0;
        let dy = 0;

        if (state.settings.controlMode === 'joystick') {
            const stick = this.joystick.read();
            if (stick.magnitude > 0) {
                dx = stick.x * TUNE.playerSpeed * stick.magnitude * dt;
                dy = stick.y * TUNE.playerSpeed * stick.magnitude * dt;
                this.moveTarget = null;
                this.pendingNodeId = null;
            }
        } else if (this.moveTarget) {
            const toX = this.moveTarget.x - state.player.x;
            const toY = this.moveTarget.y - state.player.y;
            const remaining = Math.sqrt(toX * toX + toY * toY);

            if (remaining <= TUNE.tapArriveEpsilon) {
                this.moveTarget = null;
                this.onArrival();
            } else {
                const step = Math.min(remaining, TUNE.playerSpeed * dt);
                dx = (toX / remaining) * step;
                dy = (toY / remaining) * step;
            }
        }

        if (dx === 0 && dy === 0) return;

        state.player.x = clamp(state.player.x + dx, WALKABLE.minX, WALKABLE.maxX);
        state.player.y = clamp(state.player.y + dy, WALKABLE.minY, WALKABLE.maxY);

        //  Walking away from a deadfall cancels the salvage; the hold has to be earned.
        if (this.holdNodeId) {
            const node = this.nodeViews.find((v) => v.node.id === this.holdNodeId)?.node;
            if (node && distance(state.player.x, state.player.y, node.x, node.y) > TUNE.interactRadius) {
                this.cancelHold();
            }
        }

        const angle = Math.atan2(dy, dx);
        this.playerFacing.setPosition(
            state.player.x + Math.cos(angle) * LOOK.playerRadius,
            state.player.y + Math.sin(angle) * LOOK.playerRadius
        );
        this.lastInteractionAtMs = now();
    }

    /** Arriving at a tapped node: driftwood is taken for you, deadfall still wants a hold. */
    private onArrival(): void {
        if (!this.pendingNodeId) return;
        const view = this.nodeViews.find((v) => v.node.id === this.pendingNodeId);
        this.pendingNodeId = null;
        if (!view || !view.node.available) return;

        if (view.node.kind === 'driftwood') {
            this.collect(view);
        } else {
            this.hint.show('Press and hold the deadfall to break it free.', TUNE.hintVisibleSeconds);
        }
    }

    private stepHold(): void {
        this.holdRing.clear();
        if (!this.holdNodeId) return;

        const view = this.nodeViews.find((v) => v.node.id === this.holdNodeId);
        if (!view || !view.node.available) {
            this.cancelHold();
            return;
        }

        const progress = Math.min(1, (now() - this.holdStartedAtMs) / (TUNE.deadfallHoldSeconds * 1000));

        //  The hold-progress ring: the resistance of the action, made visible.
        this.holdRing.lineStyle(6, PALETTE.flameHot, 0.95);
        this.holdRing.beginPath();
        this.holdRing.arc(
            view.node.x,
            view.node.y,
            LOOK.deadfallRadius + 14,
            -Math.PI / 2,
            -Math.PI / 2 + Math.PI * 2 * progress,
            false
        );
        this.holdRing.strokePath();

        if (progress >= 1) {
            const node = view;
            this.cancelHold();
            this.collect(node);
        }
    }

    private paintPlayer(): void {
        const { x, y } = session().state.player;
        this.player.setPosition(x, y);
        if (this.moveTarget === null && !this.joystick.isActive) {
            this.playerFacing.setPosition(x, y - LOOK.playerRadius);
        }
    }

    /** Target highlight: the one node within reach glows. Nothing else does. */
    private paintNodes(): void {
        const state = session().state;
        let nearest: NodeView | null = null;
        let nearestDistance = Infinity;

        for (const view of this.nodeViews) {
            view.body.setVisible(view.node.available);
            if (!view.node.available) {
                view.ring.setVisible(false);
                continue;
            }
            const d = distance(state.player.x, state.player.y, view.node.x, view.node.y);
            if (d <= TUNE.interactRadius && d < nearestDistance) {
                nearest = view;
                nearestDistance = d;
            }
            view.ring.setVisible(false);
        }

        if (nearest && !this.blocked) {
            nearest.ring.setVisible(true);
            const pulse = 1 + Math.sin(now() / 180) * 0.06;
            nearest.ring.setScale(pulse);
        }
    }

    private paintFire(delta: number): void {
        const state = session().state;
        this.fireFlame.clear();
        if (!state.fire.built) return;

        this.firePit.setVisible(true);
        if (!isFireLit(state)) {
            this.fireFlame.setVisible(false);
            this.cues.stopBed(CUES.fireloop);
            return;
        }

        this.fireFlame.setVisible(true);
        this.cues.startBed(CUES.fireloop);

        //  Three stacked flame tongues, breathing out of phase.
        const t = now() / 1000;
        const heights = [26, 20, 15];
        const colours = [PALETTE.ember, PALETTE.flame, PALETTE.flameHot];
        for (let i = 0; i < heights.length; i++) {
            const flicker = 1 + Math.sin(t * (5 + i * 2.3)) * 0.16;
            const h = heights[i] * flicker;
            const w = (16 - i * 3) * flicker;
            this.fireFlame.fillStyle(colours[i], 0.92);
            this.fireFlame.fillTriangle(
                state.fire.x - w,
                state.fire.y + 6,
                state.fire.x + w,
                state.fire.y + 6,
                state.fire.x + Math.sin(t * (3 + i)) * 4,
                state.fire.y + 6 - h
            );
        }
        void delta;
    }

    /**
     * Night, and the light that answers it. The sanctuary transition lives here: a lit
     * fire pushes a warm radius back into the dark, and the cold vignette recedes.
     */
    private paintLight(): void {
        const state = session().state;
        const { hourOfDay } = timeOfDay(state.gameHoursElapsed);

        const darkness = nightDarkness(hourOfDay);
        this.nightTint.setFillStyle(PALETTE.night, darkness * LOOK.nightAlphaMax);

        this.fireGlow.clear();
        if (isFireLit(state)) {
            const breathe = 1 + Math.sin(now() / 420) * 0.035;
            for (let i = LOOK.glowRings; i >= 1; i--) {
                const ratio = i / LOOK.glowRings;
                const radius = TUNE.fireWarmthRadius * ratio * breathe;
                //  Brighter at night — the same fire, doing more work in the dark.
                const alpha = 0.055 * (1 - ratio) * (0.4 + darkness) * 3.4;
                this.fireGlow.fillStyle(PALETTE.flame, alpha);
                this.fireGlow.fillCircle(state.fire.x, state.fire.y, radius);
            }
        }

        //  Cold closes in from the edges as warmth drops; sheltered, it opens back up.
        const cold = Math.max(
            0,
            1 - state.warmth / Math.max(1, TUNE.warmthLowThreshold)
        );
        const intensity = Math.round(cold * 20) / 20;
        if (intensity !== this.vignetteIntensity) {
            this.vignetteIntensity = intensity;
            this.redrawVignette(intensity);
        }
    }

    private redrawVignette(intensity: number): void {
        this.vignette.clear();
        if (intensity <= 0) return;

        for (let i = 0; i < LOOK.vignetteBands; i++) {
            const inset = i * 26;
            const alpha = (intensity * LOOK.vignetteMaxAlpha) / LOOK.vignetteBands;
            this.vignette.fillStyle(PALETTE.night, alpha);
            this.vignette.fillRect(0, 0, WORLD.width, 26 + inset * 0.25);
            this.vignette.fillRect(0, WORLD.height - (26 + inset * 0.25), WORLD.width, 26 + inset * 0.25);
            this.vignette.fillRect(0, 0, 26 + inset * 0.25, WORLD.height);
            this.vignette.fillRect(WORLD.width - (26 + inset * 0.25), 0, 26 + inset * 0.25, WORLD.height);
        }
    }

    /** Three goal horizons, one line: what to do right now (charter §I.18 rule 5). */
    private paintActionBar(): void {
        const state = session().state;

        if (!state.fire.built) {
            const short = Math.max(0, TUNE.woodPerFire - state.inventory.wood);
            const ready = short === 0;
            this.actionButton.setVisible(state.inventory.wood > 0 || ready);
            this.actionLabel.setText(ready ? 'Build fire' : `Build fire (${short} short)`);
            this.actionBack.setFillStyle(ready ? PALETTE.warm : PALETTE.hudBack, ready ? 0.92 : 0.75);
            this.actionBack.setStrokeStyle(2, ready ? PALETTE.flameHot : PALETTE.hudEdge, 1);
            this.actionLabel.setColor(ready ? CSS.panel : CSS.textDim);
            this.goalText.setText(
                ready
                    ? 'Enough wood. Build the fire where you stand.'
                    : `Gather ${TUNE.woodPerFire} wood to build a fire.`
            );
            return;
        }

        const lit = isFireLit(state);
        const hours = fireBurnHoursRemaining(state);
        this.actionButton.setVisible(canFeedFire(state));
        this.actionLabel.setText('Add wood');
        this.actionBack.setFillStyle(PALETTE.warm, 0.92);
        this.actionBack.setStrokeStyle(2, PALETTE.flameHot, 1);
        this.actionLabel.setColor(CSS.panel);

        this.goalText.setText(
            lit
                ? `Fire burning — about ${hours.toFixed(1)} game hours of fuel left.`
                : 'The fire is out. Add wood to bring it back.'
        );
    }

    private stepIdleHint(): void {
        if (this.blocked) return;
        const idleFor = (now() - this.lastInteractionAtMs) / 1000;
        if (idleFor < TUNE.idleHintSeconds) return;

        this.lastInteractionAtMs = now();
        this.hint.show(this.contextualHint(), TUNE.hintVisibleSeconds);
    }

    /** One hint, chosen for where the player actually is in the thread. */
    private contextualHint(): string {
        const state = session().state;

        if (!state.fire.built) {
            if (state.inventory.wood >= TUNE.woodPerFire) {
                return 'You have enough. Build the fire.';
            }
            const anyDriftwood = state.nodes.some((n) => n.available && n.kind === 'driftwood');
            return anyDriftwood
                ? 'Driftwood lies on the sand. Take it.'
                : 'The treeline has deadfall. Press and hold it.';
        }

        if (!isFireLit(state)) return 'The fire is out. Add wood.';
        if (!isSheltered(state)) return 'Stand in the firelight to warm up.';
        return 'You are warming. Close the app — the island keeps the time.';
    }
}

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

/** 0 in full daylight, 1 in the dead of night, ramped across dusk and dawn. */
function nightDarkness(hourOfDay: number): number {
    if (hourOfDay >= LOOK.duskEnd || hourOfDay < LOOK.dawnStart) return 1;
    if (hourOfDay >= LOOK.duskStart) {
        return (hourOfDay - LOOK.duskStart) / (LOOK.duskEnd - LOOK.duskStart);
    }
    if (hourOfDay < LOOK.dawnEnd) {
        return 1 - (hourOfDay - LOOK.dawnStart) / (LOOK.dawnEnd - LOOK.dawnStart);
    }
    return 0;
}
