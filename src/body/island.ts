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

import { pushOut } from '../brain/movement';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Scene } from '@babylonjs/core/scene';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { CreateCylinder } from '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import { CreateDisc } from '@babylonjs/core/Meshes/Builders/discBuilder';
import { CreateTorus } from '@babylonjs/core/Meshes/Builders/torusBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import '@babylonjs/core/Meshes/thinInstanceMesh';

import { timeOfDay } from '../brain';
import { TUNE } from '../data/tune';
import { BOAT, FAR_ISLAND, JUNK_SITES, POND, POND_SURFACE_Y, ROCKS, SURF_LINE_RADIUS, TRACE_SITES, TREES, WORLD, WRECK, groundHeight, isBeach, surfaceHeightAt } from '../data/world';
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
    private surfMaterial: StandardMaterial;
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
        this.surfMaterial = this.flatMaterial('surf');
        this.surfMaterial.diffuseColor = new Color3(0.86, 0.91, 0.94);
        this.surfMaterial.emissiveColor = new Color3(0.30, 0.36, 0.40);
        this.surfMaterial.alpha = RENDER.surfLineAlpha;
        this.seaMaterial = this.flatMaterial('sea');
        this.seaMaterial.alpha = SEA.alpha;
        this.seaMaterial.specularColor = new Color3(0.25, 0.28, 0.3);
        this.seaMaterial.specularPower = 48;
        this.buildSea();
        this.buildSurfLine();

        this.buildTrees();
        this.buildRocks();
        this.buildPond();
        this.buildWreck();
        this.buildFarIsland();
        this.buildTraceSites();
        this.buildBoat();

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

    /** Every obstacle in play this frame — the static field plus whatever is built. */
    obstacleField(dynamic: readonly Obstacle[]): Obstacle[] {
        return [...this.staticObstacles, ...dynamic];
    }

    /**
     * Push a point out of every obstacle it overlaps. Returns the corrected (x, z).
     *
     * The maths moved to `src/brain/movement.ts` (Slice 1's unified collision fix) so it can
     * be unit-tested at all — this layer imports Babylon, which the purity law keeps out of
     * the brain, so nothing here has ever had a unit test. This delegates, and is still the
     * right call for PLACEMENT (fire, shelter, storage): placement wants a point shoved to
     * legal ground, not a slide. Movement wants `stepMovement`, and calls it directly.
     */
    resolveCollision(x: number, z: number, radius: number, dynamic: readonly Obstacle[]): { x: number; z: number } {
        return pushOut(x, z, radius, this.obstacleField(dynamic));
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
        //  THE MESH HAS TO REACH THE SEABED NOW (the Maritime Slice). This was
        //  `islandRadius * 2.2` — a half-span of 134 m, which was ample while the terrain
        //  outside the island was a flat slab nobody could stand on. The shelf runs to
        //  `islandRadius + seabedFalloff` (150 m), so at 2.2 the mesh ended part-way down the
        //  ramp and the shore stopped existing mid-slope.
        //
        //  SEGMENT COUNT IS DELIBERATELY UNCHANGED, so this costs exactly zero extra vertices
        //  and the `fpsFloorMedian` watch item is untouched. The price is paid in sampling
        //  density instead: 3.20 m per vertex becomes 3.63 m, about 14% coarser. The waterline
        //  ring is the one place that shows, and the surf torus is drawn along it at 96
        //  tessellation — the picture the player actually reads at the shore is the surf, not
        //  the vertices under it.
        const span = (WORLD.islandRadius + WORLD.seabedFalloff) * 2.03;
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
                //  THE TIDE LINE MOVED OUT with the shore (the Maritime Slice): the wet-sand
                //  band used to darken toward `islandRadius`, which was where the world
                //  ended. It is now anchored to `SURF_LINE_RADIUS` — the actual waterline —
                //  so the sand that LOOKS wet is the sand the surf is breaking on, and the
                //  seabed beyond it stays the darkest tone rather than fading back to dry.
                const beachBlend = smoothstep(WORLD.beachRadius - 6, WORLD.beachRadius + 4, r);
                const wet = smoothstep(SURF_LINE_RADIUS - 5, SURF_LINE_RADIUS, r);
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

    /**
     * THE FAR ISLAND gets its OWN mesh, and that is a decision rather than a convenience.
     *
     * Spawn Island's terrain spans `(islandRadius + seabedFalloff) * 2.03` — about ±152 m —
     * so the far island at 420 m out is simply not in it. Widening that span to reach would
     * have meant either a huge vertex count or a terrain so coarse that home's beach turned to
     * facets: at 84 segments across 980 m the island would sample every 11.7 m, against 3.6 m
     * today.
     *
     * A second mesh keeps home's resolution exactly as it is and costs one more draw call for
     * a static, frozen, distant object. It samples the SAME `groundHeight`, so the land it
     * draws is the land the brain already computes — the picture and the rule cannot drift.
     */
    private buildFarIsland(): void {
        const segments = RENDER.farIslandSegments;
        const span = FAR_ISLAND.radius * 2.4;
        const step = span / segments;
        const ox = FAR_ISLAND.x - span / 2;
        const oz = FAR_ISLAND.y - span / 2;

        const positions = [];
        const colours = [];
        const indices = [];
        const sandDry = PALETTE.sandDry;
        const sandWet = PALETTE.sandWet;
        const grass = PALETTE.grass;
        const grassDark = PALETTE.grassDark;

        for (let iz = 0; iz <= segments; iz++) {
            for (let ix = 0; ix <= segments; ix++) {
                const x = ox + ix * step;
                const z = oz + iz * step;
                const y = groundHeight(x, z);
                positions.push(x, y, z);
                //  Same palette logic as home, keyed off height rather than radius: grass up
                //  top, sand at the waterline, wet sand below it. A survivor should recognise
                //  it as the same KIND of place, made of the same stuff.
                const grassMix = mix(grassDark, grass, smoothstep(0, 2.4, y));
                const beachBlend = smoothstep(1.6, 0.2, y);
                const land = mix(grassMix, sandDry, beachBlend);
                const wet = smoothstep(WORLD.seaLevel + 0.5, WORLD.seaLevel - 0.5, y);
                const final = mix(land, sandWet, wet);
                const shade = 0.88 + 0.12 * Math.sin(x * 0.35) * Math.cos(z * 0.31);
                colours.push(final[0] * shade, final[1] * shade, final[2] * shade, 1);
            }
        }

        const row = segments + 1;
        for (let iz = 0; iz < segments; iz++) {
            for (let ix = 0; ix < segments; ix++) {
                const a = iz * row + ix;
                indices.push(a, a + row, a + 1, a + 1, a + row, a + row + 1);
            }
        }

        //  Analytic normals, for the same reason home uses them: winding-derived normals here
        //  were once silently inverted and back-face culled a whole beach out of existence.
        const normals = [];
        const probe = step * 0.5;
        for (let iz = 0; iz <= segments; iz++) {
            for (let ix = 0; ix <= segments; ix++) {
                const x = ox + ix * step;
                const z = oz + iz * step;
                const dhdx = (groundHeight(x + probe, z) - groundHeight(x - probe, z)) / (2 * probe);
                const dhdz = (groundHeight(x, z + probe) - groundHeight(x, z - probe)) / (2 * probe);
                const len = Math.hypot(-dhdx, 1, -dhdz);
                normals.push(-dhdx / len, 1 / len, -dhdz / len);
            }
        }

        const mesh = new Mesh('farIsland', this.scene);
        const data = new VertexData();
        data.positions = positions;
        data.indices = indices;
        data.normals = normals;
        data.colors = colours;
        data.applyToMesh(mesh);
        //  Opaque, or Babylon moves it into the transparent pass and blends it over the sea.
        mesh.hasVertexAlpha = false;
        mesh.material = this.terrainMaterial;
        mesh.isPickable = true;
        mesh.freezeWorldMatrix();
        mesh.receiveShadows = false;
    }

    /**
     * THE TRACES, drawn so they read from a distance as things a PERSON left — a fire ring,
     * a box, a cairn — rather than as resource nodes. Each is pickable and tagged with its
     * own id, so the tap routes to that site and no other.
     */
    /**
     * THE BROKEN FISHING BOAT (Drop 4) — the largest made thing on this island, and the only
     * one nobody here built.
     *
     * DRAWN AT THE SURFACE HEIGHT OF HER OWN SPOT and heeled over, because she is a hull ON
     * SAND rather than a hull afloat: dragged above the tideline and left to lie. The list is
     * what says "dead" at fifty metres, before any of the damage is legible.
     *
     * THE HOLE IS A REAL HOLE IN THE MESH — a dark box let into the planking rather than a
     * texture — for the same reason the cave mouth is near-black geometry: an opening reads as
     * an opening because it is darker than everything round it, at any distance and any light.
     * A survivor should be able to see she is holed from the treeline.
     *
     * AND SHE IS THE SIZE OF A REAL BOAT — 7.6 m on the keel, 2.6 m in the beam. The first
     * pass built her at 5.6 x 1.9, which is a dinghy, and a device frame from sixteen metres
     * settled it: she read as a crate on the sand. The comment above her said "the largest
     * made thing on this island" and the geometry did not agree, which is the kind of claim
     * that only a screenshot can refute. An inshore fishing boat a person could work alone
     * is about this big; below it she is a prop, and a prop cannot carry a promise.
     *
     * AND SHE FACES THE SEA on the bearing the far island sits on. That is the composition
     * this whole drop exists for: standing at her stern and looking down her length puts the
     * wreck in the middle distance and the far island on the horizon behind it.
     */
    private buildBoat(): void {
        const y = surfaceHeightAt(BOAT.x, BOAT.y);
        const timber = this.flatMaterial('boatTimber');
        timber.diffuseColor = new Color3(0.44, 0.38, 0.31);
        const dark = this.flatMaterial('boatHole');
        dark.diffuseColor = new Color3(0.05, 0.05, 0.06);

        //  The hull: a long box, heeled over and bow-up on the sand.
        const hull = CreateBox('boat_hull', { width: 2.6, height: 1.6, depth: 7.6 }, this.scene);
        hull.material = timber;
        hull.position.set(BOAT.x, y + 0.58, BOAT.y);
        //  Bearing to the far island, so her length IS the sentence.
        hull.rotation.y = Math.atan2(FAR_ISLAND.x - BOAT.x, FAR_ISLAND.y - BOAT.y);
        hull.rotation.z = 0.22;   // the list
        hull.rotation.x = -0.06;  // bow up on the sand
        hull.isPickable = true;
        hull.metadata = { boat: true };

        //  The gunwale, so she reads as a boat rather than a crate at a distance.
        const rail = CreateBox('boat_rail', { width: 2.86, height: 0.2, depth: 7.85 }, this.scene);
        rail.material = timber;
        rail.parent = hull;
        rail.position.set(0, 0.84, 0);
        rail.isPickable = true;
        rail.metadata = { boat: true };

        //  THE HOLE, low in the port side. Geometry, not paint.
        const hole = CreateBox('boat_hole', { width: 0.62, height: 0.58, depth: 0.58 }, this.scene);
        hole.material = dark;
        hole.parent = hull;
        hole.position.set(-1.32, -0.34, -1.5);
        hole.isPickable = true;
        hole.metadata = { boat: true };

        //  The transom, cut square where the engine was unbolted — the second visible absence.
        const transom = CreateBox('boat_transom', { width: 2.4, height: 1.12, depth: 0.18 }, this.scene);
        transom.material = timber;
        transom.parent = hull;
        transom.position.set(0, 0.07, -3.88);
        transom.isPickable = true;
        transom.metadata = { boat: true };

        for (const m of [hull, rail, hole, transom]) m.freezeWorldMatrix();
    }

    private buildTraceSites(): void {
        //  BOTH CATALOGUES, one builder. The far island's three traces and the junk & flavour
        //  catalogue's six are the same type and get the same mesh path, the same pickable
        //  metadata and the same tap route — see `JUNK_SITES` for why they are separate lists
        //  and identical machinery.
        for (const site of [...TRACE_SITES, ...JUNK_SITES]) {
            //  THE SURFACE, not the terrain. Two of the junk catalogue's objects are AT THE
            //  WRECK, where the seabed is eight metres down — `groundHeight` would sink a mess
            //  tin out of sight and make it unpickable into the bargain. This is [[D-124]]'s
            //  fix applied where it was always going to be needed next, and it changes nothing
            //  on land: `surfaceHeightAt` and `groundHeight` are identical above sea level,
            //  which the wreck slice's own regression sweep asserts.
            const y = surfaceHeightAt(site.x, site.y);
            const material = this.flatMaterial(`traceMat_${site.id}`);
            material.diffuseColor = new Color3(0.34, 0.31, 0.28);
            material.emissiveColor = new Color3(0.03, 0.03, 0.03);

            let mesh;
            if (site.kind === 'camp') {
                //  A ring of stones, laid flat and cold.
                mesh = CreateTorus(`trace_${site.id}`, { diameter: 1.8, thickness: 0.34, tessellation: 9 }, this.scene);
                mesh.position.set(site.x, y + 0.12, site.y);
            } else if (site.kind === 'cache') {
                mesh = CreateBox(`trace_${site.id}`, { width: 0.9, height: 0.62, depth: 0.7 }, this.scene);
                mesh.position.set(site.x, y + 0.31, site.y);
                mesh.rotation.y = 0.4;
            } else if (site.kind === 'tool') {
                //  A rusted head, half in the sand. Flat and small on purpose: it should be
                //  something you nearly walk past, and `traceTapRadiusM` is what makes a flat
                //  thing tappable without standing it up ([[D-127]]).
                mesh = CreateBox(`trace_${site.id}`, { width: 0.34, height: 0.09, depth: 0.2 }, this.scene);
                mesh.position.set(site.x, y + 0.045, site.y);
                mesh.rotation.y = 0.7;
                mesh.rotation.z = 0.18;
                material.diffuseColor = new Color3(0.36, 0.21, 0.13);
            } else if (site.kind === 'carving') {
                //  Upright and small — a whittled figure, or notches in a trunk. Standing, so
                //  it reads as deliberate at a distance rather than as more debris.
                mesh = CreateCylinder(`trace_${site.id}`, { height: 0.52, diameterTop: 0.1, diameterBottom: 0.14, tessellation: 6 }, this.scene);
                mesh.position.set(site.x, y + 0.26, site.y);
                material.diffuseColor = new Color3(0.46, 0.35, 0.22);
            } else if (site.kind === 'driftwood') {
                //  A plank END, lying flat. Squarer than anything the sea makes, which is the
                //  whole of what it has to say before you touch it.
                mesh = CreateBox(`trace_${site.id}`, { width: 1.15, height: 0.11, depth: 0.3 }, this.scene);
                mesh.position.set(site.x, y + 0.055, site.y);
                mesh.rotation.y = 1.1;
                material.diffuseColor = new Color3(0.62, 0.6, 0.55);
            } else if (site.kind === 'effect') {
                //  Someone's belongings: low, paired, set down rather than dropped.
                mesh = CreateBox(`trace_${site.id}`, { width: 0.46, height: 0.17, depth: 0.26 }, this.scene);
                mesh.position.set(site.x, y + 0.085, site.y);
                mesh.rotation.y = -0.35;
                const twin = CreateBox(`trace_${site.id}_twin`, { width: 0.42, height: 0.15, depth: 0.24 }, this.scene);
                twin.material = material;
                twin.parent = mesh;
                twin.position.set(0.3, -0.01, 0.06);
                twin.isPickable = true;
                twin.metadata = { traceId: site.id };
                material.diffuseColor = new Color3(0.28, 0.24, 0.22);
            } else {
                //  A cairn: shoulder-high, with the flat stone on top.
                mesh = CreateCylinder(`trace_${site.id}`, { height: 1.5, diameterTop: 0.5, diameterBottom: 0.95, tessellation: 7 }, this.scene);
                mesh.position.set(site.x, y + 0.75, site.y);
                const cap = CreateBox(`trace_${site.id}_cap`, { width: 0.7, height: 0.1, depth: 0.7 }, this.scene);
                cap.material = material;
                cap.parent = mesh;
                cap.position.y = 0.8;
                cap.isPickable = true;
                cap.metadata = { traceId: site.id };
            }
            mesh.material = material;
            mesh.isPickable = true;
            mesh.metadata = { traceId: site.id };
            mesh.freezeWorldMatrix();
        }
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
     * THE DIEGETIC BOUNDARY (D-064). The walkable edge used to be an invisible wall the
     * player discovered by walking into it. It is now something they can SEE: a band of
     * pale surf drawn exactly at `SURF_LINE_RADIUS`, which IS `WALKABLE_RADIUS` — the thing
     * you see is literally the thing that stops you, so the rule and its picture cannot
     * drift apart.
     *
     * Deliberately a torus rather than a wall: it reads as water breaking on a shelf, not
     * as a fence. It is `isPickable: false`, so it never intercepts a tap meant for the
     * beach behind it (D-049's lesson about invisible geometry eating taps).
     */
    private buildSurfLine(): void {
        const surf = CreateTorus('surfline', {
            diameter: SURF_LINE_RADIUS * 2,
            thickness: RENDER.surfLineThickness,
            tessellation: 96
        }, this.scene);
        surf.position.y = WORLD.seaLevel + RENDER.surfLineRiseM;
        surf.material = this.surfMaterial;
        surf.isPickable = false;
        surf.freezeWorldMatrix();
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
