/* =========================================================
   timer.js — Logika inti timer, mode, ring progres & dots
   ========================================================= */

(function () {
  "use strict";

  const MODES = Object.freeze({
    "pomodoro": { label: "Fokus Kerja", next: "short-break" },
    "short-break": { label: "Istirahat Pendek", next: "pomodoro" },
    "long-break": { label: "Istirahat Panjang", next: "pomodoro" },
  });

  // ===== State =====
  let currentMode = "pomodoro";
  let totalSeconds = 25 * 60;
  let remainingSeconds = totalSeconds;
  let tickHandle = null;
  let isRunning = false;
  let completedSessions = 0;
  let roundCount = 0; // pomodoro selesai dalam rangkaian saat ini

  // ===== Elemen DOM =====
  const timeDisplay = document.getElementById("time-display");
  const modeLabel = document.getElementById("mode-label");
  const ringProgress = document.querySelector(".timer-ring__progress");
  const ringEl = document.querySelector(".timer-ring");
  const btnStart = document.getElementById("btn-start");
  const btnPause = document.getElementById("btn-pause");
  const btnReset = document.getElementById("btn-reset");
  const btnSkip = document.getElementById("btn-skip");
  const sessionDots = document.getElementById("session-dots");
  const completedCountEl = document.getElementById("completed-count");
  const modeTabs = Array.from(document.querySelectorAll(".mode-tab"));

  const RING_CIRCUMFERENCE = 628; // r=100 -> 2*pi*r ~ 628

  // ===== Render =====

  /** Format detik menjadi MM:SS. */
  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  }

  /** Perbarui teks waktu di layar & judul tab browser. */
  function renderTime() {
    const text = formatTime(remainingSeconds);
    timeDisplay.textContent = text;
    document.title = isRunning ? text + " — " + MODES[currentMode].label : "Pomodoro Timer";
  }

  /** Perbarui lingkaran progres. */
  function renderRing() {
    const ratio = totalSeconds > 0 ? remainingSeconds / totalSeconds : 0;
    const offset = RING_CIRCUMFERENCE * (1 - ratio);
    ringProgress.style.strokeDashoffset = String(offset);
  }

  /** Perbarui dots sesi selesai. */
  function renderDots() {
    const dots = sessionDots.querySelectorAll(".session-dot");
    const limit = Math.min(dots.length, window.PomodoroSettings.getRounds());
    dots.forEach(function (dot, i) {
      dot.classList.toggle("is-done", i < limit && i < roundCount);
    });
    dots.forEach(function (dot, i) {
      dot.style.display = i < limit ? "" : "none";
    });
  }

  /** Terapkan warna aksen sesuai mode aktif. */
  function renderAccent() {
    const root = document.documentElement;
    const map = {
      "pomodoro": ["--color-pomodoro", "--color-pomodoro-dark"],
      "short-break": ["--color-short", "--color-short-dark"],
      "long-break": ["--color-long", "--color-long-dark"],
    };
    const vars = map[currentMode];
    root.style.setProperty("--accent", "var(" + vars[0] + ")");
    root.style.setProperty("--accent-dark", "var(" + vars[1] + ")");

    document.body.dataset.mode = currentMode;
  }

  /** Render tab aktif. */
  function renderTabs() {
    modeTabs.forEach(function (tab) {
      tab.classList.toggle("is-active", tab.dataset.mode === currentMode);
    });
  }

  /** Render label mode. */
  function renderModeLabel() {
    modeLabel.textContent = MODES[currentMode].label;
  }

  function renderAll() {
    renderTime();
    renderRing();
    renderAccent();
    renderTabs();
    renderModeLabel();
    renderDots();
    renderButtons();
  }

  // ===== Timer engine =====

  function tick() {
    remainingSeconds -= 1;
    if (remainingSeconds <= 0) {
      remainingSeconds = 0;
      renderTime();
      renderRing();
      complete();
      return;
    }
    renderTime();
    renderRing();
  }

  function start() {
    if (isRunning) return;
    if (remainingSeconds === 0) {
      remainingSeconds = totalSeconds;
    }
    isRunning = true;
    tickHandle = setInterval(tick, 1000);
    renderTime();
    renderButtons();
  }

  function pause() {
    if (!isRunning) return;
    isRunning = false;
    clearInterval(tickHandle);
    tickHandle = null;
    renderTime();
    renderButtons();
  }

  function reset() {
    isRunning = false;
    clearInterval(tickHandle);
    tickHandle = null;
    totalSeconds = window.PomodoroSettings.getDurationSeconds(currentMode);
    remainingSeconds = totalSeconds;
    renderAll();
  }

  /** Pindah ke mode tertentu (tanpa menjalankan timer). */
  function setMode(mode) {
    if (!MODES[mode]) return;
    pause();
    currentMode = mode;
    totalSeconds = window.PomodoroSettings.getDurationSeconds(mode);
    remainingSeconds = totalSeconds;
    renderAll();
  }

  /** Lewati sesi saat ini tanpa menghitung sesi selesai. */
  function skip() {
    complete(true);
  }

  /** Dipanggil saat waktu habis (atau dilewati). */
  function complete(skipped) {
    pause();

    const audio = window.PomodoroAudio;
    if (audio) {
      if (currentMode === "pomodoro") {
        audio.playSessionDone();
      } else {
        audio.playBreakDone();
      }
    }

    if (currentMode === "pomodoro" && !skipped) {
      completedSessions += 1;
      roundCount += 1;
      completedCountEl.textContent = String(completedSessions);

      // Setelah rounds pomodoro, beri istirahat panjang
      const rounds = window.PomodoroSettings.getRounds();
      if (roundCount >= rounds) {
        roundCount = 0;
        setMode("long-break");
      } else {
        setMode("short-break");
      }
    } else {
      // Dari istirahat kembali ke pomodoro
      setMode("pomodoro");
    }

    renderAll();
  }

  // ===== Tombol =====

  function renderButtons() {
    btnStart.disabled = isRunning;
    btnPause.disabled = !isRunning;
  }

  btnStart.addEventListener("click", function () {
    if (window.PomodoroAudio) window.PomodoroAudio.playClick();
    start();
  });

  btnPause.addEventListener("click", pause);

  btnReset.addEventListener("click", function () {
    reset();
  });

  btnSkip.addEventListener("click", function () {
    skip();
  });

  // ===== Tabs =====
  modeTabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      setMode(tab.dataset.mode);
    });
  });

  // ===== Init =====
  totalSeconds = window.PomodoroSettings.getDurationSeconds(currentMode);
  remainingSeconds = totalSeconds;
  renderAll();

  window.PomodoroTimer = {
    refreshDurations: function () {
      if (!isRunning) {
        totalSeconds = window.PomodoroSettings.getDurationSeconds(currentMode);
        remainingSeconds = totalSeconds;
        renderAll();
      }
    },
  };
})();
