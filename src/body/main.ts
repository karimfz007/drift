/**
 * BODY — boot. The renderer only ever draws (charter §II.5); the simulation is /src/brain.
 */

import { Game } from './game';
import { runtime, startRuntime } from './runtime';

function boot(): void {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
    const overlay = document.getElementById('ui') as HTMLElement | null;
    if (!canvas || !overlay) throw new Error('The page is missing its canvas or UI layer');

    //  Load (or start) the run before a single mesh exists: the morning report belongs to
    //  the absence that just ended, not to whatever the renderer manages to show first.
    startRuntime();

    const game = new Game(canvas, overlay);
    game.start();

    //  Drop the HTML splash once the scene has actually rendered something.
    const splash = document.getElementById('boot-splash');
    if (!splash) return;

    const clear = () => {
        splash.style.opacity = '0';
        window.setTimeout(() => splash.remove(), 500);
    };
    const poll = window.setInterval(() => {
        if (!runtime.sceneReady) return;
        window.clearInterval(poll);
        clear();
    }, 100);
    //  Never let a stalled scene leave the splash up forever.
    window.setTimeout(() => {
        window.clearInterval(poll);
        clear();
    }, 12_000);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
} else {
    boot();
}
