/**
 * BODY — the placeholder feedback cues, carried over from Cycle 01 unchanged.
 *
 * Straight Web Audio rather than the engine's audio module: the files are the same seven
 * WAVs `tools/gen-audio.mjs` generates, playback is a decode-once-then-fire-buffers loop,
 * and it keeps the renderer's audio subsystem out of the bundle entirely. Every cue is
 * mirrored by something visible, so the game is fully playable on mute (§I.18 rule 7).
 */

export const CUES = {
    target: 'target',
    pickup: 'pickup',
    gather: 'gather',
    collected: 'collected',
    ignition: 'ignition',
    fireloop: 'fireloop',
    denied: 'denied',
    drink: 'drink',
    eat: 'eat',
    craft: 'craft',
    fell: 'fell',
    unlock: 'unlock'
} as const;

export type CueKey = (typeof CUES)[keyof typeof CUES];

const VOLUME: Record<CueKey, number> = {
    target: 0.32,
    pickup: 0.55,
    gather: 0.42,
    collected: 0.6,
    ignition: 0.7,
    fireloop: 0.16,
    denied: 0.5,
    drink: 0.55,
    eat: 0.5,
    craft: 0.55,
    fell: 0.7,
    unlock: 0.62
};

export class Cues {
    private context: AudioContext | null = null;
    private master: GainNode | null = null;
    private buffers = new Map<CueKey, AudioBuffer>();
    private beds = new Map<CueKey, AudioBufferSourceNode>();
    private bedGains = new Map<CueKey, GainNode>();
    private ready = false;

    /** Fetch and decode every cue. Safe to call before the first user gesture. */
    async load(): Promise<void> {
        const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return;

        this.context = new Ctor();
        this.master = this.context.createGain();
        this.master.gain.value = 1;
        this.master.connect(this.context.destination);

        await Promise.all(
            Object.values(CUES).map(async (key) => {
                try {
                    const response = await fetch(`assets/audio/${key}.wav`);
                    const bytes = await response.arrayBuffer();
                    const buffer = await this.context!.decodeAudioData(bytes);
                    this.buffers.set(key, buffer);
                } catch {
                    /* A missing cue must never stop the game starting. */
                }
            })
        );
        this.ready = true;
    }

    /** Every cue REQUESTED this run, newest last. Read-only witness ([[D-075]]). */
    private readonly playLog: CueKey[] = [];

    /** What has been asked for since the last `forgetPlays`. */
    playsSince(): CueKey[] {
        return [...this.playLog];
    }

    /** Zero the log so a check can measure one gesture rather than the whole run. */
    forgetPlays(): void {
        this.playLog.length = 0;
    }

    /** Browsers hold audio until a gesture; call this from the first tap. */
    unlock(): void {
        if (this.context?.state === 'suspended') void this.context.resume();
    }

    play(key: CueKey): void {
        //  RECORDED BEFORE THE EARLY RETURNS, and that placement is the whole point. A device
        //  probe cannot hear anything, and headless audio is frequently never `ready`, so a
        //  witness built on "did a sound come out" is green whether or not the game asked for
        //  one. What a check must be able to see is the REQUEST — `play` being called at all —
        //  because that is what a ruling about feedback is actually about.
        //
        //  Added because the empty-ground revert's own cue check was VACUOUS: `runtime.lastCue`
        //  reads `lastCuePlayed`, which two call sites set by hand, so planting the reverted
        //  `cues.play(CUES.target)` back left the check green. Bounded so a long run cannot
        //  grow it without limit.
        this.playLog.push(key);
        if (this.playLog.length > 200) this.playLog.shift();
        if (!this.ready || !this.context || !this.master) return;
        const buffer = this.buffers.get(key);
        if (!buffer) return;

        const source = this.context.createBufferSource();
        source.buffer = buffer;
        const gain = this.context.createGain();
        gain.gain.value = VOLUME[key];
        source.connect(gain).connect(this.master);
        source.start();
    }

    startBed(key: CueKey): void {
        if (!this.ready || !this.context || !this.master || this.beds.has(key)) return;
        const buffer = this.buffers.get(key);
        if (!buffer) return;

        const source = this.context.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        const gain = this.context.createGain();
        gain.gain.value = VOLUME[key];
        source.connect(gain).connect(this.master);
        source.start();
        this.beds.set(key, source);
        //  P0-G. The gain node was created, set once, and dropped on the floor — only the
        //  source was kept, so a bed could be started and stopped and never turned DOWN. A
        //  fire therefore sounded identical from beside it and from across the island, at a
        //  fixed 0.26, which is the whole of the Director's "no attenuation, too loud".
        this.bedGains.set(key, gain);
    }

    /**
     * Scale a running bed by distance (P0-G). `factor` is 0..1 and multiplies the cue's own
     * volume, so the mix stays authored in one place. Ramped rather than assigned: a step
     * change in gain is an audible click, and a fire that clicks as you walk past it trades
     * one artefact for another.
     */
    setBedFactor(key: CueKey, factor: number): void {
        const gain = this.bedGains.get(key);
        if (!gain || !this.context) return;
        const target = VOLUME[key] * Math.max(0, Math.min(1, factor));
        if (Math.abs(gain.gain.value - target) < 0.002) return;
        gain.gain.setTargetAtTime(target, this.context.currentTime, 0.08);
    }

    /**
     * The gain a running bed is ACTUALLY carrying, or null if it is not running.
     *
     * Added because the first cut of the P0-G check read `fireLoudness()` — the intended
     * factor — and stayed GREEN with the call that applies it planted out. It was witnessing
     * arithmetic, not audio, which is the same mistake as witnessing `TOOL_IDS` instead of the
     * spear. This reads the node in the graph.
     */
    bedGain(key: CueKey): number | null {
        const gain = this.bedGains.get(key);
        return gain ? gain.gain.value : null;
    }

    stopBed(key: CueKey): void {
        const source = this.beds.get(key);
        if (!source) return;
        try {
            source.stop();
        } catch {
            /* already stopped */
        }
        this.beds.delete(key);
        this.bedGains.delete(key);
    }

    stopAllBeds(): void {
        for (const key of [...this.beds.keys()]) this.stopBed(key);
    }

    /** Duck everything when the page goes away, so a backgrounded tab is silent. */
    setMuted(muted: boolean): void {
        if (this.master) this.master.gain.value = muted ? 0 : 1;
    }
}
