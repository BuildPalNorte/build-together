/**
 * Web Audio only, no audio files. Muted by default; the choice persists in localStorage.
 * The AudioContext is created after a user gesture.
 */
const STORAGE_KEY = 'bt:sound';
const MIN_GAP_MS = 140;
const MAX_PER_BURST = 3;
const BURST_WINDOW_MS = 1500;

type Listener = () => void;

let ctx: AudioContext | null = null;
let enabled = false;
let loaded = false;
let gestureBound = false;
const listeners = new Set<Listener>();
const playedIds = new Set<string>();
let burstStart = 0;
let burstCount = 0;
let lastAt = 0;

function load() {
  if (loaded || typeof window === 'undefined') return;
  loaded = true;
  try {
    enabled = window.localStorage.getItem(STORAGE_KEY) === 'on';
  } catch {
    enabled = false;
  }
  if (enabled) bindGesture();
}

function bindGesture() {
  if (gestureBound || typeof window === 'undefined') return;
  gestureBound = true;
  const unlock = () => {
    ensureContext();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
    gestureBound = false;
  };
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });
}

function ensureContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function emit() {
  for (const l of listeners) l();
}

export function subscribeSound(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isSoundOn(): boolean {
  load();
  return enabled;
}

/** Call from a click handler so the context is created inside a user gesture. */
export function setSoundOn(next: boolean) {
  load();
  enabled = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, next ? 'on' : 'off');
  } catch {
    /* storage unavailable: keep the in-memory choice */
  }
  if (next) ensureContext();
  emit();
}

function allowed(id: string): boolean {
  load();
  if (!enabled || !ctx || ctx.state !== 'running') return false;
  if (playedIds.has(id)) return false;
  playedIds.add(id);
  const now = performance.now();
  if (now - burstStart > BURST_WINDOW_MS) {
    burstStart = now;
    burstCount = 0;
  }
  if (burstCount >= MAX_PER_BURST) return false;
  burstCount += 1;
  return true;
}

function startTime(audio: AudioContext): number {
  const now = performance.now();
  const gap = Math.max(0, lastAt + MIN_GAP_MS - now);
  lastAt = now + gap;
  return audio.currentTime + gap / 1000;
}

/** Soft digital pop, 320 to 640 Hz, exponential envelope, 160ms. */
export function playNodeSound(id: string) {
  if (!allowed(id) || !ctx) return;
  const t = startTime(ctx);
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(320, t);
  osc.frequency.exponentialRampToValueAtTime(640, t + 0.16);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.18);
}

/** Two-tone chime, E5 and B5, through a warm bandpass filter. */
export function playConnectionSound(id: string) {
  if (!allowed(id) || !ctx) return;
  const t = startTime(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1400;
  filter.Q.value = 0.7;
  filter.connect(ctx.destination);
  [659.25, 987.77].forEach((freq, i) => {
    const start = t + i * 0.09;
    const osc = ctx!.createOscillator();
    const gain = ctx!.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.1, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.45);
    osc.connect(gain).connect(filter);
    osc.start(start);
    osc.stop(start + 0.5);
  });
}
