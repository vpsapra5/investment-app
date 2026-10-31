// public/js/speech.js
// Daily Alpha — Web Speech Audio Briefing Engine

const SpeechEngine = {
  synth: window.speechSynthesis,
  currentUtterance: null,
  isPlaying: false,

  init() {
    this.floatingBar = document.getElementById('floatingAudioBar');
    this.fabTitle = document.getElementById('fabTitle');
    this.fabStopBtn = document.getElementById('fabStopBtn');

    if (this.fabStopBtn) {
      this.fabStopBtn.addEventListener('click', () => this.stop());
    }

    // Cancel speech on page unload
    window.addEventListener('beforeunload', () => this.stop());
  },

  isSupported() {
    return 'speechSynthesis' in window;
  },

  speak(text, title = "Daily Alpha Briefing") {
    if (!this.isSupported()) {
      alert("Audio speech synthesis is not supported on this browser.");
      return;
    }

    this.stop();

    if (!text || text.trim() === '') return;

    this.currentUtterance = new SpeechSynthesisUtterance(text);
    this.currentUtterance.rate = 1.0;
    this.currentUtterance.pitch = 1.0;

    // Prefer high-quality English natural voices if available
    const voices = this.synth.getVoices();
    const preferredVoice = voices.find(v => 
      (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Samantha") || v.name.includes("Daniel")) && 
      v.lang.startsWith("en")
    );
    if (preferredVoice) {
      this.currentUtterance.voice = preferredVoice;
    }

    this.currentUtterance.onstart = () => {
      this.isPlaying = true;
      if (this.floatingBar) {
        this.fabTitle.textContent = title;
        this.floatingBar.style.display = 'flex';
      }
    };

    this.currentUtterance.onend = () => {
      this.isPlaying = false;
      if (this.floatingBar) {
        this.floatingBar.style.display = 'none';
      }
    };

    this.currentUtterance.onerror = (e) => {
      console.warn("Speech error:", e);
      this.isPlaying = false;
      if (this.floatingBar) {
        this.floatingBar.style.display = 'none';
      }
    };

    this.synth.speak(this.currentUtterance);
  },

  stop() {
    if (this.synth && this.synth.speaking) {
      this.synth.cancel();
    }
    this.isPlaying = false;
    if (this.floatingBar) {
      this.floatingBar.style.display = 'none';
    }
  }
};

window.SpeechEngine = SpeechEngine;
