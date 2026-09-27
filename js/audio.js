/* =========================================================
   audio.js — Nada notifikasi, suara ambient, dan taskbar musik
   ========================================================= */

(function () {
  "use strict";

  let ctx = null;
  let ambientSource = null;
  let gainNode = null;
  let ambientRunning = false;

  /** Pastikan AudioContext tersedia (dibuat saat interaksi pertama). */
  function ensureCtx() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  /* ===== Notifikasi beep ===== */

  /** Bunyikan satu beep dengan frekuensi & durasi tertentu. */
  function beep(freq, duration, delay) {
    const ac = ensureCtx();
    if (!ac) return;

    const osc = ac.createOscillator();
    const gain = ac.createGain();

    const t0 = ac.currentTime + (delay || 0);
    osc.type = "sine";
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.35, t0 + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

    osc.connect(gain).connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
  }

  /** Nada saat sesi pomodoro selesai (3 nada naik). */
  function playSessionDone() {
    beep(660, 0.25, 0);
    beep(880, 0.25, 0.28);
    beep(1100, 0.4, 0.56);
  }

  /** Nada saat istirahat selesai (2 nada turun). */
  function playBreakDone() {
    beep(880, 0.25, 0);
    beep(660, 0.4, 0.28);
  }

  /** Klik halus saat tombol ditekan. */
  function playClick() {
    beep(520, 0.06, 0);
  }

  /* ===== Suara ambient ===== */

  /** Bangunkan node sumber noise/pink-noise sederhana per jenis. */
  function buildAmbientSource(ac, type) {
    const bufferSize = 2 * ac.sampleRate;
    const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
    const data = buffer.getChannelData(0);

    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      if (type === "rain" || type === "waves") {
        // Pink-ish noise: halus untuk hujan & ombak
        lastOut = lastOut * 0.97 + white * 0.03;
        data[i] = lastOut * 3.2;
      } else {
        // Brown-ish noise: lebih dalam untuk hutan & kafe
        lastOut = (lastOut + 0.02 * white) / 1.02;
        data[i] = lastOut * 3.5;
      }
    }

    const src = ac.createBufferSource();
    src.buffer = buffer;
    src.loop = true;

    // Filter & LFO agar tiap suara terasa berbeda
    const filter = ac.createBiquadFilter();
    const lfo = ac.createOscillator();
    const lfoGain = ac.createGain();

    switch (type) {
      case "rain":
        filter.type = "highpass";
        filter.frequency.value = 900;
        break;
      case "waves":
        filter.type = "lowpass";
        filter.frequency.value = 500;
        lfo.frequency.value = 0.12; // deburan pelan
        lfoGain.gain.value = 250;
        lfo.connect(lfoGain).connect(filter.frequency);
        lfo.start();
        break;
      case "forest":
        filter.type = "bandpass";
        filter.frequency.value = 1400;
        filter.Q.value = 0.6;
        break;
      case "cafe":
        filter.type = "lowpass";
        filter.frequency.value = 700;
        break;
    }

    src.connect(filter);
    return { source: src, output: filter };
  }

  /** Mulai suara ambient tertentu. */
  function playAmbient(type) {
    stopAmbient();
    const ac = ensureCtx();
    if (!ac) return;

    const built = buildAmbientSource(ac, type);
    gainNode = ac.createGain();
    gainNode.gain.value = getVolume();

    built.output.connect(gainNode).connect(ac.destination);
    built.source.start();

    ambientSource = built.source;
    ambientRunning = true;
  }

  /** Hentikan suara ambient. */
  function stopAmbient() {
    if (ambientSource) {
      try {
        ambientSource.stop();
      } catch (_) {
        /* sudah berhenti */
      }
      ambientSource = null;
    }
    if (gainNode) {
      gainNode.disconnect();
      gainNode = null;
    }
    ambientRunning = false;
  }

  function isAmbientRunning() {
    return ambientRunning;
  }

  /* ===== Volume ===== */

  let volume = 0.5;

  function setVolume(v) {
    volume = Math.min(1, Math.max(0, v));
    if (gainNode) gainNode.gain.value = volume;
  }

  function getVolume() {
    return volume;
  }

  /* ===== Ekspos ke global ===== */

  window.PomodoroAudio = {
    playSessionDone,
    playBreakDone,
    playClick,
    playAmbient,
    stopAmbient,
    isAmbientRunning,
    setVolume,
    getVolume,
  };
})();
