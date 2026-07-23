/**
 * BODY — landscape presentation (D-041, A2). The phone should disappear: the game lives in
 * landscape, edge to edge. This owns the three things that make a browser page feel like an
 * app — a rotate-me prompt while the phone is upright, a jump to fullscreen on the first
 * touch, and a best-effort lock to landscape — and it does all of it without the brain ever
 * knowing the screen turned.
 *
 * Every capability here is optional at the platform level (iOS Safari grants none of the
 * lock APIs), so each call is guarded and failure is silent: the worst case is the player
 * simply turns the phone, which the rotate prompt already asked them to do.
 */

import { TUNE } from '../data/tune';

const PROMPT_ID = 'rotate-prompt';

/** True when the viewport is taller than it is wide — the phone is upright. */
function isPortrait(): boolean {
    return window.innerHeight > window.innerWidth;
}

/** Install the rotate prompt and the first-touch fullscreen/lock. Call once, at boot. */
export function installLandscape(): void {
    if (TUNE.rotatePromptEnabled) {
        ensurePrompt();
        paintPrompt();
        window.addEventListener('resize', paintPrompt);
        window.addEventListener('orientationchange', () => window.setTimeout(paintPrompt, 60));
    }

    //  Browsers only grant fullscreen and orientation-lock inside a user gesture, so the
    //  very first touch anywhere does the work — once.
    const onFirstGesture = () => {
        window.removeEventListener('pointerdown', onFirstGesture);
        window.removeEventListener('touchend', onFirstGesture);
        void goFullscreenAndLock();
    };
    window.addEventListener('pointerdown', onFirstGesture, { once: false });
    window.addEventListener('touchend', onFirstGesture, { once: false });
}

function ensurePrompt(): void {
    if (document.getElementById(PROMPT_ID)) return;
    const el = document.createElement('div');
    el.id = PROMPT_ID;
    el.innerHTML = `<div class="rotate-icon">⟳</div><p>Turn your phone sideways</p><span>The First Night plays in landscape.</span>`;
    document.body.appendChild(el);
}

function paintPrompt(): void {
    const el = document.getElementById(PROMPT_ID);
    if (!el) return;
    el.classList.toggle('show', isPortrait());
}

async function goFullscreenAndLock(): Promise<void> {
    try {
        const target = document.documentElement as HTMLElement & {
            webkitRequestFullscreen?: () => Promise<void>;
        };
        if (!document.fullscreenElement) {
            if (target.requestFullscreen) await target.requestFullscreen();
            else if (target.webkitRequestFullscreen) await target.webkitRequestFullscreen();
        }
    } catch {
        /* fullscreen refused (iOS, or user denied) — the game still fills the viewport */
    }
    try {
        const orientation = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
        if (orientation?.lock) await orientation.lock('landscape');
    } catch {
        /* orientation-lock unsupported or refused — the rotate prompt covers the gap */
    }
}
