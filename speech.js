/**
 * speech.js — Modulo TTS italiano con Web Speech API.
 * Esportato come ES module, zero dipendenze esterne.
 */

let voice = null;
let avatarCallback = null;
let voiceEnabled = localStorage.getItem("voiceEnabled") !== "false"; // default: true

// Carica le voci disponibili (async su Chrome/Edge)
function loadVoice() {
  const voices = speechSynthesis.getVoices();
  // Preferenza: voce italiana specifica, poi qualsiasi it-IT, poi it
  voice =
    voices.find(v => /it[-_]IT/i.test(v.lang) && /elsa|alice|carla/i.test(v.name)) ||
    voices.find(v => /it[-_]IT/i.test(v.lang)) ||
    voices.find(v => /^it/i.test(v.lang)) ||
    null;
}

if (typeof speechSynthesis !== "undefined") {
  loadVoice();
  speechSynthesis.onvoiceschanged = loadVoice;
}

/**
 * Registra un callback che riceve true (bocca aperta) / false (bocca chiusa).
 * @param {(speaking: boolean) => void} fn
 */
export function setAvatarCallback(fn) {
  avatarCallback = fn;
}

/**
 * Legge `text` ad alta voce in italiano.
 * @param {string} text
 */
export function speakText(text) {
  if (typeof speechSynthesis === "undefined") return;
  speechSynthesis.cancel(); // interrompe eventuale lettura in corso

  if (!voiceEnabled) return;

  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "it-IT";
  utter.rate = 0.92;
  utter.pitch = 1.05;
  if (voice) utter.voice = voice;

  utter.onstart = () => avatarCallback?.(true);
  utter.onend   = () => avatarCallback?.(false);
  utter.onerror = () => avatarCallback?.(false);

  speechSynthesis.speak(utter);
}

/**
 * Interrompe immediatamente la lettura in corso.
 */
export function stopSpeech() {
  if (typeof speechSynthesis === "undefined") return;
  speechSynthesis.cancel();
  avatarCallback?.(false);
}

/**
 * Restituisce lo stato corrente del toggle voce.
 * @returns {boolean}
 */
export function isVoiceEnabled() {
  return voiceEnabled;
}

/**
 * Attiva / disattiva la voce. Persiste su localStorage.
 * @param {boolean} enabled
 */
export function setVoiceEnabled(enabled) {
  voiceEnabled = enabled;
  localStorage.setItem("voiceEnabled", String(enabled));
  if (!enabled) stopSpeech();
}
