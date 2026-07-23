/**
 * BODY — the island: terrain, sea, treeline, rocks, and the sky.
 *
 * Everything here is generated at boot from `src/data/world.ts` — no textures, no models,
 * nothing to download. That is placeholder-first (§II.7) doing double duty as the load
 * budget: the whole island costs zero network bytes, which is most of why the cold-load
 * check has room to spare.
 *
 * The day/night cycle is driven by the **brain's** clock — the same clock that decides
 * whether warmth is draining — so the sky and the cold can never disagree.
 */

import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Scene } from '@babylonjs/core/scene';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { CreateCylinder } from '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import { CreateDisc } from '@babylonjs/core/Meshes/Builders/discBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import '@babylonjs/core/Meshes/thinInstanceMesh';

import { timeOfDay } from '../brain';
import { TUNE } from '../data/tune';
import { POND, POND_SURFACE_Y, ROCKS, TREES, WORLD, WRECK, groundHeight, isBeach } from '../data/world';
import { FOG, PALETTE, RENDER, SEA, SKY_KEYS, type SkyKey } from './theme';

const colour = (c: readonly number[]) => new Color3(c[0], c[1], c[2]);

/** A cylinder the player cannot walk into. Collision is push-out, never a trap. */
export interface Obstacle {
    x: number;
    z: number;
    radius: number;
}

export class Island {
    readonly sun: DirectionalLight;
    private ambient: HemisphericLight;
    private seaMaterial: StandardMaterial;
    private terrainMaterial: StandardMaterial;
    /** The permanent obstacles — the decorative forest and rock field. Live nodes and the
     *  fire are added by the game, which knows which are still standing. */
    readonly staticObstacles: Obstacle[] = [];

    constructor(private readonly scene: Scene) {
        this.ambient = new HemisphericLight('ambient', new Vector3(0, 1, 0), scene);
        this.sun = new DirectionalLight('sun', new Vector3(-0.4, -1, 0.35), scene);
        this.sun.position = new Vector3(40, 80, -40);

        this.terrainMaterial = this.flatMaterial('terrain');
        //  Vertex colours carry sand vs grass, so one material draws the whole island.
        this.terrainMaterial.diffuseColor = new Color3(1, 1, 1);
        //  The island is a single open surface with hand-built indices; culling its back
        //  faces buys nothing and costs an entire invisible beach if the winding is off by
        //  one. Lighting comes from the analytic normals either way.
        this.terrainMaterial.backFaceCulling = false;

        this.buildTerrain();
        this.seaMaterial = this.flatMaterial('sea');
        this.seaMaterial.alpha = SEA.alpha;
        this.seaMaterial.specularColor = new Color3(0.25, 0.28, 0.3);
        this.seaMaterial.specularPower = 48;
        this.buildSea();

        this.buildTrees();
        this.buildRocks();
        this.buildPond();
        this.buildWreck();

        scene.fogMode = Scene.FOGMODE_EXP2;
    }

    /** The freshwater pond: a still, dark disc set into its basin. The first answer. */
    private buildPond(): void {
        const water = CreateDisc('pond', { radius: POND.radius, tessellation: 28 }, this.scene);
        water.rotation.x = Math.PI / 2;
        water.position.set(POND.x, POND_SURFACE_Y, POND.y);
        const material = this.flatMaterial('pondMat');
        material.diffuseColor = new Color3(0.10, 0.26, 0.30);
        material.emissiveColor = new Color3(0.03, 0.09, 0.11);
        material.specularColor = new Color3(0.3, 0.34, 0.36);
        material.specularPower = 64;
        material.alpha = 0.9;
        water.material = material;
        water.isPickable = true;
        water.metadata = { pond: true };
        water.freezeWorldMatrix();
    }

    /**
     * The wreck offshore: a dark hull silhouette on the horizon, visible from the spawn
     * beach, unreachable, unexplained (§I.18 rule 5 — one question, one clue, one visible
     * possibility). It is scenery this cycle; it is a promise for a later one.
     */
    private buildWreck(): void {
        const hull = CreateCylinder(
            'wreck',
            { height: WRECK.heightM, diameterTop: 3.4, diameterBottom: 6.5, tessellation: 7 },
            this.scene
        );
        //  Listing, half-sunk.
        hull.rotation.z = 0.5;
        hull.position.set(WRECK.x, WORLD.seaLevel + WRECK.heightM * 0.28, WRECK.y);
        const material = this.flatMaterial('wreckMat');
        material.diffuseColor = new Color3(0.14, 0.15, 0.17);
        material.emissiveColor = new Color3(0.02, 0.02, 0.03);
        hull.material = material;
        hull.isPickable = false;
        hull.freezeWorldMatrix();

        //  A broken mast, so the silhouette reads as a ship, not a rock.
        const mast = CreateCylinder('wreckMast', { height: WRECK.heightM * 1.1, diameter: 0.7, tessellation: 5 }, this.scene);
        mast.rotation.z = 0.72;
        mast.position.set(WRECK.x + 2, WORLD.seaLevel + WRECK.heightM * 0.7, WRECK.y + 1);
        mast.material = material;
        mast.isPickable = false;
        mast.freezeWorldMatrix();
    }

    /** Push a point out of every obstacle it overlaps. Returns the corrected (x, z). */
    resolveCollision(x: number, z: number, radius: number, dynamic: readonly Obstacle[]): { x: number; z: number } {
        let px = x;
        let pz = z;
        //  A couple of relaxation passes so wedging between two obstacles still resolves.
        for (let pass = 0; pass < 2; pass++) {
            for (const list of [this.staticObstacles, dynamic]) {
                for (const o of list) {
                    const dx = px - o.x;
                    const dz = pz - o.z;
                    const min = o.radius + radius;
                    const d2 = dx * dx + dz * dz;
                    if (d2 < min * min) {
                        if (d2 > 1e-9) {
                            const d = Math.sqrt(d2);
                            const push = (min - d) / d;
                            px += dx * push;
                            pz += dz * push;
                        } else {
                            //  Degenerate: the point sits exactly on the obstacle's centre —
                            //  e.g. two structures placed from the same spot at the same
                            //  offset (C05). There is no defined push direction, so pick a
                            //  deterministic one from the obstacle's own position rather than
                            //  silently leaving the overlap unresolved.
                            const angle = (o.x * 12.9898 + o.z * 78.233) % (Math.PI * 2);
                            px = o.x + Math.cos(angle) * min;
                            pz = o.z + Math.sin(angle) * min;
                        }
                    }
                }
            }
        }
        return { x: px, z: pz };
    }

    /** Unlit-ish, cheap, no specular — the low-poly look and the phone-GPU budget agree. */
    private flatMaterial(name: string): StandardMaterial {
        const material = new StandardMaterial(name, this.scene);
        material.specularColor = new Color3(0, 0, 0);
        return material;
    }

    /**
     * The terrain mesh: one grid, heights from the shared `groundHeight` function, and
     * per-vertex colour for the sand/grass transition. Because the body and the game both
     * read the same analytic height, the player can never be visually off the ground.
     */
    private buildTerrain(): void {
        const segments = RENDER.terrainSegments;
        const span = WORLD.islandRadius * 2.2;
        const step = span / segments;
        const origin = -span / 2;

        const positions: number[] = [];
        const colours: number[] = [];
        const indices: number[] = [];

        const sandDry = PALETTE.sandDry;
        const sandWet = PALETTE.sandWet;
        const grass = PALETTE.grass;
        const grassDark = PALETTE.grassDark;

        for (let iz = 0; iz <= segments; iz++) {
            for (let ix = 0; ix <= segments; ix++) {
                const x = origin + ix * step;
                const z = origin + iz * step;
                const y = groundHeight(x, z);
                positions.push(x, y, z);

                const r = Math.hypot(x, z);
                //  Blend grass → sand across the beach line, then darken below the tide.
                const beachBlend = smoothstep(WORLD.beachRadius - 6, WORLD.beachRadius + 4, r);
                const wet = smoothstep(WORLD.islandRadius - 5, WORLD.islandRadius, r);
                const shade = 0.88 + 0.12 * Math.sin(x * 0.35) * Math.cos(z * 0.31);

                const grassMix = mix(grassDark, grass, smoothstep(0, 2.4, y));
                const land = mix(grassMix, sandDry, beachBlend);
                const final = mix(land, sandWet, wet);
                colours.push(final[0] * shade, final[1] * shade, final[2] * shade, 1);
            }
        }

        const row = segments + 1;
        for (let iz = 0; iz < segments; iz++) {
            for (let ix = 0; ix < segments; ix++) {
                const a = iz * row + ix;
                const b = a + 1;
                const c = a + row;
                const d = c + 1;
                indices.push(a, c, b, b, c, d);
            }
        }

        //  Normals from the height field itself, not from triangle winding. The gradient
        //  is exact, always points up, and cannot be silently inverted — which is what
        //  ComputeNormals did here, leaving the whole beach back-face culled and invisible
        //  under the camera while the far rim still showed.
        const normals: number[] = [];
        const probe = step * 0.5;
        for (let iz = 0; iz <= segments; iz++) {
            for (let ix = 0; ix <= segments; ix++) {
                const x = origin + ix * step;
                const z = origin + iz * step;
                const dhdx = (groundHeight(x + probe, z) - groundHeight(x - probe, z)) / (2 * probe);
                const dhdz = (groundHeight(x, z + probe) - groundHeight(x, z - probe)) / (2 * probe);
                const length = Math.hypot(-dhdx, 1, -dhdz);
                normals.push(-dhdx / length, 1 / length, -dhdz / length);
            }
        }

        const mesh = new Mesh('terrain', this.scene);
        const data = new VertexData();
        data.positions = positions;
        data.indices = indices;
        data.normals = normals;
        data.colors = colours;
        data.applyToMesh(mesh);

        //  Vertex colours carry a 4th component, and Babylon reads that as "this mesh has
        //  vertex alpha" — which quietly moves the whole island into the TRANSPARENT
        //  render pass, where it stops writing depth and gets blended over the sea. The
        //  colours are fully opaque; say so, or the beach renders as water.
        mesh.hasVertexAlpha = false;

        mesh.material = this.terrainMaterial;
        mesh.isPickable = true;
        mesh.freezeWorldMatrix();
        mesh.receiveShadows = false;
    }

    private buildSea(): void {
        const sea = CreateDisc('sea', { radius: WORLD.seaRadius, tessellation: 48 }, this.scene);
        sea.rotation.x = Math.PI / 2;
        sea.position.y = WORLD.seaLevel;
        sea.material = this.seaMaterial;
        sea.isPickable = false;
        sea.freezeWorldMatrix();
    }

    /**
     * Trees as thin instances: one trunk mesh and one canopy mesh for the whole treeline,
     * two draw calls instead of sixty-six. This is the difference between 60 fps and a
     * slideshow on a mid-range phone, and it costs nothing in authoring.
     */
    private buildTrees(): void {
        const trunkSource = CreateCylinder(
            'trunk',
            { height: 1, diameterTop: 0.34, diameterBottom: 0.52, tessellation: 6 },
            this.scene
        );
        const trunkMaterial = this.flatMaterial('trunkMat');
        trunkMaterial.diffuseColor = colour(PALETTE.trunk);
        trunkSource.material = trunkMaterial;
        trunkSource.isPickable = false;

        const canopySource = CreateCylinder(
            'canopy',
            { height: 1, diameterTop: 0, diameterBottom: 1, tessellation: 7 },
            this.scene
        );
        const canopyMaterial = this.flatMaterial('canopyMat');
        canopyMaterial.diffuseColor = colour(PALETTE.canopy);
        canopySource.material = canopyMaterial;
        canopySource.isPickable = false;

        const trunks: Matrix[] = [];
        const canopies: Matrix[] = [];

        TREES.forEach(([x, z, height], index) => {
            const ground = groundHeight(x, z);
            const trunkHeight = height * 0.52;
            const lean = ((index % 5) - 2) * 0.02;

            trunks.push(
                Matrix.Compose(
                    new Vector3(1, trunkHeight, 1),
                    quaternionFromEuler(lean, index * 0.7, lean * 0.5),
                    new Vector3(x, ground + trunkHeight / 2, z)
                )
            );

            const canopyHeight = height * 0.72;
            const canopyWidth = 2.6 + (index % 4) * 0.35;
            canopies.push(
                Matrix.Compose(
                    new Vector3(canopyWidth, canopyHeight, canopyWidth),
                    quaternionFromEuler(lean, index * 1.3, lean * 0.5),
                    new Vector3(x, ground + trunkHeight + canopyHeight / 2 - 0.4, z)
                )
            );
        });

        trunkSource.thinInstanceAdd(trunks);
        canopySource.thinInstanceAdd(canopies);
        trunkSource.freezeWorldMatrix();
        canopySource.freezeWorldMatrix();

        //  The forest blocks — sparse enough (≈12 m apart) to weave through to the pond,
        //  dense enough to read as woods. Collision is push-out, so it never traps.
        for (const [x, z] of TREES) this.staticObstacles.push({ x, z, radius: TUNE.decorTreeCollisionRadius });
    }

    private buildRocks(): void {
        const source = CreateCylinder(
            'rock',
            { height: 1, diameterTop: 0.7, diameterBottom: 1.15, tessellation: 5 },
            this.scene
        );
        const material = this.flatMaterial('rockMat');
        material.diffuseColor = colour(PALETTE.rock);
        source.material = material;
        source.isPickable = false;

        const matrices = ROCKS.map(([x, z, size], index) =>
            Matrix.Compose(
                new Vector3(size * 1.6, size, size * 1.4),
                quaternionFromEuler(0.06, index * 1.1, 0.04),
                new Vector3(x, groundHeight(x, z) + size * 0.34, z)
            )
        );
        source.thinInstanceAdd(matrices);
        source.freezeWorldMatrix();

        for (const [x, z, size] of ROCKS) this.staticObstacles.push({ x, z, radius: size * TUNE.decorRockCollisionScale });
    }

    /**
     * Drive the sky from the brain's clock. Called every frame; all it does is lerp
     * between two keyframes, so it is free.
     */
    update(gameHoursElapsed: number): void {
        const { hourOfDay } = timeOfDay(gameHoursElapsed);
        const key = interpolateSky(hourOfDay);

        this.scene.clearColor = new Color4(key.sky[0], key.sky[1], key.sky[2], 1);
        this.scene.fogColor = new Color3(key.fog[0], key.fog[1], key.fog[2]);

        //  Daylight is the same 0–1 factor everywhere, so fog, sea and sun never drift apart.
        const daylight = clamp01((key.sunIntensity - 0.1) / 1.15);
        this.scene.fogDensity = FOG.densityNight + (FOG.densityDay - FOG.densityNight) * daylight;

        this.sun.diffuse = new Color3(key.sun[0], key.sun[1], key.sun[2]);
        this.sun.intensity = key.sunIntensity;

        const elevation = (key.sunElevation * Math.PI) / 180;
        const azimuth = ((hourOfDay / 24) * Math.PI * 2) - Math.PI / 2;
        this.sun.direction = new Vector3(
            -Math.cos(elevation) * Math.cos(azimuth),
            -Math.sin(elevation) - 0.12,
            -Math.cos(elevation) * Math.sin(azimuth)
        ).normalize();

        this.ambient.diffuse = new Color3(key.ambient[0], key.ambient[1], key.ambient[2]);
        this.ambient.groundColor = new Color3(
            key.ambient[0] * 0.55,
            key.ambient[1] * 0.55,
            key.ambient[2] * 0.6
        );
        this.ambient.intensity = key.ambientIntensity;

        const sea = mix(SEA.night, SEA.day, daylight);
        this.seaMaterial.diffuseColor = new Color3(sea[0], sea[1], sea[2]);
        this.seaMaterial.emissiveColor = new Color3(sea[0] * 0.25, sea[1] * 0.25, sea[2] * 0.3);

        //  The sea is deliberately static: its world matrix is frozen for the draw-call
        //  saving, and a 5 cm swell is not worth unfreezing it every frame.
    }

    /** Ground height, exposed so the player and every prop sit on the same surface. */
    heightAt(x: number, z: number): number {
        return groundHeight(x, z);
    }

    beachAt(x: number, z: number): boolean {
        return isBeach(x, z);
    }
}

// ---- helpers ------------------------------------------------------------

function interpolateSky(hourOfDay: number): SkyKey {
    let before = SKY_KEYS[0];
    let after = SKY_KEYS[SKY_KEYS.length - 1];
    for (let i = 0; i < SKY_KEYS.length - 1; i++) {
        if (hourOfDay >= SKY_KEYS[i].hour && hourOfDay <= SKY_KEYS[i + 1].hour) {
            before = SKY_KEYS[i];
            after = SKY_KEYS[i + 1];
            break;
        }
    }
    const span = after.hour - before.hour || 1;
    const t = clamp01((hourOfDay - before.hour) / span);

    return {
        hour: hourOfDay,
        sky: mix(before.sky, after.sky, t) as [number, number, number],
        fog: mix(before.fog, after.fog, t) as [number, number, number],
        sun: mix(before.sun, after.sun, t) as [number, number, number],
        sunIntensity: lerp(before.sunIntensity, after.sunIntensity, t),
        ambient: mix(before.ambient, after.ambient, t) as [number, number, number],
        ambientIntensity: lerp(before.ambientIntensity, after.ambientIntensity, t),
        sunElevation: lerp(before.sunElevation, after.sunElevation, t)
    };
}

/** Pitch/yaw/roll in radians → quaternion, for thin-instance matrices. */
function quaternionFromEuler(pitch: number, yaw: number, roll: number): Quaternion {
    return Quaternion.RotationYawPitchRoll(yaw, pitch, roll);
}

function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}

function mix(a: readonly number[], b: readonly number[], t: number): number[] {
    return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

function clamp01(value: number): number {
    return Math.max(0, Math.min(1, value));
}

function smoothstep(edge0: number, edge1: number, x: number): number {
    const t = clamp01((x - edge0) / (edge1 - edge0 || 1));
    return t * t * (3 - 2 * t);
}
