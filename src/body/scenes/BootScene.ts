/**
 * BODY — boot scene. Loads the seven placeholder cues, starts the run, and routes:
 * a fresh run gets the cold open; a returning run goes straight to the island, where
 * the morning report is waiting.
 */

import { Scene } from 'phaser';
import { preloadCues } from '../audio';
import { installLifecycleHooks, runtime, startRuntime } from '../runtime';

export class BootScene extends Scene {
    constructor() {
        super('Boot');
    }

    preload(): void {
        preloadCues(this);
    }

    create(): void {
        startRuntime();
        installLifecycleHooks();
        this.scene.start(runtime.isNewRun ? 'ColdOpen' : 'Island');
    }
}
