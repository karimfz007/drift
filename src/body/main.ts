/**
 * BODY — boot. Phaser only ever draws (charter §II.5); the simulation is /src/brain.
 */

import { AUTO, Game, Scale, type Types } from 'phaser';
import { WORLD } from '../data/world';
import { PALETTE } from './theme';
import { BootScene } from './scenes/BootScene';
import { ColdOpenScene } from './scenes/ColdOpenScene';
import { IslandScene } from './scenes/IslandScene';

const config: Types.Core.GameConfig = {
    type: AUTO,
    backgroundColor: PALETTE.seaDeep,
    scale: {
        parent: 'game-container',
        // FIT keeps the authored portrait island intact on every phone and never crops
        // an interactable off screen. Letterboxing is styled to the page background.
        mode: Scale.FIT,
        autoCenter: Scale.CENTER_BOTH,
        width: WORLD.width,
        height: WORLD.height
    },
    input: {
        // One thumb is the target, but a second pointer must not break a hold.
        activePointers: 3,
        touch: true,
        mouse: true,
        keyboard: false,
        gamepad: false
    },
    disableContextMenu: true,
    banner: false,
    scene: [BootScene, ColdOpenScene, IslandScene]
};

new Game(config);

//  The HTML splash covers the first paint; drop it once Phaser has the canvas up.
window.setTimeout(() => {
    const splash = document.getElementById('boot-splash');
    if (!splash) return;
    splash.style.opacity = '0';
    window.setTimeout(() => splash.remove(), 500);
}, 250);
