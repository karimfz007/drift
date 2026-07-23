#!/usr/bin/env node
/**
 * Placeholder audio generator — the six Cycle 01 feedback cues.
 *
 * Library-first (charter §II.10) says rent the plumbing; for six short blips the
 * "package" would cost more concepts than it removes, and every sample library carries
 * an attribution trail. These are synthesised from scratch by this script, so they are
 * ours, licence-free, and regenerate identically from source.
 *
 * Run: npm run gen:audio  → public/assets/audio/*.wav
 *
 * The six cues (Cycle 01 spec, Stage 2):
 *   target      — a node comes into reach / is designated
 *   pickup      — driftwood collected (instant)
 *   gather      — deadfall hold in progress (looping bed)
 *   collected   — wood added to the pack (the count changes)
 *   ignition    — the fire catches
 *   fireloop    — the fire burning (looping bed)
 *   denied      — not enough wood
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SAMPLE_RATE = 22050;  // Plenty for short placeholder cues; halves the mobile payload.
const outDir = fileURLToPath(new URL('../public/assets/audio/', import.meta.url));

// ---- tiny synth ---------------------------------------------------------

const TAU = Math.PI * 2;

/** Deterministic noise so every regeneration is byte-identical. */
function makeNoise(seed) {
    let s = seed >>> 0;
    return () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return (s / 0xffffffff) * 2 - 1;
    };
}

function render(durationSeconds, fn) {
    const length = Math.floor(SAMPLE_RATE * durationSeconds);
    const data = new Float32Array(length);
    for (let i = 0; i < length; i++) {
        data[i] = fn(i / SAMPLE_RATE, i / length);
    }
    return data;
}

/** Attack/decay envelope in [0,1] over normalised progress. */
function ad(progress, attack) {
    if (progress < attack) return progress / attack;
    const rest = (progress - attack) / (1 - attack);
    return Math.pow(1 - rest, 2.2);
}

function sine(t, hz) {
    return Math.sin(TAU * hz * t);
}

/** Soft-clip so the placeholder cues never spike a phone speaker. */
function limit(x) {
    return Math.tanh(x * 1.4) * 0.72;
}

function toWav(samples) {
    const bytesPerSample = 2;
    const dataLength = samples.length * bytesPerSample;
    const buffer = Buffer.alloc(44 + dataLength);

    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataLength, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16);            // PCM chunk size
    buffer.writeUInt16LE(1, 20);             // PCM
    buffer.writeUInt16LE(1, 22);             // mono
    buffer.writeUInt32LE(SAMPLE_RATE, 24);
    buffer.writeUInt32LE(SAMPLE_RATE * bytesPerSample, 28);
    buffer.writeUInt16LE(bytesPerSample, 32);
    buffer.writeUInt16LE(16, 34);            // bit depth
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataLength, 40);

    for (let i = 0; i < samples.length; i++) {
        const clamped = Math.max(-1, Math.min(1, samples[i]));
        buffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * bytesPerSample);
    }
    return buffer;
}

// ---- the cues -----------------------------------------------------------

const cues = {
    // A soft wooden "tick" — something is in reach.
    target: () =>
        render(0.09, (t, p) => limit(sine(t, 880) * 0.35 * ad(p, 0.01) + sine(t, 1320) * 0.12 * ad(p, 0.005))),

    // Driftwood picked up: a short dry knock, low and satisfying.
    pickup: () => {
        const noise = makeNoise(11);
        return render(0.16, (t, p) =>
            limit(
                sine(t, 300 - 90 * p) * 0.5 * ad(p, 0.008) +
                noise() * 0.18 * ad(p, 0.002)
            )
        );
    },

    // Deadfall salvage in progress: a fibrous scrape that loops under the hold ring.
    gather: () => {
        const noise = makeNoise(23);
        let smooth = 0;
        return render(0.5, (t) => {
            smooth = smooth * 0.86 + noise() * 0.14;
            const swell = 0.55 + 0.45 * Math.sin(TAU * 3.1 * t);
            return limit(smooth * 1.9 * swell * 0.55 + sine(t, 140) * 0.05);
        });
    },

    // Wood added to the pack: two rising wooden notes — progress you can hear.
    collected: () =>
        render(0.26, (t, p) => {
            const first = sine(t, 440) * 0.4 * ad(Math.min(1, p / 0.5), 0.01);
            const second = p > 0.42 ? sine(t, 660) * 0.4 * ad((p - 0.42) / 0.58, 0.01) : 0;
            return limit(first + second);
        }),

    // Ignition: a whoosh that catches and settles — the relief beat.
    ignition: () => {
        const noise = makeNoise(37);
        let smooth = 0;
        return render(0.85, (t, p) => {
            smooth = smooth * 0.9 + noise() * 0.1;
            const catchEnv = Math.pow(1 - p, 1.6);
            const body = sine(t, 120 + 80 * Math.sin(TAU * 1.5 * t)) * 0.28 * catchEnv;
            return limit(smooth * 2.4 * catchEnv * 0.8 + body);
        });
    },

    // The fire burning: a low crackling bed, seamless enough to loop.
    fireloop: () => {
        const noise = makeNoise(53);
        const crackle = makeNoise(97);
        let smooth = 0;
        const duration = 2.0;
        return render(duration, (t, p) => {
            smooth = smooth * 0.93 + noise() * 0.07;
            const spark = crackle() > 0.985 ? crackle() * 0.5 : 0;
            // Cross-fade the tail into the head so the loop has no seam.
            const seam = p > 0.9 ? (1 - p) / 0.1 : 1;
            const bed = smooth * 1.5 + sine(t, 70) * 0.06 + spark;
            return limit(bed * 0.55 * seam + (1 - seam) * smooth * 0.8);
        });
    },

    // Not enough wood: a flat, low, unmistakably negative thud. Never harsh.
    denied: () =>
        render(0.18, (t, p) => limit(sine(t, 150) * 0.45 * ad(p, 0.02) + sine(t, 151.5) * 0.2 * ad(p, 0.02))),

    // A sip of water: a soft wet gulp, a little rising pitch — relief.
    drink: () => {
        const noise = makeNoise(61);
        let smooth = 0;
        return render(0.34, (t, p) => {
            smooth = smooth * 0.8 + noise() * 0.2;
            const gulp = Math.sin(TAU * (5 + 8 * p) * t) * 0.18 * Math.sin(Math.PI * p);
            return limit(gulp + smooth * 0.12 * Math.sin(Math.PI * p) + sine(t, 210 + 120 * p) * 0.14 * ad(p, 0.05));
        });
    },

    // Eating: two soft organic taps — a bite.
    eat: () => {
        const noise = makeNoise(71);
        return render(0.24, (t, p) => {
            const bite = (q) => noise() * 0.3 * ad(Math.min(1, q), 0.02);
            const first = bite(p / 0.45);
            const second = p > 0.5 ? bite((p - 0.5) / 0.5) : 0;
            return limit(first + second + sine(t, 180) * 0.1 * ad(p, 0.05));
        });
    },

    // Crafting: a purposeful wooden assembly — knock, bind, settle.
    craft: () => {
        const noise = makeNoise(83);
        return render(0.5, (t, p) => {
            const knock = (at, f) => (Math.abs(p - at) < 0.05 ? sine(t, f) * 0.4 : 0);
            const scrape = noise() * 0.12 * (p > 0.35 && p < 0.7 ? 1 : 0);
            return limit(knock(0.08, 300) + knock(0.28, 340) + scrape + knock(0.85, 420) * 1.1);
        });
    },

    // A tree coming down: a deep splintering crack, then a settling thud.
    fell: () => {
        const noise = makeNoise(101);
        let smooth = 0;
        return render(1.0, (t, p) => {
            smooth = smooth * 0.9 + noise() * 0.1;
            const crack = p < 0.25 ? smooth * 2.2 * Math.pow(1 - p / 0.25, 0.6) : 0;
            const whoosh = p >= 0.25 && p < 0.75 ? smooth * 1.2 * Math.sin(Math.PI * (p - 0.25) / 0.5) : 0;
            const thud = p >= 0.7 ? sine(t, 70) * 0.5 * Math.pow(1 - (p - 0.7) / 0.3, 1.5) + smooth * 0.8 * Math.pow(1 - (p - 0.7) / 0.3, 2) : 0;
            return limit(crack + whoosh + thud);
        });
    },

    // Unlocking the crash box: a metallic latch giving way — a discovery chime under it.
    unlock: () => {
        const noise = makeNoise(113);
        return render(0.6, (t, p) => {
            const clunk = p < 0.2 ? (noise() * 0.4 + sine(t, 220) * 0.3) * Math.pow(1 - p / 0.2, 0.8) : 0;
            const chime = p > 0.22
                ? (sine(t, 660) * 0.22 + sine(t, 990) * 0.14) * ad((p - 0.22) / 0.78, 0.02)
                : 0;
            return limit(clunk + chime);
        });
    }
};

mkdirSync(outDir, { recursive: true });

for (const [name, make] of Object.entries(cues)) {
    const wav = toWav(make());
    writeFileSync(join(outDir, `${name}.wav`), wav);
    console.log(`  ${name}.wav  ${(wav.length / 1024).toFixed(1)} KB`);
}

console.log(`\n${Object.keys(cues).length} placeholder cues written to public/assets/audio/`);
