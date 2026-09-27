/* =========================================================
   app.js — Inisialisasi aplikasi & koneksi antar modul
   ========================================================= */

(function () {
  "use strict";

  // ===== Taskbar musik =====
  const btnMusicToggle = document.getElementById("btn-music-toggle");
  const musicTrack = document.getElementById("music-track");
  const musicVolume = document.getElementById("music-volume");

  const audio = window.PomodoroAudio;

  /** Mulai suara ambient sesuai pilihan; "off" berarti hentikan. */
  function updateAmbient() {
    if (!audio) return;
    const track = musicTrack.value;
    if (track === "off") {
      audio.stopAmbient();
      btnMusicToggle.classList.remove("is-playing");
      return;
    }
    audio.playAmbient(track);
    btnMusicToggle.classList.add("is-playing");
  }

  btnMusicToggle.addEventListener("click", function () {
    if (!audio) return;
    if (musicTrack.value === "off") {
      // Default ke hujan bila belum ada pilihan
      musicTrack.value = "rain";
    }
    if (audio.isAmbientRunning()) {
      audio.stopAmbient();
      btnMusicToggle.classList.remove("is-playing");
    } else {
      updateAmbient();
    }
  });

  musicTrack.addEventListener("change", updateAmbient);

  musicVolume.addEventListener("input", function () {
    if (audio) audio.setVolume(Number(musicVolume.value) / 100);
  });

  // ===== Pintasan keyboard =====
  document.addEventListener("keydown", function (e) {
    // Abaikan bila sedang mengetik di input
    const tag = (e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "select" || tag === "textarea") return;

    switch (e.key.toLowerCase()) {
      case " ":
      case "spacebar":
        e.preventDefault();
        if (window.PomodoroTimer) {
          // Toggle mulai/jeda lewat tombol yang aktif
          const start = document.getElementById("btn-start");
          const pause = document.getElementById("btn-pause");
          if (!pause.disabled) pause.click();
          else start.click();
        }
        break;
      case "r":
        document.getElementById("btn-reset").click();
        break;
      case "m":
        btnMusicToggle.click();
        break;
    }
  });

  // ===== Simpan volume ke localStorage =====
  const VOLUME_KEY = "pomodoro-volume";

  (function initVolume() {
    let saved = 0.5;
    try {
      const raw = localStorage.getItem(VOLUME_KEY);
      if (raw !== null) saved = clamp01(parseFloat(raw));
    } catch (_) {
      /* abaikan */
    }
    musicVolume.value = String(Math.round(saved * 100));
    if (audio) audio.setVolume(saved);
  })();

  function clamp01(v) {
    if (!Number.isFinite(v)) return 0.5;
    return Math.min(1, Math.max(0, v));
  }

  musicVolume.addEventListener("change", function () {
    try {
      localStorage.setItem(VOLUME_KEY, musicVolume.value);
    } catch (_) {
      /* abaikan */
    }
  });

  // ===== Pemberitahuan ringan (toast sederhana) =====
  function showToast(message) {
    const existing = document.querySelector(".toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(function () {
      toast.classList.add("is-visible");
    }, 10);

    setTimeout(function () {
      toast.classList.remove("is-visible");
      setTimeout(function () {
        toast.remove();
      }, 300);
    }, 2600);
  }

  // Toast saat mode berubah (opsional, non-intrusif)
  const modeLabel = document.getElementById("mode-label");
  let lastLabel = modeLabel.textContent;
  const observer = new MutationObserver(function () {
    if (modeLabel.textContent !== lastLabel) {
      lastLabel = modeLabel.textContent;
      showToast("Mode: " + lastLabel);
    }
  });
  observer.observe(modeLabel, { childList: true });

  // ===== Prompt sebelum menutup tab saat timer berjalan =====
  window.addEventListener("beforeunload", function (e) {
    const pauseBtn = document.getElementById("btn-pause");
    if (pauseBtn && !pauseBtn.disabled) {
      e.preventDefault();
      e.returnValue = "";
    }
  });
})();
