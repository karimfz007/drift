/**
 * BODY — the things standing on the island: the castaway, the resource nodes, and the
 * fire. The brain owns every rule; this file only draws its answers. The brain's `(x, y)`
 * is the world's `(x, z)` — it never learned about the third dimension, and never needed to.
 *
 * Cycle 03 fixes the two Cycle 02 defects here: every standing thing gets a **blob contact
 * shadow** (the absence of one is what made the castaway read as floating, D-036), and the
 * nodes report their footprints so the game can stop the player walking through them (A6).
 */

import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Scene } from '@babylonjs/core/scene';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { CreateCapsule } from '@babylonjs/core/Meshes/Builders/capsuleBuilder';
import { CreateCylinder } from '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import { CreateDisc } from '@babylonjs/core/Meshes/Builders/discBuilder';
import { CreateSphere } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { PointLight } from '@babylonjs/core/Lights/pointLight';
import { ParticleSystem } from '@babylonjs/core/Particles/particleSystem';
//  Side-effect only: registers the particle scene component. Without it the flames are
//  constructed, started, and never drawn — the deep-import tree-shaking trap.
import '@babylonjs/core/Particles/particleSystemComponent';

import { isFireLit, type GameState, type NodeKind, type WoodNode } from '../brain';
import { TUNE } from '../data/tune';
import { PALETTE, RENDER } from './theme';
import type { Obstacle } from './island';

const colour = (c: readonly number[]) => new Color3(c[0], c[1], c[2]);

const PLAYER_HEIGHT = 1.8;

function flat(scene: Scene, name: string, rgb: readonly number[]): StandardMaterial {
    const material = new StandardMaterial(name, scene);
    material.diffuseColor = colour(rgb);
    material.specularColor = new Color3(0, 0, 0);
    return material;
}

// ---- Blob shadows — the contact-shadow fix (D-036) ----------------------

let sharedShadowMaterial: StandardMaterial | null = null;

function shadowMaterial(scene: Scene): StandardMaterial {
    if (sharedShadowMaterial) return sharedShadowMaterial;
    const texture = new DynamicTexture('blobShadow', { width: 64, height: 64 }, scene, false);
    const ctx = texture.getContext() as unknown as CanvasRenderingContext2D;
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(0,0,0,0.5)');
    gradient.addColorStop(0.6, 'rgba(0,0,0,0.3)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    texture.update();
    texture.hasAlpha = true;

    const material = new StandardMaterial('blobShadowMat', scene);
    material.diffuseTexture = texture;
    material.opacityTexture = texture;
    material.disableLighting = true;
    material.specularColor = new Color3(0, 0, 0);
    material.diffuseColor = new Color3(0, 0, 0);
    sharedShadowMaterial = material;
    return material;
}

/** A flat dark disc laid on the ground under a thing — the cheap, reliable contact shadow. */
function makeShadow(scene: Scene, radius: number): Mesh {
    const disc = CreateDisc(`shadow_${Math.random().toString(36).slice(2)}`, { radius, tessellation: 16 }, scene);
    disc.rotation.x = Math.PI / 2;
    disc.material = shadowMaterial(scene);
    disc.isPickable = false;
    return disc;
}

// ---- The castaway -------------------------------------------------------

export class PlayerView {
    readonly root: Mesh;
    private pack: Mesh;
    private shadow: Mesh;
    private axe: Mesh;
    private axeShown = false;

    constructor(scene: Scene) {
        this.root = CreateCapsule('player', { height: PLAYER_HEIGHT, radius: 0.34, tessellation: 8, subdivisions: 1 }, scene);
        this.root.material = flat(scene, 'playerMat', PALETTE.player);
        this.root.isPickable = false;

        this.pack = CreateBox('pack', { width: 0.52, height: 0.5, depth: 0.28 }, scene);
        this.pack.material = flat(scene, 'packMat', PALETTE.playerPack);
        this.pack.parent = this.root;
        this.pack.position = new Vector3(0, 0.16, -0.36);
        this.pack.isPickable = false;

        //  Visible tool carriage (D-046(d) ruling): once crafted, the axe is on the
        //  character, not just a HUD chip — a haft + head parented to the hip, angled
        //  across the back. No equip step exists; owning it is wearing it.
        const haft = CreateCylinder('axeHaft', { height: 0.62, diameter: 0.05, tessellation: 6 }, scene);
        haft.material = flat(scene, 'axeHaftMat', PALETTE.trunk);
        haft.isPickable = false;
        const head = CreateBox('axeHead', { width: 0.05, height: 0.16, depth: 0.22 }, scene);
        head.material = flat(scene, 'axeHeadMat', PALETTE.rock);
        head.parent = haft;
        head.position.set(0, 0.31, 0);
        head.isPickable = false;
        this.axe = haft;
        this.axe.parent = this.root;
        this.axe.position.set(-0.3, -0.1, -0.3);
        this.axe.rotation.set(0.3, 0, Math.PI / 2.6);
        this.axe.setEnabled(false);

        this.shadow = makeShadow(scene, 0.6);
    }

    /** Plant the feet on the ground at (x, z), and lay the shadow flat where they land. */
    place(x: number, groundY: number, z: number, facingRadians: number): void {
        this.root.position.set(x, groundY + PLAYER_HEIGHT / 2, z);
        this.root.rotation.y = facingRadians;
        //  The shadow sits just above the surface at the feet — the fix for the float.
        this.shadow.position.set(x, groundY + 0.03, z);
    }

    /** Show or hide the carried axe. Owning it is the only gate — there is no equip step. */
    syncTools(hasAxe: boolean): void {
        if (hasAxe === this.axeShown) return;
        this.axeShown = hasAxe;
        this.axe.setEnabled(hasAxe);
    }

    get eyeHeight(): number {
        return PLAYER_HEIGHT * 0.9;
    }

    /** World Y of the capsule's feet — the harness checks this sits on the ground (A6). */
    get feetY(): number {
        return this.root.position.y - PLAYER_HEIGHT / 2;
    }
}

// ---- Resource nodes -----------------------------------------------------

export interface NodeView {
    node: WoodNode;
    body: Mesh;
    halo: Mesh;
    shadow: Mesh;
    /** Footprint radius for collision, or 0 if the player may walk over it. */
    obstacleRadius: number;
}

/** Build the mesh for one node kind at (x, groundY, z). Returns [mesh, shadowRadius, obstacleRadius]. */
function buildNodeMesh(scene: Scene, node: WoodNode, groundY: number, index: number, materials: NodeMaterials): {
    mesh: Mesh;
    shadowRadius: number;
    obstacleRadius: number;
} {
    const at = (mesh: Mesh, yOffset: number, shadow: number, obstacle: number) => {
        mesh.position.set(node.x, groundY + yOffset, node.y);
        mesh.isPickable = true;
        mesh.metadata = { nodeId: node.id };
        return { mesh, shadowRadius: shadow, obstacleRadius: obstacle };
    };

    switch (node.kind) {
        case 'driftwood': {
            const m = CreateCylinder(`n_${node.id}`, { height: 1.5, diameter: 0.26, tessellation: 6 }, scene);
            m.material = materials.driftwood;
            m.rotation.z = Math.PI / 2;
            m.rotation.y = index * 0.8;
            return at(m, 0.14, 0.8, 0);
        }
        case 'deadfall': {
            const m = CreateCylinder(`n_${node.id}`, { height: 2.6, diameterTop: 0.34, diameterBottom: 0.52, tessellation: 6 }, scene);
            m.material = materials.deadfall;
            m.rotation.z = Math.PI / 2.6;
            m.rotation.y = index * 1.1;
            return at(m, 0.42, 1.0, 0);
        }
        case 'tree': {
            //  A standing tree: trunk + canopy, parented so both fell together.
            const trunk = CreateCylinder(`n_${node.id}`, { height: 6.0, diameterTop: 0.5, diameterBottom: 0.85, tessellation: 6 }, scene);
            trunk.material = materials.trunk;
            const canopy = CreateCylinder(`nc_${node.id}`, { height: 4.6, diameterTop: 0, diameterBottom: 4.4, tessellation: 7 }, scene);
            canopy.material = materials.canopy;
            canopy.parent = trunk;
            canopy.position.y = 4.0;
            canopy.isPickable = true;
            canopy.metadata = { nodeId: node.id };
            return at(trunk, 3.0, 1.1, TUNE.treeCollisionRadius);
        }
        case 'rock': {
            const m = CreateCylinder(`n_${node.id}`, { height: 1.4, diameterTop: 1.1, diameterBottom: 1.9, tessellation: 5 }, scene);
            m.material = materials.rock;
            m.rotation.y = index * 0.9;
            return at(m, 0.5, 1.4, TUNE.rockCollisionRadius);
        }
        case 'berrybush': {
            const m = CreateSphere(`n_${node.id}`, { diameter: 1.5, segments: 6 }, scene);
            m.material = materials.bush;
            m.scaling.y = 0.7;
            return at(m, 0.6, 0.9, 0);
        }
        case 'coconutpalm': {
            const trunk = CreateCylinder(`n_${node.id}`, { height: 6.5, diameterTop: 0.4, diameterBottom: 0.6, tessellation: 6 }, scene);
            trunk.material = materials.palm;
            trunk.rotation.z = 0.12;
            const fronds = CreateSphere(`nf_${node.id}`, { diameter: 3.2, segments: 5 }, scene);
            fronds.material = materials.frond;
            fronds.scaling.y = 0.45;
            fronds.parent = trunk;
            fronds.position.y = 3.3;
            fronds.isPickable = true;
            fronds.metadata = { nodeId: node.id };
            //  A fibrous husk ring around the trunk's base — the visible source of the palm's
            //  fibre (D-043), so the material reads before you gather it.
            const husk = CreateCylinder(`nh_${node.id}`, { height: 0.9, diameterTop: 0.95, diameterBottom: 1.15, tessellation: 7 }, scene);
            husk.material = materials.reed;
            husk.parent = trunk;
            husk.position.y = -3.0;
            husk.isPickable = true;
            husk.metadata = { nodeId: node.id };
            return at(trunk, 3.25, 1.0, TUNE.palmCollisionRadius);
        }
        case 'reed': {
            //  A clump of tall thin blades — a fibrous silhouette that reads as "the material
            //  that looks like what it makes" (D-043). One parent blade, a few splayed around it.
            const blade = CreateCylinder(`n_${node.id}`, { height: 2.4, diameterTop: 0.02, diameterBottom: 0.12, tessellation: 4 }, scene);
            blade.material = materials.reed;
            for (let b = 0; b < 5; b++) {
                const extra = CreateCylinder(`nr_${node.id}_${b}`, { height: 1.7 + (b % 3) * 0.5, diameterTop: 0.02, diameterBottom: 0.1, tessellation: 4 }, scene);
                extra.material = materials.reed;
                extra.parent = blade;
                const a = b * 1.257;
                extra.position.set(Math.cos(a) * 0.28, (extra.getBoundingInfo().boundingBox.extendSize.y) - 1.2, Math.sin(a) * 0.28);
                extra.rotation.z = Math.cos(a) * 0.22;
                extra.rotation.x = Math.sin(a) * 0.22;
                extra.isPickable = true;
                extra.metadata = { nodeId: node.id };
            }
            return at(blade, 1.2, 0.7, 0);
        }
        case 'shellfish': {
            const m = CreateSphere(`n_${node.id}`, { diameter: 0.7, segments: 5 }, scene);
            m.material = materials.shell;
            m.scaling.y = 0.5;
            return at(m, 0.14, 0.55, 0);
        }
        case 'crashbox': {
            const m = CreateBox(`n_${node.id}`, { width: 1.3, height: 1.0, depth: 0.9 }, scene);
            m.material = materials.box;
            m.rotation.y = 0.4;
            return at(m, 0.5, 1.1, TUNE.crashboxCollisionRadius);
        }
    }
}

interface NodeMaterials {
    driftwood: StandardMaterial;
    deadfall: StandardMaterial;
    trunk: StandardMaterial;
    canopy: StandardMaterial;
    rock: StandardMaterial;
    bush: StandardMaterial;
    palm: StandardMaterial;
    frond: StandardMaterial;
    reed: StandardMaterial;
    shell: StandardMaterial;
    box: StandardMaterial;
    halo: StandardMaterial;
}

export class NodeViews {
    readonly views: NodeView[] = [];
    private ring: Mesh;
    private ringTexture: DynamicTexture;

    constructor(scene: Scene, nodes: WoodNode[], heightAt: (x: number, z: number) => number) {
        const materials: NodeMaterials = {
            driftwood: flat(scene, 'm_driftwood', PALETTE.driftwood),
            deadfall: flat(scene, 'm_deadfall', PALETTE.deadfall),
            trunk: flat(scene, 'm_trunk', PALETTE.trunk),
            canopy: flat(scene, 'm_canopy', PALETTE.canopyAlt),
            rock: flat(scene, 'm_rock', PALETTE.rock),
            bush: flat(scene, 'm_bush', [0.28, 0.34, 0.18]),
            palm: flat(scene, 'm_palm', PALETTE.trunk),
            frond: flat(scene, 'm_frond', PALETTE.canopy),
            reed: flat(scene, 'm_reed', [0.55, 0.58, 0.28]),
            shell: flat(scene, 'm_shell', [0.7, 0.66, 0.6]),
            box: flat(scene, 'm_box', [0.5, 0.42, 0.3]),
            halo: haloMaterial(scene)
        };

        nodes.forEach((node, index) => {
            const ground = heightAt(node.x, node.y);
            const built = buildNodeMesh(scene, node, ground, index, materials);
            built.mesh.setEnabled(node.available);

            const halo = CreateDisc(`halo_${node.id}`, { radius: Math.max(1.0, built.obstacleRadius + 0.9), tessellation: 24 }, scene);
            halo.rotation.x = Math.PI / 2;
            halo.position.set(node.x, ground + 0.06, node.y);
            halo.material = materials.halo;
            halo.isPickable = false;
            halo.setEnabled(false);

            const shadow = makeShadow(scene, built.shadowRadius);
            shadow.position.set(node.x, ground + 0.02, node.y);
            shadow.setEnabled(node.available);

            this.views.push({ node, body: built.mesh, halo, shadow, obstacleRadius: built.obstacleRadius });
        });

        this.ringTexture = new DynamicTexture('holdRing', { width: 128, height: 128 }, scene, false);
        this.ringTexture.hasAlpha = true;
        const ringMat = new StandardMaterial('holdRingMat', scene);
        ringMat.diffuseTexture = this.ringTexture;
        ringMat.opacityTexture = this.ringTexture;
        ringMat.disableLighting = true;
        ringMat.specularColor = new Color3(0, 0, 0);
        ringMat.backFaceCulling = false;

        this.ring = CreateDisc('holdRingMesh', { radius: 1.1, tessellation: 28 }, scene);
        this.ring.rotation.x = Math.PI / 2;
        this.ring.material = ringMat;
        this.ring.isPickable = false;
        this.ring.setEnabled(false);
    }

    /** Every available node that blocks the player, for collision this frame. */
    obstacles(): Obstacle[] {
        const out: Obstacle[] = [];
        for (const v of this.views) {
            if (v.node.available && v.obstacleRadius > 0) {
                out.push({ x: v.node.x, z: v.node.y, radius: v.obstacleRadius });
            }
        }
        return out;
    }

    showHold(view: NodeView, progress: number, groundY: number): void {
        this.ring.position.set(view.node.x, groundY + 0.09, view.node.y);
        this.ring.setEnabled(true);
        const ctx = this.ringTexture.getContext() as unknown as CanvasRenderingContext2D;
        ctx.clearRect(0, 0, 128, 128);
        ctx.lineWidth = 13;
        ctx.strokeStyle = 'rgba(255,255,255,0.22)';
        ctx.beginPath();
        ctx.arc(64, 64, 48, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = '#ffdb8a';
        ctx.beginPath();
        ctx.arc(64, 64, 48, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
        ctx.stroke();
        this.ringTexture.update();
    }

    hideHold(): void {
        this.ring.setEnabled(false);
    }

    sync(state: GameState): void {
        for (const view of this.views) {
            const live = state.nodes.find((n) => n.id === view.node.id);
            const available = live?.available ?? false;
            view.node.available = available;
            view.body.setEnabled(available);
            view.shadow.setEnabled(available);
            if (!available) view.halo.setEnabled(false);
            //  `setEnabled` only ever governed rendering — `isPickable` is a separate flag
            //  Babylon's picking never consulted it. A spent node's mesh (and, for a tree or
            //  palm, every pickable child parented to it: canopy, fronds, husk) stayed a live
            //  target for `scene.pick()` even invisible, silently intercepting a ray meant for
            //  whatever stood near or behind it. Root cause of the D-045-lineage report: fell
            //  one tree, tap a second object nearby, and the felled tree's ghost hit-box eats
            //  the tap before it ever reaches the real target.
            view.body.isPickable = available;
            for (const child of view.body.getChildMeshes()) child.isPickable = available;
        }
    }

    highlight(target: NodeView | null): void {
        for (const view of this.views) {
            view.halo.setEnabled(view === target && view.node.available);
        }
    }

    find(nodeId: string): NodeView | undefined {
        return this.views.find((v) => v.node.id === nodeId);
    }
}

function haloMaterial(scene: Scene): StandardMaterial {
    const m = new StandardMaterial('haloMat', scene);
    m.diffuseColor = colour(PALETTE.highlight);
    m.emissiveColor = colour(PALETTE.highlight);
    m.specularColor = new Color3(0, 0, 0);
    m.alpha = 0.5;
    m.disableLighting = true;
    return m;
}

// ---- The fire (Cycle 01's sanctuary beat, kept) -------------------------

export class FireView {
    private pit: Mesh;
    private logs: Mesh;
    private glow: Mesh;
    private glowMaterial: StandardMaterial;
    private light: PointLight;
    private particles: ParticleSystem;
    private shadow: Mesh;
    private built = false;
    private lit = false;

    constructor(scene: Scene) {
        this.pit = CreateCylinder('firePit', { height: 0.22, diameter: 1.5, tessellation: 9 }, scene);
        this.pit.material = flat(scene, 'firePitMat', PALETTE.firePit);
        this.pit.isPickable = true;
        this.pit.metadata = { fire: true };

        this.logs = CreateCylinder('fireLogs', { height: 0.9, diameterTop: 0.1, diameterBottom: 0.55, tessellation: 6 }, scene);
        this.logs.material = flat(scene, 'fireLogsMat', PALETTE.deadfall);
        this.logs.parent = this.pit;
        this.logs.position.y = 0.34;
        this.logs.isPickable = false;

        this.glowMaterial = new StandardMaterial('fireGlowMat', scene);
        this.glowMaterial.emissiveColor = colour(PALETTE.flame);
        this.glowMaterial.diffuseColor = new Color3(0, 0, 0);
        this.glowMaterial.specularColor = new Color3(0, 0, 0);
        this.glowMaterial.alpha = 0.22;
        this.glowMaterial.disableLighting = true;

        this.glow = CreateDisc('fireGlow', { radius: TUNE.fireWarmthRadius, tessellation: 32 }, scene);
        this.glow.rotation.x = Math.PI / 2;
        this.glow.material = this.glowMaterial;
        this.glow.isPickable = false;

        this.light = new PointLight('fireLight', new Vector3(0, 1, 0), scene);
        this.light.diffuse = colour(PALETTE.flame);
        this.light.range = TUNE.fireWarmthRadius * 2.2;
        this.light.intensity = 0;

        this.particles = this.buildParticles(scene);
        this.shadow = makeShadow(scene, 1.0);
        this.setBuilt(false);
    }

    private buildParticles(scene: Scene): ParticleSystem {
        const texture = new DynamicTexture('spark', { width: 32, height: 32 }, scene, false);
        const context = texture.getContext() as unknown as CanvasRenderingContext2D;
        const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
        gradient.addColorStop(0, 'rgba(255,255,255,1)');
        gradient.addColorStop(0.45, 'rgba(255,220,150,0.75)');
        gradient.addColorStop(1, 'rgba(255,160,60,0)');
        context.fillStyle = gradient;
        context.fillRect(0, 0, 32, 32);
        texture.update();
        texture.hasAlpha = true;

        const system = new ParticleSystem('flames', RENDER.fireParticles, scene);
        system.particleTexture = texture as unknown as Texture;
        system.emitter = new Vector3(0, 0, 0);
        system.minEmitBox = new Vector3(-0.18, 0.15, -0.18);
        system.maxEmitBox = new Vector3(0.18, 0.35, 0.18);
        system.color1 = new Color4(1, 0.72, 0.28, 1);
        system.color2 = new Color4(1, 0.42, 0.12, 1);
        system.colorDead = new Color4(0.35, 0.12, 0.05, 0);
        system.minSize = 0.28;
        system.maxSize = 0.72;
        system.minLifeTime = 0.28;
        system.maxLifeTime = 0.62;
        system.emitRate = 46;
        system.direction1 = new Vector3(-0.35, 2.4, -0.35);
        system.direction2 = new Vector3(0.35, 3.4, 0.35);
        system.minEmitPower = 0.5;
        system.maxEmitPower = 1.2;
        system.gravity = new Vector3(0, 1.1, 0);
        system.blendMode = ParticleSystem.BLENDMODE_ADD;
        return system;
    }

    private setBuilt(built: boolean): void {
        this.built = built;
        this.pit.setEnabled(built);
        this.glow.setEnabled(built);
        this.shadow.setEnabled(built);
    }

    /** The fire's footprint, so the player cannot stand inside the pit. */
    obstacle(state: GameState): Obstacle | null {
        return state.fire.built ? { x: state.fire.x, z: state.fire.y, radius: TUNE.fireCollisionRadius } : null;
    }

    update(state: GameState, groundY: number, nightFactor: number): void {
        const built = state.fire.built;
        if (built !== this.built) this.setBuilt(built);
        if (!built) {
            this.stopFlames();
            this.light.intensity = 0;
            return;
        }

        this.pit.position.set(state.fire.x, groundY + 0.11, state.fire.y);
        this.glow.position.set(state.fire.x, groundY + 0.03, state.fire.y);
        this.shadow.position.set(state.fire.x, groundY + 0.02, state.fire.y);
        this.light.position.set(state.fire.x, groundY + 1.0, state.fire.y);
        (this.particles.emitter as Vector3).set(state.fire.x, groundY + 0.2, state.fire.y);

        const lit = isFireLit(state);
        if (lit !== this.lit) {
            this.lit = lit;
            if (lit) this.particles.start();
            else this.stopFlames();
        }

        if (!lit) {
            this.light.intensity = 0;
            this.glowMaterial.alpha = 0.05;
            return;
        }

        const flicker = 0.86 + Math.sin(performance.now() / 90) * 0.07 + Math.sin(performance.now() / 37) * 0.05;
        this.light.intensity = (0.55 + 1.5 * nightFactor) * flicker;
        this.glowMaterial.alpha = (0.10 + 0.30 * nightFactor) * flicker;
        this.logs.rotation.y += 0.0008;
    }

    private stopFlames(): void {
        if (this.particles.isStarted()) this.particles.stop();
    }

    flare(): void {
        this.particles.manualEmitCount = 40;
        requestAnimationFrame(() => {
            this.particles.manualEmitCount = -1;
        });
    }
}

// ---- Construction (Cycle 05): the shelter and the storage crate ---------
//
// Both are placed, player-built structures — visually and structurally the same kind of
// thing as the fire (a static mesh at a chosen point, a footprint for collision, a shadow),
// so they reuse the same `flat()`/`makeShadow()` helpers rather than inventing new ones.
// Disrepair dims the structure rather than removing it (charter honest-systems law).

export class ShelterView {
    private root: Mesh;
    private roofMaterial: StandardMaterial;
    private shadow: Mesh;
    private built = false;

    constructor(scene: Scene) {
        //  A lean-to: two angled support poles and a sloped thatch roof between them.
        this.root = CreateBox('shelterRoof', { width: 3.4, height: 0.18, depth: 2.4 }, scene);
        this.roofMaterial = flat(scene, 'shelterRoofMat', PALETTE.thatch);
        this.root.material = this.roofMaterial;
        this.root.rotation.x = -0.5;
        this.root.isPickable = true;
        this.root.metadata = { shelter: true };

        for (const side of [-1, 1]) {
            const pole = CreateCylinder(`shelterPole${side}`, { height: 2.1, diameter: 0.16, tessellation: 6 }, scene);
            pole.material = flat(scene, 'shelterPoleMat', PALETTE.trunk);
            pole.parent = this.root;
            pole.position.set(0, -1.05, side * 1.05);
            pole.rotation.x = 0.5; // undo the parent's tilt so poles stand vertical
            pole.isPickable = false;
        }

        this.shadow = makeShadow(scene, 2.2);
        this.setBuilt(false);
    }

    private setBuilt(built: boolean): void {
        this.built = built;
        this.root.setEnabled(built);
        this.shadow.setEnabled(built);
    }

    /** The shelter's footprint, so the player cannot stand inside the poles. */
    obstacle(state: GameState): Obstacle | null {
        return state.shelter.built ? { x: state.shelter.x, z: state.shelter.y, radius: TUNE.shelterCollisionRadius } : null;
    }

    update(state: GameState, groundY: number): void {
        const built = state.shelter.built;
        if (built !== this.built) this.setBuilt(built);
        if (!built) return;

        this.root.position.set(state.shelter.x, groundY + 2.05, state.shelter.y);
        this.shadow.position.set(state.shelter.x, groundY + 0.02, state.shelter.y);

        //  Disrepair dims the thatch — visible neglect, never removal.
        const inRepair = state.shelter.durability > 0;
        this.roofMaterial.diffuseColor = colour(inRepair ? PALETTE.thatch : PALETTE.disrepair);
    }
}

export class StorageView {
    private crate: Mesh;
    private crateMaterial: StandardMaterial;
    private shadow: Mesh;
    private built = false;

    constructor(scene: Scene) {
        this.crate = CreateBox('storageCrate', { width: 1.1, height: 0.9, depth: 1.1 }, scene);
        this.crateMaterial = flat(scene, 'storageCrateMat', PALETTE.crateWood);
        this.crate.material = this.crateMaterial;
        this.crate.isPickable = true;
        this.crate.metadata = { storage: true };

        const lid = CreateBox('storageLid', { width: 1.2, height: 0.12, depth: 1.2 }, scene);
        lid.material = this.crateMaterial;
        lid.parent = this.crate;
        lid.position.y = 0.51;
        lid.isPickable = true;
        lid.metadata = { storage: true };

        this.shadow = makeShadow(scene, 0.9);
        this.setBuilt(false);
    }

    private setBuilt(built: boolean): void {
        this.built = built;
        this.crate.setEnabled(built);
        this.shadow.setEnabled(built);
    }

    /** The crate's footprint, so the player cannot walk through it. */
    obstacle(state: GameState): Obstacle | null {
        return state.storage.built ? { x: state.storage.x, z: state.storage.y, radius: TUNE.storageCollisionRadius } : null;
    }

    update(state: GameState, groundY: number): void {
        const built = state.storage.built;
        if (built !== this.built) this.setBuilt(built);
        if (!built) return;

        this.crate.position.set(state.storage.x, groundY + 0.45, state.storage.y);
        this.shadow.position.set(state.storage.x, groundY + 0.02, state.storage.y);

        const inRepair = state.storage.durability > 0;
        this.crateMaterial.diffuseColor = colour(inRepair ? PALETTE.crateWood : PALETTE.disrepair);
    }
}

/** Keep the node-kind union honest against the mesh builder at compile time. */
const _EXHAUSTIVE: Record<NodeKind, true> = {
    driftwood: true, deadfall: true, tree: true, rock: true,
    berrybush: true, coconutpalm: true, reed: true, shellfish: true, crashbox: true
};
void _EXHAUSTIVE;
