/**
 * BODY — the controlled new-build prompt (D-014, scheduled for this cycle by the 2026-07-23
 * PERFECT-pass handoff). GitHub Pages/Fastly caches `index.html` itself for up to ten minutes
 * (`Cache-Control: max-age=600`, confirmed live) and GH Pages offers no way to override that
 * header. Vite's content-hashed JS filenames make an ALREADY-loaded page safe — nothing ever
 * hot-swaps under a running session — but a page loaded from a stale cached `index.html` can
 * silently keep running an OLDER bundle indefinitely, including one with fixes the director
 * had already been told shipped. That is the recurring "ghost bug" class this closes.
 *
 * The fix is a version check, not a shorter cache lifetime we cannot set: refetch the site
 * root with `cache: 'no-store'` (bypassing HTTP caching outright) and compare its referenced
 * bundle filename to the one actually running. On a mismatch, a small corner prompt offers a
 * reload — never automatic, never mid-interaction. D-014's law verbatim: "assets are never
 * hot-swapped mid-session."
 */

const CHECK_ID = 'update-banner';
const CHECK_INTERVAL_MS = 5 * 60 * 1000;

function currentBundleSrc(): string | null {
    return document.querySelector('script[type="module"]')?.getAttribute('src') ?? null;
}

async function fetchLatestBundleSrc(): Promise<string | null> {
    try {
        const res = await fetch('./', { cache: 'no-store' });
        if (!res.ok) return null;
        const html = await res.text();
        const match = html.match(/<script[^>]*type="module"[^>]*\ssrc="([^"]+)"/);
        return match ? match[1] : null;
    } catch {
        return null; // offline, or the fetch failed — silently skip this check
    }
}

function showUpdateBanner(): void {
    if (document.getElementById(CHECK_ID)) return; // already shown, don't stack
    const el = document.createElement('div');
    el.id = CHECK_ID;
    el.innerHTML = `<button type="button">A new build is ready — Reload</button>`;
    el.querySelector('button')!.addEventListener('pointerdown', (e) => e.stopPropagation());
    el.querySelector('button')!.addEventListener('click', () => window.location.reload());
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
}

async function checkOnce(): Promise<void> {
    if (document.getElementById(CHECK_ID)) return; // already flagged, no need to re-check
    const running = currentBundleSrc();
    const latest = await fetchLatestBundleSrc();
    if (running && latest && running !== latest) showUpdateBanner();
}

/** Install the version check. Call once, at boot. */
export function installUpdateCheck(): void {
    //  The moment a backgrounded session returns to the foreground is both the likeliest
    //  time a new build has shipped since the tab was last active, and the least disruptive
    //  time to surface the prompt — the player just picked the phone back up.
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void checkOnce();
    });
    //  A background fallback for long uninterrupted sessions that never leave the foreground.
    window.setInterval(() => void checkOnce(), CHECK_INTERVAL_MS);
}
