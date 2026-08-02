/**
 * THE BOAR, DRAWN — and the reason every stage has a look as well as a sound.
 *
 * The fair-challenge contract does not say "warn the player"; it says every stage must be
 * PERCEIVABLE. A telegraph that exists only in the state machine is not a telegraph, and a
 * telegraph that exists only in audio fails any player with the sound off — which on a mobile
 * game is most of them, most of the time. So each stage changes the silhouette, the colour and
 * the motion, and the audio rides alongside as reinforcement rather than as the carrier.
 *
 *   unaware  — head DOWN, rooting. The posture that says "it has not seen you".
 *   alert    — head UP, still, square to you. Nothing else in the scene stands like this.
 *   warning  — ground-pawing: a visible rocking shove, low and repeated. The read.
 *   charge   — committed and fast, along a bearing that does not change. Reading it works.
 *   aftermath— spent, head low, drifting. The window you get to answer in.
 *
 * RENDER-NEAR-PLAYER, per the standing perf rail. This is the first genuinely new
 * render-heavy entity type since the collision-model work, so it disables itself wholesale
 * beyond `boarRenderRadiusM` — and `setEnabled(false)` governs rendering ONLY, which is why
 * `isPickable` is cleared alongside it. That exact distinction cost a bug once already
 * (entities.ts:659): a disabled palm stayed a live tap target for every ray in the scene.
 */
import { CreateCylinder } from '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import { CreateSphere } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Scene } from '@babylonjs/core/scene';
import type { Boar, BoarStage } from '../brain/types';
import { TUNE } from '../data/tune';

/** One boar's meshes, kept together so a stage change moves all of it at once. */
interface BoarMesh {
    root: Mesh;
    body: Mesh;
    head: Mesh;
    material: StandardMaterial;
}

/**
 * Stage colour. Deliberately NOT a red-alert ramp: the boar does not glow to warn you, it
 * changes how it stands. Colour shifts only enough to reinforce a posture already readable in
 * silhouette, because a colour-only tell fails a colourblind player outright.
 */
const STAGE_TINT: Record<BoarStage, [number, number, number]> = {
    unaware: [0.28, 0.22, 0.18],
    alert: [0.34, 0.26, 0.20],
    warning: [0.42, 0.26, 0.18],
    charge: [0.48, 0.24, 0.16],
    aftermath: [0.30, 0.24, 0.20],
};

export class BoarsView {
    private readonly meshes = new Map<string, BoarMesh>();

    constructor(private readonly scene: Scene) {}

    /** Build one boar's meshes lazily — an island with no boar nearby allocates nothing. */
    private ensure(boar: Boar): BoarMesh {
        const existing = this.meshes.get(boar.id);
        if (existing) return existing;

        const material = new StandardMaterial(`boarMat_${boar.id}`, this.scene);
        material.diffuseColor = new Color3(...STAGE_TINT.unaware);
        material.specularColor = new Color3(0, 0, 0);

        //  A low, heavy, front-weighted shape. Read at a glance as "not a rock, not a bush".
        const body = CreateSphere(`boar_${boar.id}`, { diameterX: 1.5, diameterY: 0.95, diameterZ: 0.85, segments: 8 }, this.scene);
        body.material = material;
        body.isPickable = true;
        body.metadata = { boarId: boar.id };

        const head = CreateCylinder(`boarHead_${boar.id}`, { height: 0.6, diameterTop: 0.3, diameterBottom: 0.45, tessellation: 6 }, this.scene);
        head.material = material;
        head.isPickable = true;
        head.metadata = { boarId: boar.id };
        head.parent = body;
        head.rotation.z = Math.PI / 2;
        head.position.set(0.85, 0, 0);

        const made: BoarMesh = { root: body, body, head, material };
        this.meshes.set(boar.id, made);
        return made;
    }

    /**
     * Draw the current truth. Called each frame with whatever the brain decided; this
     * function reads state and never advances it — the ladder belongs to `session.tick`.
     */
    sync(boars: Boar[], playerX: number, playerZ: number, groundAt: (x: number, z: number) => number, tSeconds: number): void {
        for (const boar of boars) {
            const near = Math.hypot(boar.x - playerX, boar.y - playerZ) <= TUNE.boarRenderRadiusM;
            if (!boar.alive || !near) {
                const m = this.meshes.get(boar.id);
                if (m) {
                    m.body.setEnabled(false);
                    //  `setEnabled` governs RENDERING only. Clearing pickability alongside it
                    //  is what stops a boar you cannot see from swallowing a tap meant for the
                    //  ground behind it.
                    m.body.isPickable = false;
                    m.head.isPickable = false;
                }
                continue;
            }

            const m = this.ensure(boar);
            m.body.setEnabled(true);
            m.body.isPickable = true;
            m.head.isPickable = true;
            m.material.diffuseColor = new Color3(...STAGE_TINT[boar.stage]);

            const ground = groundAt(boar.x, boar.y);
            m.body.position = new Vector3(boar.x, ground + 0.5, boar.y);
            m.body.rotation.y = -boar.facing;

            //  POSTURE IS THE TELL. Each stage moves the body in a way that reads at a
            //  glance and without sound, which is what "perceivable" has to mean.
            switch (boar.stage) {
                case 'unaware':
                    //  Head down, grazing — a slow bob that never rises.
                    m.head.position.y = -0.28 + Math.sin(tSeconds * 1.4) * 0.05;
                    m.body.rotation.z = 0;
                    break;
                case 'alert':
                    //  Head UP and still. Stillness is the signal; nothing else stands like it.
                    m.head.position.y = 0.16;
                    m.body.rotation.z = 0;
                    break;
                case 'warning':
                    //  GROUND-PAWING. A hard, repeated rock — the most legible motion in the
                    //  scene, because it is the one the player must not miss.
                    m.head.position.y = 0.05 + Math.sin(tSeconds * 9) * 0.12;
                    m.body.rotation.z = Math.sin(tSeconds * 9) * 0.16;
                    break;
                case 'charge':
                    m.head.position.y = -0.05;
                    m.body.rotation.z = Math.sin(tSeconds * 16) * 0.09;
                    break;
                case 'aftermath':
                    //  Spent. Slow, low, drifting — visibly the window to act in.
                    m.head.position.y = -0.2 + Math.sin(tSeconds * 2.2) * 0.04;
                    m.body.rotation.z = Math.sin(tSeconds * 2.2) * 0.05;
                    break;
            }
        }
    }

    /** Which boar a ray struck, if any. Read from metadata, never from the mesh name. */
    static boarIdOf(mesh: { metadata?: Record<string, unknown> } | null | undefined): string | null {
        const id = mesh?.metadata?.boarId;
        return typeof id === 'string' ? id : null;
    }

    dispose(): void {
        for (const m of this.meshes.values()) {
            m.head.dispose();
            m.body.dispose();
            m.material.dispose();
        }
        this.meshes.clear();
    }
}
