#!/usr/bin/env node
/**
 * Writes assets/sounds/chime/note1.wav … note8.wav: one soft bell tone per
 * step of a C-major pentatonic scale, so any run of them sounds musical.
 * Synthesized here (a sine, a decaying octave and a faint fifth above), so
 * there is no licence to track. Run: node scripts/synth-chimes.mjs
 */
import { writeFileSync } from 'node:fs';

const SAMPLE_RATE = 22050;
const DURATION = 0.36;
const NOTES = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51];

function wav(samples) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((s, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s)) * 32767), i * 2));
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

NOTES.forEach((f, index) => {
  const n = Math.round(SAMPLE_RATE * DURATION);
  const samples = Array.from({ length: n }, (_, i) => {
    const t = i / SAMPLE_RATE;
    const envelope = Math.min(1, t / 0.004) * Math.exp(-t / 0.11);
    const tone =
      Math.sin(2 * Math.PI * f * t) +
      0.3 * Math.sin(2 * Math.PI * 2 * f * t) * Math.exp(-t / 0.05) +
      0.12 * Math.sin(2 * Math.PI * 3 * f * t) * Math.exp(-t / 0.03);
    return tone * envelope * 0.55;
  });
  writeFileSync(new URL(`../assets/sounds/chime/note${index + 1}.wav`, import.meta.url), wav(samples));
});
console.log(`wrote ${NOTES.length} chime notes`);
