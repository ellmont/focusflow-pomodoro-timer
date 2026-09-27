/* =========================================================
   settings.js — Pengaturan durasi & penyimpanan (localStorage)
   ========================================================= */

(function () {
  "use strict";

  const STORAGE_KEY = "pomodoro-settings";

  const DEFAULTS = Object.freeze({
    pomodoro: 25,
    shortBreak: 5,
    longBreak: 15,
    rounds: 4,
  });

  const settings = { ...DEFAULTS };

  // ===== Elemen DOM =====
  const inputPomodoro = document.getElementById("input-pomodoro");
  const inputShort = document.getElementById("input-short");
  const inputLong = document.getElementById("input-long");
  const inputRounds = document.getElementById("input-rounds");
  const btnApply = document.getElementById("btn-apply");
  const btnDefault = document.getElementById("btn-default");

  /** Batasi angka ke rentang min–max. */
  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  /** Muat pengaturan dari localStorage (jika ada & valid). */
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (typeof parsed === "object" && parsed !== null) {
        Object.keys(DEFAULTS).forEach(function (key) {
          const val = Number(parsed[key]);
          if (Number.isFinite(val) && val > 0) {
            settings[key] = val;
          }
        });
      }
    } catch (_) {
      /* abaikan data rusak */
    }
  }

  /** Simpan pengaturan saat ini ke localStorage. */
  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (_) {
      /* penyimpanan tidak tersedia */
    }
  }

  /** Baca nilai dari input, terapkan, simpan, lalu sinkronkan UI. */
  function applyFromInputs() {
    settings.pomodoro = clamp(parseInt(inputPomodoro.value, 10) || DEFAULTS.pomodoro, 1, 90);
    settings.shortBreak = clamp(parseInt(inputShort.value, 10) || DEFAULTS.shortBreak, 1, 30);
    settings.longBreak = clamp(parseInt(inputLong.value, 10) || DEFAULTS.longBreak, 1, 60);
    settings.rounds = clamp(parseInt(inputRounds.value, 10) || DEFAULTS.rounds, 1, 8);

    save();
    syncInputs();
    if (window.PomodoroTimer) {
      window.PomodoroTimer.refreshDurations();
    }
  }

  /** Isi ulang input sesuai nilai pengaturan aktif. */
  function syncInputs() {
    inputPomodoro.value = settings.pomodoro;
    inputShort.value = settings.shortBreak;
    inputLong.value = settings.longBreak;
    inputRounds.value = settings.rounds;
  }

  /** Kembalikan semua pengaturan ke nilai default. */
  function resetToDefaults() {
    Object.assign(settings, DEFAULTS);
    save();
    syncInputs();
    if (window.PomodoroTimer) {
      window.PomodoroTimer.refreshDurations();
    }
  }

  /** Tampilkan durasi mode dalam detik untuk timer. */
  function getDurationSeconds(mode) {
    switch (mode) {
      case "pomodoro":
        return settings.pomodoro * 60;
      case "short-break":
        return settings.shortBreak * 60;
      case "long-break":
        return settings.longBreak * 60;
      default:
        return settings.pomodoro * 60;
    }
  }

  function getRounds() {
    return settings.rounds;
  }

  // ===== Event =====
  btnApply.addEventListener("click", applyFromInputs);
  btnDefault.addEventListener("click", resetToDefaults);

  // ===== Init =====
  load();
  syncInputs();

  window.PomodoroSettings = {
    getDurationSeconds,
    getRounds,
    refreshDurations: function () {
      if (window.PomodoroTimer) window.PomodoroTimer.refreshDurations();
    },
  };
})();
