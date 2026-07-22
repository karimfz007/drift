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
    denied: 'denied'
} as const;

export type CueKey = (typeof CUES)[keyof typeof CUES];

const VOLUME: Record<CueKey, number> = {
    target: 0.32,
    pickup: 0.55,
    gather: 0.42,
    collected: 0.6,
    ignition: 0.7,
    fireloop: 0.26,
    denied: 0.5
};

export class Cues {
    private context: AudioContext | null = null;
    private master: GainNode | null = null;
    private buffers = new Map<CueKey, AudioBuffer>();
    private beds = new Map<CueKey, AudioBufferSourceNode>();
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

    /** Browsers hold audio until a gesture; call this from the first tap. */
    unlock(): void {
        if (this.context?.state === 'suspended') void this.context.resume();
    }

    play(key: CueKey): void {
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
    }

    stopAllBeds(): void {
        for (const key of [...this.beds.keys()]) this.stopBed(key);
    }

    /** Duck everything when the page goes away, so a backgrounded tab is silent. */
    setMuted(muted: boolean): void {
        if (this.master) this.master.gain.value = muted ? 0 : 1;
    }
}
