/**
 * BODY — one input path for the whole game.
 *
 * Phaser's per-Game-Object input works for mouse but proved unreliable for touch in this
 * build: buttons that clicked fine on a desktop were dead under a thumb. Rather than
 * carry two input paths and hope, every tappable thing registers a rectangle here and
 * the scene's single `pointerdown` handler routes to it. One path, one place to debug,
 * and no button can be silently un-hittable.
 *
 * Later registrations win, so a panel opened on top of the island takes its own taps.
 */

import type { Scene } from 'phaser';

export interface TapTarget {
    /** Screen-space rectangle, in game (design-resolution) coordinates. */
    bounds: () => { x: number; y: number; width: number; height: number };
    onTap: () => void;
    /** Skip this target when it returns false (hidden, disabled, mid-fade). */
    enabled: () => boolean;
}

const registries = new WeakMap<Scene, TapTarget[]>();

export function registerTap(scene: Scene, target: TapTarget): () => void {
    const list = registries.get(scene) ?? [];
    list.push(target);
    registries.set(scene, list);

    return () => {
        const current = registries.get(scene);
        if (!current) return;
        const index = current.indexOf(target);
        if (index >= 0) current.splice(index, 1);
    };
}

/** Deliver a tap to the topmost enabled target under it. Returns true if it was taken. */
export function routeTap(scene: Scene, x: number, y: number): boolean {
    const list = registries.get(scene);
    if (!list) return false;

    for (let i = list.length - 1; i >= 0; i--) {
        const target = list[i];
        if (!target.enabled()) continue;
        const b = target.bounds();
        if (x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height) {
            target.onTap();
            return true;
        }
    }
    return false;
}

/** True if any *modal* target is currently registered — used to block world input. */
export function clearTaps(scene: Scene): void {
    registries.delete(scene);
}
