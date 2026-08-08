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

import { isFireLit, regrowProgress, type GameState, type ItemGrade, type NodeKind, type WoodNode } from '../brain';
import { TUNE } from '../data/tune';
import { defectStage } from '../brain';
import { WORLD, surfaceHeightAt } from '../data/world';
import { PALETTE, RENDER } from './theme';
import type { Obstacle } from './island';

const colour = (c: readonly number[]) => new Color3(c[0], c[1], c[2]);

/** Grade → colour (Ch.1 v3, D-055) — the same "drawn, not just stated" rule the harvest
 *  mark already set for real-vs-decorative. One shared lookup for every graded item. */
const GRADE_COLOR: Record<ItemGrade, readonly number[]> = {
    crude: PALETTE.gradeCrude,
    serviceable: PALETTE.gradeServiceable,
    refined: PALETTE.gradeRefined,
    exceptional: PALETTE.gradeExceptional
};

/** A small stud — the grade tell. Parented to `parent`, offset by (x, y, z), coloured by
 *  grade. Unlike the harvest mark (present/absent), this one's material is set once, at
 *  creation, from whichever grade the item actually rolled. */
function addGradeMark(scene: Scene, parent: Mesh, grade: ItemGrade, x: number, y: number, z: number): Mesh {
    const mark = CreateSphere(`${parent.name}_grade`, { diameter: 0.06, segments: 6 }, scene);
    const material = new StandardMaterial(`${parent.name}_gradeMat`, scene);
    material.diffuseColor = colour(GRADE_COLOR[grade]);
    material.specularColor = new Color3(0.4, 0.4, 0.4);
    mark.material = material;
    mark.parent = parent;
    mark.position.set(x, y, z);
    mark.isPickable = false;
    return mark;
}

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
    private axeGradeMat: StandardMaterial;
    private torchHaft: Mesh;
    private torchTip: Mesh;
    private torchFlame: ParticleSystem;
    private torchLight: PointLight;
    private torchOwnedShown = false;
    private torchLitShown = false;
    private torchGradeMat: StandardMaterial;

    constructor(scene: Scene) {
        this.root = CreateCapsule('player', { height: PLAYER_HEIGHT, radius: 0.34, tessellation: 8, subdivisions: 1 }, scene);
        this.root.material = flat(scene, 'playerMat', PALETTE.player);
        this.root.isPickable = false;

        this.pack = CreateBox('pack', { width: 0.52, height: 0.5, depth: 0.28 }, scene);
        this.pack.material = flat(scene, 'packMat', PALETTE.playerPack);
        this.pack.parent = this.root;
        this.pack.position = new Vector3(0, 0.16, -0.36);
        //  FIX 5, third attempt. The pack IS a real pick target again — but every world
        //  resolver now goes through `game.ts`'s `worldPick`, which filters out anything
        //  tagged `isBody`. So this can be struck by a ray aimed at it and can never win a
        //  ray aimed past it, which was attempt one's failure (D-074), while needing no
        //  screen-space approximation, which was attempt two's (C3 A2 — it ate the player's
        //  "never mind" tap on empty ground).
        this.pack.isPickable = true;
        this.pack.metadata = { backpack: true, isBody: true };

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
        //  The grade tell (Ch.1 v3, D-055) — a small stud on the head, recoloured the
        //  first time the axe is shown (its grade is rolled at craft time, never after).
        const axeGradeMark = addGradeMark(scene, head, 'serviceable', 0, 0.09, 0.12);
        this.axeGradeMat = axeGradeMark.material as StandardMaterial;
        this.axe = haft;
        this.axe.parent = this.root;
        this.axe.position.set(-0.3, -0.1, -0.3);
        this.axe.rotation.set(0.3, 0, Math.PI / 2.6);
        this.axe.setEnabled(false);

        //  The torch (FIX-5, Living Island Track A): same "no equip step, owning it is
        //  carrying it" rule the axe already set, on the opposite hip so the two never
        //  visually collide. Unlit = haft only, no flame. Lit = flame + a small point
        //  light, following the tip via `getAbsolutePosition()` each frame (`syncTorch`)
        //  rather than parenting the light itself — the same manual-update pattern
        //  FireView already uses for its own light, kept consistent rather than mixed.
        this.torchHaft = CreateCylinder('torchHaft', { height: 0.5, diameter: 0.045, tessellation: 6 }, scene);
        this.torchHaft.material = flat(scene, 'torchHaftMat', PALETTE.deadfall);
        this.torchHaft.isPickable = false;
        this.torchHaft.parent = this.root;
        this.torchHaft.position.set(0.3, -0.02, -0.28);
        this.torchHaft.rotation.set(-0.35, 0, -Math.PI / 2.9);
        this.torchHaft.setEnabled(false);

        //  The grade tell (Ch.1 v3, D-055) — same rule as the axe's, on the haft.
        const torchGradeMark = addGradeMark(scene, this.torchHaft, 'serviceable', 0, 0.16, 0);
        this.torchGradeMat = torchGradeMark.material as StandardMaterial;

        this.torchTip = CreateSphere('torchTip', { diameter: 0.02, segments: 2 }, scene);
        this.torchTip.isVisible = false;
        this.torchTip.isPickable = false;
        this.torchTip.parent = this.torchHaft;
        this.torchTip.position.set(0, 0.27, 0);

        this.torchLight = new PointLight('torchLight', new Vector3(0, 0, 0), scene);
        this.torchLight.diffuse = colour(PALETTE.flame);
        this.torchLight.range = 9;
        this.torchLight.intensity = 0;

        this.torchFlame = this.buildTorchFlame(scene);

        this.shadow = makeShadow(scene, 0.6);
    }

    private buildTorchFlame(scene: Scene): ParticleSystem {
        //  A smaller cousin of FireView's own flame texture/technique — kept local rather
        //  than shared, so this fix does not risk touching the fire's already-proven system.
        const texture = new DynamicTexture('torchSpark', { width: 24, height: 24 }, scene, false);
        const ctx = texture.getContext() as unknown as CanvasRenderingContext2D;
        const gradient = ctx.createRadialGradient(12, 12, 0, 12, 12, 12);
        gradient.addColorStop(0, 'rgba(255,255,255,1)');
        gradient.addColorStop(0.45, 'rgba(255,220,150,0.75)');
        gradient.addColorStop(1, 'rgba(255,160,60,0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 24, 24);
        texture.update();
        texture.hasAlpha = true;

        const system = new ParticleSystem('torchFlames', 30, scene);
        system.particleTexture = texture as unknown as Texture;
        system.emitter = new Vector3(0, 0, 0);
        system.minEmitBox = new Vector3(-0.03, 0, -0.03);
        system.maxEmitBox = new Vector3(0.03, 0.04, 0.03);
        system.color1 = new Color4(1, 0.72, 0.28, 1);
        system.color2 = new Color4(1, 0.42, 0.12, 1);
        system.colorDead = new Color4(0.35, 0.12, 0.05, 0);
        system.minSize = 0.1;
        system.maxSize = 0.22;
        system.minLifeTime = 0.2;
        system.maxLifeTime = 0.4;
        system.emitRate = 22;
        system.direction1 = new Vector3(-0.2, 1.4, -0.2);
        system.direction2 = new Vector3(0.2, 2.0, 0.2);
        system.minEmitPower = 0.3;
        system.maxEmitPower = 0.7;
        system.gravity = new Vector3(0, 0.8, 0);
        system.blendMode = ParticleSystem.BLENDMODE_ADD;
        return system;
    }

    /** Plant the feet on the ground at (x, z), and lay the shadow flat where they land. */
    place(x: number, groundY: number, z: number, facingRadians: number): void {
        this.root.position.set(x, groundY + PLAYER_HEIGHT / 2, z);
        this.root.rotation.y = facingRadians;
        //  The shadow sits just above the surface at the feet — the fix for the float.
        this.shadow.position.set(x, groundY + 0.03, z);
    }

    /** Show or hide the carried axe. Owning it is the only gate — there is no equip step.
     *  `grade` is rolled once at craft time (Ch.1 v3, D-055) and never changes again, so
     *  the mark's colour is only ever set on the shown-transition, matching the pattern
     *  `axeShown` already uses to skip redundant work. */
    syncTools(hasAxe: boolean, grade: ItemGrade): void {
        if (hasAxe === this.axeShown) return;
        this.axeShown = hasAxe;
        this.axe.setEnabled(hasAxe);
        if (hasAxe) this.axeGradeMat.diffuseColor = colour(GRADE_COLOR[grade]);
    }

    /** Show/hide the carried torch and its flame+light, following the tip each frame while
     *  lit. Call AFTER `place()` so the root's transform this frame is already current —
     *  `getAbsolutePosition()` reads it fresh. `nightFactor` scales intensity the same way
     *  the fire's own light does (D-036/FireView), so the torch reads strongest at night
     *  without ever being fully invisible by day. */
    syncTorch(owned: boolean, lit: boolean, nightFactor: number, grade: ItemGrade): void {
        if (owned !== this.torchOwnedShown) {
            this.torchOwnedShown = owned;
            this.torchHaft.setEnabled(owned);
            if (owned) this.torchGradeMat.diffuseColor = colour(GRADE_COLOR[grade]);
        }
        if (lit !== this.torchLitShown) {
            this.torchLitShown = lit;
            if (lit) this.torchFlame.start();
            else this.torchFlame.stop();
        }
        if (lit) {
            const tip = this.torchTip.getAbsolutePosition();
            this.torchLight.position.copyFrom(tip);
            (this.torchFlame.emitter as Vector3).copyFrom(tip);
            this.torchLight.intensity = 0.3 + 0.8 * nightFactor;
        } else {
            this.torchLight.intensity = 0;
        }
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
    /** Set only for `tree` — the canopy hides separately at the stump stage (D-051). */
    canopy?: Mesh;
    halo: Mesh;
    shadow: Mesh;
    /** Footprint radius for collision, or 0 if the player may walk over it. */
    obstacleRadius: number;
    /** Ground height at this node, and the body mesh's height above it at full scale
     *  (D-051). A depleted remnant scales the mesh down around its own pivot — without
     *  also scaling this offset, the shrunken mesh floats at its old, full-height centre
     *  instead of sitting on the ground. */
    groundY: number;
    baseYOffset: number;
}

/** A short, bright band — the harvestable "blaze mark" (D-051): present = real, absent =
 *  decorative scenery. Parented to `parent`, offset upward by `y`. */
function addHarvestMark(scene: Scene, parent: Mesh, y: number, diameter: number, material: StandardMaterial): Mesh {
    const mark = CreateCylinder(`${parent.name}_mark`, { height: 0.14, diameter, tessellation: 8 }, scene);
    mark.material = material;
    mark.parent = parent;
    mark.position.y = y;
    mark.isPickable = false;
    return mark;
}

/** Build the mesh for one node kind at (x, groundY, z). Returns [mesh, shadowRadius, obstacleRadius]. */
function buildNodeMesh(scene: Scene, node: WoodNode, groundY: number, index: number, materials: NodeMaterials): {
    mesh: Mesh;
    canopy?: Mesh;
    shadowRadius: number;
    obstacleRadius: number;
} {
    const at = (mesh: Mesh, yOffset: number, shadow: number, obstacle: number, canopy?: Mesh) => {
        mesh.position.set(node.x, groundY + yOffset, node.y);
        mesh.isPickable = true;
        mesh.metadata = { nodeId: node.id };
        return { mesh, canopy, shadowRadius: shadow, obstacleRadius: obstacle };
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
            //  A standing tree: trunk + canopy, parented so both fell together. The blaze
            //  mark (D-051) is the entire distinction from the decorative treeline behind
            //  it — same trunk, same canopy, present here and only here.
            const trunk = CreateCylinder(`n_${node.id}`, { height: 6.0, diameterTop: 0.5, diameterBottom: 0.85, tessellation: 6 }, scene);
            trunk.material = materials.trunk;
            const canopy = CreateCylinder(`nc_${node.id}`, { height: 4.6, diameterTop: 0, diameterBottom: 4.4, tessellation: 7 }, scene);
            canopy.material = materials.canopy;
            canopy.parent = trunk;
            canopy.position.y = 4.0;
            canopy.isPickable = true;
            canopy.metadata = { nodeId: node.id };
            addHarvestMark(scene, trunk, -1.2, 0.62, materials.harvestMark);
            return at(trunk, 3.0, 1.1, TUNE.treeCollisionRadius, canopy);
        }
        case 'rock': {
            const m = CreateCylinder(`n_${node.id}`, { height: 1.4, diameterTop: 1.1, diameterBottom: 1.9, tessellation: 5 }, scene);
            m.material = materials.rock;
            m.rotation.y = index * 0.9;
            addHarvestMark(scene, m, 0.75, 0.45, materials.harvestMark);
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
        case 'boulder': {
            //  THE BEDROCK BLUFF. World-truth distinct from BOTH other stone tiers at a
            //  glance, which the honesty rules require: the scattered outcrops are small and
            //  rounded, the quarry is a cluster of loose chunks, and this is ONE massive
            //  slab — taller than the player, flat-faced, unmistakably part of the island
            //  rather than sitting on it.
            //
            //  It carries NO harvest blaze-mark. That mark means "this has been worked and is
            //  closer to spent", and the bluff is never closer to spent. Marking it would be
            //  the same lie as a shrink animation, in a smaller font.
            const slab = CreateCylinder(`n_${node.id}`, { height: 4.2, diameterTop: 3.1, diameterBottom: 3.9, tessellation: 7 }, scene);
            slab.material = materials.quarry;
            slab.rotation.y = index * 0.7;
            //  A shoulder of bedrock at the base, so it reads as rooted rather than dropped.
            const shoulder = CreateCylinder(`n_${node.id}_base`, { height: 1.3, diameterTop: 4.4, diameterBottom: 5.2, tessellation: 7 }, scene);
            shoulder.material = materials.quarry;
            shoulder.parent = slab;
            shoulder.position.y = -1.9;
            shoulder.isPickable = true;
            shoulder.metadata = { nodeId: node.id };
            return at(slab, 2.1, 4.2, TUNE.boulderCollisionRadius);
        }
        case 'quarry': {
            //  One large, visible outcrop — a cluster, not a single boulder, so it reads as
            //  bigger and more substantial than the scattered rk1-3 stone at a glance.
            const main = CreateCylinder(`n_${node.id}`, { height: 2.6, diameterTop: 1.8, diameterBottom: 2.8, tessellation: 6 }, scene);
            main.material = materials.quarry;
            //  Offsets kept inside `quarryCollisionRadius` (D-051) — a chunk poking out past
            //  the collision footprint would let it visually clip through the player.
            for (const [ox, oz, s] of [[0.87, 0.4, 0.55], [-0.73, 0.53, 0.5], [0.27, -0.87, 0.45]] as const) {
                const chunk = CreateCylinder(`n_${node.id}_${ox}`, { height: 1.6, diameterTop: 1.2, diameterBottom: 1.9, tessellation: 5 }, scene);
                chunk.material = materials.quarry;
                chunk.parent = main;
                chunk.position.set(ox, -0.5, oz);
                chunk.scaling.setAll(s * 2);
                chunk.isPickable = true;
                chunk.metadata = { nodeId: node.id };
            }
            addHarvestMark(scene, main, 1.6, 0.9, materials.harvestMark);
            return at(main, 1.1, 2.2, TUNE.quarryCollisionRadius);
        }
        case 'salvage': {
            //  Washed-up flotsam: a low crate plus a loose plank, distinct from every other
            //  silhouette on the beach — never confused for driftwood or the crash box.
            const crate = CreateBox(`n_${node.id}`, { width: 0.8, height: 0.42, depth: 0.6 }, scene);
            crate.material = materials.salvage;
            crate.rotation.y = index * 0.6;
            const plank = CreateBox(`n_${node.id}_plank`, { width: 1.3, height: 0.08, depth: 0.22 }, scene);
            plank.material = materials.salvage;
            plank.parent = crate;
            plank.position.set(0.5, 0.05, 0.5);
            plank.rotation.y = 0.5;
            plank.isPickable = true;
            plank.metadata = { nodeId: node.id };
            return at(crate, 0.21, 0.7, 0);
        }
        case 'fishingspot': {
            //  A PATCH OF WATER, not an object. A flat ring at the SURFACE with a few small
            //  marks inside it, so it reads as "something is happening in the water here"
            //  rather than as a thing floating on it.
            //
            //  Drawn at `surfaceHeightAt` for the reason [[D-124]] exists: these sit in
            //  water from ankle-deep to seven metres, and a ring placed on the seabed at the
            //  reef would be invisible from a boat. Tapping it works because `screenOfMesh`
            //  aims at the mesh's own centre — the height-guessing aim path could not have
            //  reached a flat mark on the water at all ([[D-127]]).
            const ring = CreateCylinder(`n_${node.id}`, { height: 0.06, diameter: 3.0, tessellation: 16 }, scene);
            ring.material = node.available ? materials.fishRing : materials.fishRingSpent;
            for (let m = 0; m < 3; m++) {
                const mark = CreateCylinder(`n_${node.id}_m${m}`, { height: 0.05, diameter: 0.5, tessellation: 8 }, scene);
                mark.material = ring.material;
                mark.parent = ring;
                const a = m * 2.09 + index;
                mark.position.set(Math.cos(a) * 0.85, 0.02, Math.sin(a) * 0.85);
                mark.isPickable = true;
                mark.metadata = { nodeId: node.id };
            }
            const placed = at(ring, 0.03, 0, 0);
            ring.position.y = surfaceHeightAt(node.x, node.y) + 0.03;
            return placed;
        }
        case 'divepart': {
            //  THE UNDERWATER SLICE. Sitting on the SEABED, not at the waterline — this is the
            //  first content in the game that is genuinely below the surface, and drawing it
            //  at sea level would make the whole depth model a lie the player can see.
            //
            //  `screenOfMesh` is what makes it tappable: the old aim path derived a height
            //  from the surface and could never have reached something 7 m down. See
            //  game.ts's header for the two defects that produced that fix.
            const hull = CreateBox(`n_${node.id}`, { width: 1.2, height: 0.7, depth: 1.4 }, scene);
            hull.material = materials.divepart;
            hull.rotation.y = index * 0.9;
            hull.rotation.z = 0.16 + (index % 2) * 0.2;
            const spar = CreateCylinder(`n_${node.id}_spar`, { height: 1.5, diameter: 0.2, tessellation: 5 }, scene);
            spar.material = materials.divepart;
            spar.parent = hull;
            spar.rotation.z = Math.PI / 2;
            spar.position.set(0, 0.22, -0.2);
            spar.isPickable = true;
            spar.metadata = { nodeId: node.id };
            const placed = at(hull, 0.35, 0.9, 0);
            //  ON THE BOTTOM. `groundY` out here is the seabed, which is exactly right.
            hull.position.y = groundY + 0.35;
            return placed;
        }
        case 'wreckpart': {
            //  THE WRECK SLICE. A torn section of hull plate with a rib behind it, floating
            //  at the waterline rather than standing on the seabed eight metres down — the
            //  same rule the raft's deck follows, and for the same reason: reading `groundY`
            //  out here would sink every part out of sight.
            //
            //  Angled by index so the six parts do not read as six identical crates. This is
            //  ONE broken ship seen from six sides, not a row of containers.
            const plate = CreateBox(`n_${node.id}`, { width: 1.5, height: 0.5, depth: 1.1 }, scene);
            plate.material = materials.wreckpart;
            plate.rotation.y = index * 1.1;
            plate.rotation.z = 0.22 + (index % 3) * 0.14;
            const rib = CreateCylinder(`n_${node.id}_rib`, { height: 1.7, diameter: 0.16, tessellation: 5 }, scene);
            rib.material = materials.wreckpart;
            rib.parent = plate;
            rib.rotation.x = Math.PI / 2;
            rib.position.set(0, 0.18, 0.1);
            rib.isPickable = true;
            rib.metadata = { nodeId: node.id };
            //  Placed against the SEA SURFACE, not the ground under it.
            const floated = at(plate, 0.2, 0.9, 0);
            plate.position.y = WORLD.seaLevel + 0.2;
            return floated;
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
    quarry: StandardMaterial;
    salvage: StandardMaterial;
    wreckpart: StandardMaterial;
    divepart: StandardMaterial;
    fishRing: StandardMaterial;
    fishRingSpent: StandardMaterial;
    harvestMark: StandardMaterial;
}

export class NodeViews {
    readonly views: NodeView[] = [];
    private ring: Mesh;
    private ringTexture: DynamicTexture;
    private readonly scene: Scene;
    private readonly materials: NodeMaterials;
    private readonly heightAt: (x: number, z: number) => number;
    private nextIndex = 0;

    constructor(scene: Scene, nodes: WoodNode[], heightAt: (x: number, z: number) => number) {
        this.scene = scene;
        this.heightAt = heightAt;
        this.materials = {
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
            halo: haloMaterial(scene),
            quarry: flat(scene, 'm_quarry', PALETTE.quarryStone),
            salvage: flat(scene, 'm_salvage', PALETTE.salvageWood),
            //  Dark, corroded steel — nothing else on this island is this colour, which is
            //  the point: a wreck part must never read as driftwood.
            wreckpart: flat(scene, 'm_wreckpart', PALETTE.wreckHull),
            //  Darker still than the surface hull: less light gets down there, and nothing
            //  else in the game is this colour.
            divepart: flat(scene, 'm_divepart', PALETTE.diveHull),
            //  Two materials rather than one tinted at runtime: a spent site must be legible
            //  at a glance from across the water, and swapping the whole material is how
            //  every other state change in this file is drawn.
            fishRing: flat(scene, 'm_fishRing', PALETTE.fishRing),
            fishRingSpent: flat(scene, 'm_fishRingSpent', PALETTE.fishRingSpent),
            harvestMark: flat(scene, 'm_harvestMark', PALETTE.harvestMark)
        };

        for (const node of nodes) this.addView(node);

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

    /** Build and register the view for one node — at boot, or for a salvage find that
     *  spawns mid-run (D-051): the view list is not fixed at construction time. */
    private addView(node: WoodNode): void {
        const ground = this.heightAt(node.x, node.y);
        const built = buildNodeMesh(this.scene, node, ground, this.nextIndex++, this.materials);
        built.mesh.setEnabled(node.available);

        const halo = CreateDisc(`halo_${node.id}`, { radius: Math.max(1.0, built.obstacleRadius + 0.9), tessellation: 24 }, this.scene);
        halo.rotation.x = Math.PI / 2;
        halo.position.set(node.x, ground + 0.06, node.y);
        halo.material = this.materials.halo;
        halo.isPickable = false;
        halo.setEnabled(false);

        const shadow = makeShadow(this.scene, built.shadowRadius);
        shadow.position.set(node.x, ground + 0.02, node.y);
        shadow.setEnabled(node.available);

        this.views.push({
            node, body: built.mesh, canopy: built.canopy, halo, shadow, obstacleRadius: built.obstacleRadius,
            groundY: ground, baseYOffset: built.mesh.position.y - ground
        });
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
        //  New nodes (beach salvage spawns, D-051) can appear mid-run — the view list is
        //  reconciled against live state every frame, not just built once at boot.
        for (const liveNode of state.nodes) {
            if (!this.views.some((v) => v.node.id === liveNode.id)) this.addView(liveNode);
        }

        for (const view of this.views) {
            const live = state.nodes.find((n) => n.id === view.node.id);
            const available = live?.available ?? false;
            view.node.available = available;
            view.node.depletedAtGameHours = live?.depletedAtGameHours ?? null;

            //  Renewability law (D-051): a claimed node no longer just vanishes — it reads
            //  as depleted (a stump, a sapling regrowing, a shrunken remnant) until it comes
            //  back.
            //
            //  DEPLETION VISUALS split by nature (FIX-4, Living Island Track A) — this
            //  CHANGES which kinds take which treatment, it does not just add a new one.
            //  A LIVING/mineral node that regrows FROM ITSELF (a tree, a bush, a rock
            //  outcrop, a palm, the quarry) keeps the shrink-to-remnant-then-regrow
            //  treatment below — correct, unchanged. A CONSUMED-LOOT node (driftwood,
            //  deadfall — loose material, not a living thing with a smaller "in-between"
            //  state — plus the crash box and a claimed salvage find, both one-time finds)
            //  must never fake a regrow scale: it simply leaves until a fresh one is
            //  available (the tide, the renewability timer, or a new spawn elsewhere for
            //  salvage), at full scale, with no shrunken stage in between.
            //
            //  Scaling a mesh shrinks it around its OWN pivot, which sits at the object's
            //  full-height centre (`baseYOffset` above the ground) — scale alone would leave
            //  a "stump" floating at the old full-height centre instead of on the ground.
            //  Repositioning the pivot to `groundY + baseYOffset * scale` keeps its (now
            //  smaller) base sitting exactly on the ground, for any symmetric mesh.
            const isConsumedLoot =
                view.node.kind === 'crashbox' ||
                view.node.kind === 'salvage' ||
                view.node.kind === 'driftwood' ||
                view.node.kind === 'deadfall';
            const setScale = (s: number, sy = s) => {
                view.body.scaling.set(s, sy, s);
                view.body.position.y = view.groundY + view.baseYOffset * sy;
            };
            //  FISHING — a spot never shrinks and never vanishes; it CHANGES COLOUR. It is a
            //  patch of water, so a "remnant" would be nonsense and disappearing would be a
            //  lie. This is the one kind whose depleted state is read by material alone.
            if (view.node.kind === 'fishingspot') {
                view.body.setEnabled(true);
                setScale(1);
                view.shadow.setEnabled(false);
                view.halo.setEnabled(false);
                const skin = available ? this.materials.fishRing : this.materials.fishRingSpent;
                view.body.material = skin;
                for (const child of view.body.getChildMeshes()) child.material = skin;
                continue;
            }
            if (available) {
                view.body.setEnabled(true);
                setScale(1);
                if (view.canopy) view.canopy.setEnabled(true);
                view.shadow.setEnabled(true);
            } else if (isConsumedLoot) {
                view.body.setEnabled(false);
                view.shadow.setEnabled(false);
                view.halo.setEnabled(false);
            } else if (view.node.kind === 'tree') {
                const progress = live ? regrowProgress(live, state.gameHoursElapsed) : 0;
                view.body.setEnabled(true);
                view.shadow.setEnabled(true);
                view.halo.setEnabled(false);
                if (progress < TUNE.treeSaplingAtFraction) {
                    setScale(1, 0.16); // a bare stump
                    if (view.canopy) view.canopy.setEnabled(false);
                } else {
                    setScale(0.42); // a sapling, growing back
                    if (view.canopy) view.canopy.setEnabled(true);
                }
            } else {
                //  FIX-4: the LIVING/mineral remnant — rock, quarry, coconut palm, reed,
                //  shellfish, berrybush. Smaller, not gone (D-051's "depleted states read"),
                //  and — unlike the consumed-loot branch above — genuinely regrows FROM
                //  ITSELF, so a shrink is honest here rather than a faked animation. Scale
                //  is a per-mesh transform, so this works even though every node of a kind
                //  shares one material instance.
                view.body.setEnabled(true);
                view.shadow.setEnabled(true);
                view.halo.setEnabled(false);
                setScale(0.32);
            }

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
    private sagPole: Mesh | null = null;
    private ridgeGap: Mesh | null = null;
    private roofMaterial: StandardMaterial;
    private shadow: Mesh;
    private built = false;
    private gradeMat: StandardMaterial;

    constructor(scene: Scene) {
        //  A lean-to: two angled support poles and a sloped thatch roof between them.
        this.root = CreateBox('shelterRoof', { width: 3.4, height: 0.18, depth: 2.4 }, scene);
        this.roofMaterial = flat(scene, 'shelterRoofMat', PALETTE.thatch);
        this.root.material = this.roofMaterial;
        this.root.rotation.x = -0.5;
        this.root.isPickable = true;
        this.root.metadata = { shelter: true };

        let firstPole: Mesh | null = null;
        for (const side of [-1, 1]) {
            const pole = CreateCylinder(`shelterPole${side}`, { height: 2.1, diameter: 0.16, tessellation: 6 }, scene);
            pole.material = flat(scene, 'shelterPoleMat', PALETTE.trunk);
            pole.parent = this.root;
            pole.position.set(0, -1.05, side * 1.05);
            pole.rotation.x = 0.5; // undo the parent's tilt so poles stand vertical
            pole.isPickable = false;
            if (!firstPole) firstPole = pole;
            //  ENTROPY & MAINTENANCE — the UPHILL footing is the one that rots, so the pole
            //  that leans when it goes is a specific pole rather than "the shelter".
            if (side === -1) this.sagPole = pole;
        }
        //  THE GAP IN THE THATCH, drawn as a dark band along the ridge and hidden while the
        //  roof is sound. A visible cue rather than a readout: the dossier's whole objection
        //  to a durability bar is that a number is not something you can SEE from across a
        //  clearing, and this is what seeing it looks like.
        this.ridgeGap = CreateBox('shelterRidgeGap', { width: 3.2, height: 0.06, depth: 0.42 }, scene);
        this.ridgeGap.material = flat(scene, 'shelterGapMat', PALETTE.thatchGap);
        this.ridgeGap.parent = this.root;
        this.ridgeGap.position.set(0, 0.13, 0);
        this.ridgeGap.isPickable = false;
        this.ridgeGap.setEnabled(false);
        //  The grade tell (Ch.1 v3, D-055) — same rule as the axe's/torch's, on a pole.
        const gradeMark = addGradeMark(scene, firstPole!, 'serviceable', 0, 0.9, 0);
        this.gradeMat = gradeMark.material as StandardMaterial;

        //  The whole silhouette is the target, not just the roof (URGENT FIX, 2026-07-27).
        //  The roof slab was the only pickable part of the shelter and it is 0.18 m thick and
        //  tilted, so from most angles it presents almost no screen area; the two poles — the
        //  tall, obvious thing a player actually aims at — were `isPickable = false`, so taps
        //  on them passed straight through to the terrain BEHIND the shelter, which is past
        //  the forgiveness radius and therefore resolved to nothing. The result was that sleep
        //  could only be triggered from the one patch of ground at the base where the ray
        //  happened to land close enough to the centre. Same family as the Build-button
        //  visibility gap: the interactive area has to be the area the player can see.
        for (const part of this.root.getChildMeshes()) {
            part.isPickable = true;
            part.metadata = { shelter: true };
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
        if (built !== this.built) {
            this.setBuilt(built);
            //  Grade is rolled once at build time (Ch.1 v3, D-055) and never changes —
            //  only set the mark's colour on this transition, the same pattern the axe
            //  and torch already use.
            if (built) this.gradeMat.diffuseColor = colour(GRADE_COLOR[state.shelter.grade]);
        }
        if (!built) return;

        //  ---- ENTROPY & MAINTENANCE (v0.11 §8): the building SHOWS what is wrong ----
        //
        //  Read every frame rather than set once at a transition, because unlike the grade
        //  these change while you are standing there. Two cues, at the two places you can see
        //  from outside — a leaning footing and a gap in the ridge — and both are set from the
        //  brain's own named stage rather than from a number this file re-derives.
        //
        //  The dossier's whole objection to a durability bar is that a percentage is not
        //  something a survivor can SEE from across a clearing. This is what seeing it looks
        //  like, and it is why the defect model had to be per-location: "63%" has nowhere to
        //  lean and nothing to open.
        const footing = defectStage(state, 'footing');
        if (this.sagPole) {
            //  A rotted footing lets that corner drop and the whole frame rack over. The lean
            //  is the load path failing, drawn.
            this.sagPole.rotation.z = footing === 'failing' ? 0.16 : footing === 'showing' ? 0.06 : 0;
        }
        const thatch = defectStage(state, 'thatch');
        if (this.ridgeGap) {
            this.ridgeGap.setEnabled(thatch !== 'sound');
            this.ridgeGap.scaling.z = thatch === 'failing' ? 1 : 0.45;
        }
        //  A parted lashing racks the whole roof, which is the one defect visible in the
        //  silhouette rather than at a point on it.
        const lashing = defectStage(state, 'lashing');
        this.root.rotation.z = lashing === 'failing' ? 0.09 : lashing === 'showing' ? 0.035 : 0;

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

/**
 * THE RAFT (the Maritime Slice) — the first built thing in this game whose position moves.
 *
 * Everything else `update`s from a fixed site: the shelter, the crate, the fire and the cave
 * are placed once and then only ever recoloured. The raft's whole point is that its position
 * IS the survivor's while they are standing on it, so this view reads `state.raft.x/y` every
 * frame like the boars do, rather than freezing a world matrix like the crate does.
 *
 * It floats at the SEA SURFACE, never at the terrain height — a deck that tracked the seabed
 * would sink out of sight the moment it left the shelf.
 */
export class RaftView {
    private deck: Mesh;
    private built = false;

    constructor(scene: Scene) {
        this.deck = CreateBox('raftDeck', { width: 2.4, height: 0.22, depth: 2.8 }, scene);
        this.deck.material = flat(scene, 'raftDeckMat', PALETTE.deadfall);
        this.deck.isPickable = true;
        //  Tapped like every other object in the world — the metadata key is what routes a
        //  pick to the raft's verb circle (D-042: tap the thing to use the thing).
        this.deck.metadata = { raft: true };

        //  Three lashed logs across the deck, so it reads as a made thing rather than a
        //  floating plank. Children of the deck, so they move with it for free.
        for (let i = 0; i < 3; i++) {
            const log = CreateCylinder(`raftLog${i}`, { height: 2.6, diameter: 0.34, tessellation: 6 }, scene);
            log.material = this.deck.material;
            log.parent = this.deck;
            log.rotation.x = Math.PI / 2;
            log.position.set(-0.8 + i * 0.8, 0.16, 0);
            log.isPickable = true;
            log.metadata = { raft: true };
        }
        this.setBuilt(false);
    }

    private setBuilt(built: boolean): void {
        this.built = built;
        this.deck.setEnabled(built);
        //  D-049's lesson: disabling a mesh does not stop it eating taps. Clear pickability
        //  on the whole hierarchy, or an unbuilt raft's invisible deck intercepts a tap meant
        //  for the water behind it.
        this.deck.isPickable = built;
        for (const child of this.deck.getChildMeshes()) child.isPickable = built;
    }

    update(state: GameState): void {
        const built = state.raft.built;
        if (built !== this.built) this.setBuilt(built);
        if (!built) return;
        this.deck.position.set(state.raft.x, WORLD.seaLevel + RENDER.raftFloatM, state.raft.y);
    }

    /** Matches the signature the craft handler calls; the height source is unused because a
     *  raft floats on the sea, not on the ground under it. */
    sync(state: GameState, _heightAt: (x: number, z: number) => number): void {
        this.update(state);
    }
}

/** Keep the node-kind union honest against the mesh builder at compile time. */
const _EXHAUSTIVE: Record<NodeKind, true> = {
    driftwood: true, deadfall: true, tree: true, rock: true,
    berrybush: true, coconutpalm: true, reed: true, shellfish: true, crashbox: true,
    quarry: true, boulder: true, salvage: true, wreckpart: true, divepart: true, fishingspot: true
};
void _EXHAUSTIVE;

/**
 * THE CAVE (Drop 3 Part 2 item 2) — the body [[D-117]] shipped without, and named as its own
 * blocker: *"mechanically reachable, not findable"*.
 *
 * WHAT WAS ACTUALLY MISSING. The cave had state, a refuge profile, a migration and passing
 * reachability tests, and nothing on screen. A survivor who happened to walk within 3 m of an
 * invisible point got shelter; everyone else played a game where it did not exist. That is
 * D-090 failed on the discovery half — the same shape as the spear, which had a recipe, a
 * craft function and no surface.
 *
 * IT IS BUILT TO BE RECOGNISED FROM FAR AWAY, which is the only requirement that matters here.
 * The bluff is large and light; the MOUTH is near-black. An opening reads as an opening because
 * it is darker than what surrounds it, and that holds at any distance, in any light, without a
 * label. No blaze-mark: that mark means "this is harvestable and getting closer to spent"
 * (D-051), and a cave is neither.
 *
 * IT IS ALWAYS VISIBLE, NEVER GATED ON `found`. Hiding the mesh until the survivor has found it
 * would make finding it impossible — you cannot walk toward something you cannot see. `found`
 * records that they HAVE been, which is a different fact and belongs in the brain.
 */
export class CaveView {
    private root: Mesh;
    private shadow: Mesh;

    constructor(scene: Scene) {
        //  The bluff: a broad, squat mass. Deliberately not a sphere — a rounded hill reads as
        //  terrain, and this has to read as rock you could walk into.
        this.root = CreateCylinder('caveBluff', { height: 7.2, diameterTop: 6.4, diameterBottom: 9.6, tessellation: 7 }, scene);
        this.root.material = flat(scene, 'caveRockMat', PALETTE.caveRock);
        this.root.isPickable = true;
        this.root.metadata = { cave: true };

        //  THE MOUTH. A dark recess set into the face, pushed slightly proud of the bluff so it
        //  cannot z-fight with the surface it sits on — a renderer nudge, kept in the renderer
        //  where it is visible, never folded back into the position the game believes (the rule
        //  `settleOnTerrain` states and D-051's floating-remnant bug earned).
        const mouth = CreateCylinder('caveMouth', { height: 3.6, diameter: 3.2, tessellation: 6 }, scene);
        mouth.material = flat(scene, 'caveMouthMat', PALETTE.caveMouth);
        mouth.parent = this.root;
        mouth.rotation.x = Math.PI / 2;
        mouth.position.set(0, -1.6, 3.5);
        mouth.isPickable = true;
        mouth.metadata = { cave: true };

        this.shadow = makeShadow(scene, 5.2);
    }

    /**
     * The bluff is solid; the MOUTH is not.
     *
     * A single collision radius over the whole thing would wall the survivor out of the one
     * place they are trying to reach, and `updateCavePresence` would then never fire — the
     * feature would be visible, walkable-to, and impossible to enter. So the obstacle is offset
     * back into the rock, leaving the mouth side open. Same lesson as the quarry's 2.4 m radius
     * making it unminable at any legal standing distance (D-051): geometry that looks right and
     * forbids the verb.
     */
    obstacle(state: GameState): Obstacle | null {
        return { x: state.cave.x, z: state.cave.y - 2.6, radius: TUNE.caveCollisionRadiusM };
    }

    update(state: GameState, groundY: number): void {
        this.root.position.set(state.cave.x, groundY + 3.4, state.cave.y);
        this.shadow.position.set(state.cave.x, groundY + 0.02, state.cave.y);
    }
}

/**
 * THE PLACEMENT GHOST — properties 1, 2 and 5 of the LDOE bar, made real.
 *
 * [[D-117]] pinned the bar down and shipped it as a SPECIFICATION: five properties, three
 * property-tested in the brain, and two — the ghost and the one-tap commit — declared
 * `witness: 'device'` and not built. This is the ghost.
 *
 * PROPERTY 1: it shows BEFORE you commit. It appears the moment the site card opens, at the
 * point the survivor actually chose, so the question "what will this look like there" is
 * answered by looking rather than by building and regretting.
 *
 * PROPERTY 2: COLOUR IS THE WHOLE VERDICT. Green is good, red is blocked, and no text is
 * required to know which — the reason lives on the card for anyone who wants it and is never
 * forced on anyone who does not. The colour is driven by `PlacementPreview.valid`, a real
 * boolean, which is exactly why the brain keeps the verdict separable from the reason string.
 *
 * PROPERTY 5: it settles on the terrain. The position comes straight from `heightAt` with no
 * offset of its own; the only lift is the mesh's own half-height, which is geometry rather
 * than a fudge. Every floating-structure bug this project has had came from a well-meant
 * constant added here (D-051's remnant scale left depleted nodes hanging in the air).
 *
 * IT IS NEVER PICKABLE. A ghost that could intercept a tap would eat the very commit gesture
 * it exists to inform — the spent-node defect (D-049) exactly, where invisible geometry stayed
 * a live pick target and silently swallowed taps meant for what was behind it.
 */
export class GhostView {
    private root: Mesh;
    private material: StandardMaterial;
    private ring: Mesh;

    constructor(scene: Scene) {
        this.root = CreateBox('placementGhost', { width: 3.4, height: 2.0, depth: 2.4 }, scene);
        this.material = flat(scene, 'placementGhostMat', PALETTE.ghostValid);
        this.material.alpha = 0.42;
        this.root.material = this.material;
        this.root.isPickable = false;

        //  A footprint ring on the ground. The box says "something this big"; the ring says
        //  "standing exactly here", which is the half a floating translucent box cannot carry.
        this.ring = CreateDisc('placementGhostRing', { radius: 1.9, tessellation: 24 }, scene);
        this.ring.material = this.material;
        this.ring.rotation.x = Math.PI / 2;
        this.ring.isPickable = false;

        this.setShown(false);
    }

    private setShown(shown: boolean): void {
        this.root.setEnabled(shown);
        this.ring.setEnabled(shown);
    }

    /** Show at a settled point, coloured by the verdict alone. */
    show(x: number, z: number, groundY: number, valid: boolean): void {
        this.root.position.set(x, groundY + 1.0, z);
        this.ring.position.set(x, groundY + 0.03, z);
        this.material.diffuseColor = colour(valid ? PALETTE.ghostValid : PALETTE.ghostBlocked);
        this.material.emissiveColor = colour(valid ? PALETTE.ghostValid : PALETTE.ghostBlocked).scale(0.35);
        this.setShown(true);
    }

    hide(): void {
        this.setShown(false);
    }

    /** For the harness: is the ghost genuinely on, and what verdict is it showing? */
    debugState(): { shown: boolean; valid: boolean } {
        return { shown: this.root.isEnabled(), valid: this.material.diffuseColor.g > this.material.diffuseColor.r };
    }
}
