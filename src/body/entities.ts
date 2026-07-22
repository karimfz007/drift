/**
 * BODY — the things standing on the island: the castaway, the wood, and the fire.
 *
 * The brain owns every rule here; this file only draws its answers. Note the coordinate
 * mapping in one place: the brain's `(x, y)` is the world's `(x, z)`. It never learned
 * about the third dimension, and it never needed to.
 */

import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Scene } from '@babylonjs/core/scene';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { CreateCapsule } from '@babylonjs/core/Meshes/Builders/capsuleBuilder';
import { CreateCylinder } from '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import { CreateDisc } from '@babylonjs/core/Meshes/Builders/discBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { PointLight } from '@babylonjs/core/Lights/pointLight';
import { ParticleSystem } from '@babylonjs/core/Particles/particleSystem';
//  Side-effect only: registers the particle scene component. Without it the flames are
//  constructed, started, and never drawn — the deep-import tree-shaking trap.
import '@babylonjs/core/Particles/particleSystemComponent';
import { Color4 } from '@babylonjs/core/Maths/math.color';

import { isFireLit, type GameState, type WoodNode } from '../brain';
import { TUNE } from '../data/tune';
import { PALETTE, RENDER } from './theme';

const colour = (c: readonly number[]) => new Color3(c[0], c[1], c[2]);

/** Player capsule height, in metres — presentation, not gameplay. */
const PLAYER_HEIGHT = 1.8;

function flat(scene: Scene, name: string, rgb: readonly number[]): StandardMaterial {
    const material = new StandardMaterial(name, scene);
    material.diffuseColor = colour(rgb);
    material.specularColor = new Color3(0, 0, 0);
    return material;
}

// ---- The castaway -------------------------------------------------------

export class PlayerView {
    readonly root: Mesh;
    private pack: Mesh;

    constructor(scene: Scene) {
        this.root = CreateCapsule(
            'player',
            { height: PLAYER_HEIGHT, radius: 0.34, tessellation: 8, subdivisions: 1 },
            scene
        );
        this.root.material = flat(scene, 'playerMat', PALETTE.player);
        this.root.isPickable = false;

        //  A pack on the back, so which way you are facing is readable at a glance.
        this.pack = CreateBox('pack', { width: 0.52, height: 0.5, depth: 0.28 }, scene);
        this.pack.material = flat(scene, 'packMat', PALETTE.playerPack);
        this.pack.parent = this.root;
        this.pack.position = new Vector3(0, 0.16, -0.36);
        this.pack.isPickable = false;
    }

    /** Place the capsule so its feet are on the ground at (x, z). */
    place(x: number, groundY: number, z: number, facingRadians: number): void {
        this.root.position.set(x, groundY + PLAYER_HEIGHT / 2, z);
        this.root.rotation.y = facingRadians;
    }

    get eyeHeight(): number {
        return PLAYER_HEIGHT * 0.9;
    }
}

// ---- Wood ---------------------------------------------------------------

export interface NodeView {
    node: WoodNode;
    mesh: Mesh;
    halo: Mesh;
}

export class WoodViews {
    readonly views: NodeView[] = [];
    private ring: Mesh;
    private ringTexture: DynamicTexture;
    private ringMaterial: StandardMaterial;

    constructor(scene: Scene, nodes: WoodNode[], heightAt: (x: number, z: number) => number) {
        const driftMat = flat(scene, 'driftMat', PALETTE.driftwood);
        const deadMat = flat(scene, 'deadMat', PALETTE.deadfall);
        const haloMat = flat(scene, 'haloMat', PALETTE.highlight);
        haloMat.emissiveColor = colour(PALETTE.highlight);
        haloMat.alpha = 0.55;

        nodes.forEach((node, index) => {
            const ground = heightAt(node.x, node.y);
            let mesh: Mesh;

            if (node.kind === 'driftwood') {
                mesh = CreateCylinder(
                    `wood_${node.id}`,
                    { height: 1.5, diameter: 0.26, tessellation: 6 },
                    scene
                );
                mesh.material = driftMat;
                mesh.rotation.z = Math.PI / 2;
                mesh.rotation.y = index * 0.8;
                mesh.position.set(node.x, ground + 0.14, node.y);
            } else {
                mesh = CreateCylinder(
                    `wood_${node.id}`,
                    { height: 2.6, diameterTop: 0.34, diameterBottom: 0.52, tessellation: 6 },
                    scene
                );
                mesh.material = deadMat;
                mesh.rotation.z = Math.PI / 2.6;
                mesh.rotation.y = index * 1.1;
                mesh.position.set(node.x, ground + 0.42, node.y);
            }

            mesh.isPickable = true;
            mesh.metadata = { nodeId: node.id };

            //  A flat halo on the ground: the target highlight, readable from any angle
            //  and from directly above, where a glowing outline would vanish.
            const halo = CreateDisc(`halo_${node.id}`, { radius: 1.0, tessellation: 20 }, scene);
            halo.rotation.x = Math.PI / 2;
            halo.position.set(node.x, ground + 0.06, node.y);
            halo.material = haloMat;
            halo.isPickable = false;
            halo.setEnabled(false);

            this.views.push({ node, mesh, halo });
        });

        //  The world-space hold-progress ring, drawn once and re-textured during a hold.
        this.ringTexture = new DynamicTexture('holdRing', { width: 128, height: 128 }, scene, false);
        this.ringTexture.hasAlpha = true;
        this.ringMaterial = new StandardMaterial('holdRingMat', scene);
        this.ringMaterial.diffuseTexture = this.ringTexture;
        this.ringMaterial.emissiveTexture = this.ringTexture;
        this.ringMaterial.opacityTexture = this.ringTexture;
        this.ringMaterial.specularColor = new Color3(0, 0, 0);
        this.ringMaterial.backFaceCulling = false;
        this.ringMaterial.disableLighting = true;

        this.ring = CreateDisc('holdRingMesh', { radius: 0.85, tessellation: 24 }, scene);
        this.ring.rotation.x = Math.PI / 2;
        this.ring.material = this.ringMaterial;
        this.ring.isPickable = false;
        this.ring.setEnabled(false);
    }

    /** Show the ring above a node, filled to `progress` (0–1). */
    showHold(view: NodeView, progress: number, groundY: number): void {
        this.ring.position.set(view.node.x, groundY + 0.09, view.node.y);
        this.ring.setEnabled(true);
        this.drawRing(progress);
    }

    hideHold(): void {
        this.ring.setEnabled(false);
    }

    private drawRing(progress: number): void {
        const context = this.ringTexture.getContext() as unknown as CanvasRenderingContext2D;
        const size = 128;
        context.clearRect(0, 0, size, size);

        context.lineWidth = 13;
        context.strokeStyle = 'rgba(255, 255, 255, 0.22)';
        context.beginPath();
        context.arc(size / 2, size / 2, 48, 0, Math.PI * 2);
        context.stroke();

        context.strokeStyle = '#ffdb8a';
        context.beginPath();
        context.arc(size / 2, size / 2, 48, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
        context.stroke();

        this.ringTexture.update();
    }

    /** Reflect the brain's view of which nodes are still there. */
    sync(state: GameState): void {
        for (const view of this.views) {
            const live = state.nodes.find((n) => n.id === view.node.id);
            const available = live?.available ?? false;
            view.node.available = available;
            view.mesh.setEnabled(available);
            if (!available) view.halo.setEnabled(false);
        }
    }

    /** Highlight one node and nothing else. */
    highlight(target: NodeView | null): void {
        for (const view of this.views) {
            view.halo.setEnabled(view === target && view.node.available);
        }
    }

    find(nodeId: string): NodeView | undefined {
        return this.views.find((v) => v.node.id === nodeId);
    }
}

// ---- The fire -----------------------------------------------------------

/**
 * The sanctuary beat, in three dimensions: a real object on the ground, a pool of warm
 * light that pushes the night back, and flames you can stand beside. In Cycle 01 this was
 * a circle behind a HUD; the whole point of the pivot is that it is now a place.
 */
export class FireView {
    private pit: Mesh;
    private logs: Mesh;
    private glow: Mesh;
    private glowMaterial: StandardMaterial;
    private light: PointLight;
    private particles: ParticleSystem;
    private built = false;
    private lit = false;

    constructor(scene: Scene) {
        this.pit = CreateCylinder('firePit', { height: 0.22, diameter: 1.5, tessellation: 9 }, scene);
        this.pit.material = flat(scene, 'firePitMat', PALETTE.firePit);
        this.pit.isPickable = true;
        this.pit.metadata = { fire: true };

        this.logs = CreateCylinder(
            'fireLogs',
            { height: 0.9, diameterTop: 0.1, diameterBottom: 0.55, tessellation: 6 },
            scene
        );
        this.logs.material = flat(scene, 'fireLogsMat', PALETTE.deadfall);
        this.logs.parent = this.pit;
        this.logs.position.y = 0.34;
        this.logs.isPickable = false;

        //  A ground glow disc so the firelight reads even on a bright screen outdoors.
        this.glowMaterial = new StandardMaterial('fireGlowMat', scene);
        this.glowMaterial.emissiveColor = colour(PALETTE.flame);
        this.glowMaterial.diffuseColor = new Color3(0, 0, 0);
        this.glowMaterial.specularColor = new Color3(0, 0, 0);
        this.glowMaterial.alpha = 0.22;
        this.glowMaterial.disableLighting = true;

        this.glow = CreateDisc(
            'fireGlow',
            { radius: TUNE.fireWarmthRadius, tessellation: 32 },
            scene
        );
        this.glow.rotation.x = Math.PI / 2;
        this.glow.material = this.glowMaterial;
        this.glow.isPickable = false;

        this.light = new PointLight('fireLight', new Vector3(0, 1, 0), scene);
        this.light.diffuse = colour(PALETTE.flame);
        this.light.range = TUNE.fireWarmthRadius * 2.2;
        this.light.intensity = 0;

        this.particles = this.buildParticles(scene);

        this.setBuilt(false);
    }

    private buildParticles(scene: Scene): ParticleSystem {
        //  A soft dot drawn at boot rather than fetched: one less request, one less asset.
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
    }

    /** Match the fire to the brain's state, and animate it. Called every frame. */
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

        //  Flicker, and burn brighter against a darker sky — the same fire doing more
        //  work at night, which is when it matters.
        const flicker = 0.86 + Math.sin(performance.now() / 90) * 0.07 + Math.sin(performance.now() / 37) * 0.05;
        this.light.intensity = (0.55 + 1.5 * nightFactor) * flicker;
        this.glowMaterial.alpha = (0.10 + 0.30 * nightFactor) * flicker;
        this.logs.rotation.y += 0.0008;
    }

    private stopFlames(): void {
        if (this.particles.isStarted()) this.particles.stop();
    }

    /** The ignition beat: a burst of embers the moment it catches. */
    flare(): void {
        this.particles.manualEmitCount = 40;
        //  Babylon latches manual emission: once manualEmitCount is anything but -1 the
        //  system stops honouring emitRate, so the ignition burst was silently killing the
        //  flame it announced. Hand the system back to continuous emission next frame.
        requestAnimationFrame(() => {
            this.particles.manualEmitCount = -1;
        });
    }
}
