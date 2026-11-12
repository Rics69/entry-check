/**
 * Звуки интерфейса: короткий синтезированный «тик» через Web Audio, без аудиофайлов.
 * Синусоида с восходящей частотой, атака 2 мс и быстрое затухание — звук не мешает и не «звенит».
 * Выбор «со звуком / без» хранится у человека в браузере (localStorage), по умолчанию звук включён.
 */

export type SoundKind = "tap" | "press" | "toggle";

type Voice = { from: number; to: number; peak: number; decay: number };

const VOICES: Record<SoundKind, Voice> = {
  // Пункты меню и ссылки навигации.
  tap: { from: 430, to: 640, peak: 0.4, decay: 0.037 },
  // Главные кнопки: ниже и чуть плотнее.
  press: { from: 300, to: 470, peak: 0.45, decay: 0.045 },
  // Переключатели: короче и выше.
  toggle: { from: 560, to: 820, peak: 0.3, decay: 0.028 },
};

const STORAGE_KEY = "ec-sound";
const MASTER_VOLUME = 0.22;

let context: AudioContext | null = null;
let master: GainNode | null = null;
const listeners = new Set<() => void>();

export function isSoundEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setSoundEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? "on" : "off");
  } catch {
    // Приватный режим или запрет хранилища — просто не запоминаем.
  }
  listeners.forEach((listener) => listener());
}

/** Подписка для useSyncExternalStore: своя вкладка и другие вкладки (событие storage). */
export function subscribeSound(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function audio(): { ctx: AudioContext; out: GainNode } | null {
  if (!context) {
    const AudioCtor =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return null;
    context = new AudioCtor();
    master = context.createGain();
    master.gain.value = MASTER_VOLUME;
    master.connect(context.destination);
  }
  if (context.state === "suspended") void context.resume();
  return { ctx: context, out: master! };
}

/** Проиграть звук. Вызывать только из обработчика действия человека — иначе браузер не даст играть. */
export function playSound(kind: SoundKind = "tap", { force = false } = {}): void {
  if (!force && !isSoundEnabled()) return;
  const a = audio();
  if (!a) return;
  const { ctx, out } = a;
  const voice = VOICES[kind];
  const t = ctx.currentTime;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.linearRampToValueAtTime(voice.peak, t + 0.002);
  gain.gain.setTargetAtTime(0.0001, t + 0.002, voice.decay);

  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(voice.from, t);
  osc.frequency.exponentialRampToValueAtTime(voice.to, t + 0.14);

  osc.connect(gain).connect(out);
  osc.start(t);
  osc.stop(t + 0.24);
  osc.onended = () => {
    osc.disconnect();
    gain.disconnect();
  };
}
