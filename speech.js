/**
 * speech.js — TTS italiano: ElevenLabs (se KEY impostata) oppure Web Speech API.
 */

// ─── ElevenLabs ─────────────────────────────────────────────────────────────
// Incolla qui la tua API key ElevenLabs. Se vuota, si usa Web Speech API.
const ELEVENLABS_KEY = "sk_c1a219c4c38cc34877378b2973c5e3ec24c779293fc72830";
// Voci per genere: maschio e femmina/altro
const ELEVENLABS_VOICE_MALE   = "fzDFBB4mgvMlL36gPXcz";
const ELEVENLABS_VOICE_FEMALE  = "3DPhHWXDY263XJ1d2EPN";

// Legge il genere da sessionStorage per scegliere voce e avatar
function getGender() {
  try { return JSON.parse(sessionStorage.getItem("demographicsData") || "{}").gender || ""; }
  catch { return ""; }
}
function getVoiceId() {
  return getGender().toLowerCase() === "maschio" ? ELEVENLABS_VOICE_MALE : ELEVENLABS_VOICE_FEMALE;
}

// Avatar URL in base al genere (DiceBear Personas)
export function getAvatarUrl() {
  return getGender().toLowerCase() === "maschio"
    ? "https://api.dicebear.com/9.x/personas/svg?seed=marco&size=128"
    : "https://api.dicebear.com/9.x/personas/svg?seed=giulia&size=128";
}

// ─── Stato condiviso ─────────────────────────────────────────────────────────
let avatarCallback = null;
let voiceEnabled = localStorage.getItem("voiceEnabled") !== "false";
let currentAudio = null; // per ElevenLabs

// ─── Web Speech API ──────────────────────────────────────────────────────────
let wsVoice = null;

function loadWSVoice() {
  const voices = speechSynthesis.getVoices();
  wsVoice =
    voices.find(v => /it[-_]IT/i.test(v.lang) && /elsa|alice|carla|google/i.test(v.name)) ||
    voices.find(v => /it[-_]IT/i.test(v.lang)) ||
    voices.find(v => /^it/i.test(v.lang)) ||
    null;
}

if (typeof speechSynthesis !== "undefined") {
  loadWSVoice();
  speechSynthesis.addEventListener("voiceschanged", loadWSVoice);
}

// Workaround bug Chrome: speechSynthesis si blocca su testi lunghi (>~15s).
// Metodo: pause+resume ogni 10s mentre sta parlando.
let wsKeepAliveInterval = null;
function wsStartKeepAlive() {
  wsStopKeepAlive();
  wsKeepAliveInterval = setInterval(() => {
    if (speechSynthesis.speaking) {
      speechSynthesis.pause();
      speechSynthesis.resume();
    } else {
      wsStopKeepAlive();
    }
  }, 10000);
}
function wsStopKeepAlive() {
  clearInterval(wsKeepAliveInterval);
  wsKeepAliveInterval = null;
}

function speakWithWS(text) {
  speechSynthesis.cancel();
  wsStopKeepAlive();
  // Piccolo delay dopo cancel per evitare race condition in Chrome
  setTimeout(() => {
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "it-IT";
    utter.rate = 0.9;
    utter.pitch = 1.0;
    if (wsVoice) utter.voice = wsVoice;
    utter.onstart  = () => { avatarCallback?.(true); wsStartKeepAlive(); };
    utter.onend    = () => { avatarCallback?.(false); wsStopKeepAlive(); };
    utter.onerror  = () => { avatarCallback?.(false); wsStopKeepAlive(); };
    speechSynthesis.speak(utter);
  }, 80);
}

// ─── ElevenLabs API ──────────────────────────────────────────────────────────
async function speakWithElevenLabs(text) {
  if (currentAudio) { currentAudio.pause(); currentAudio = null; }
  avatarCallback?.(true);
  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${getVoiceId()}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_turbo_v2_5",
          voice_settings: { stability: 0.48, similarity_boost: 0.78, style: 0.2, use_speaker_boost: true },
        }),
      }
    );
    if (!res.ok) throw new Error("ElevenLabs HTTP " + res.status);
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    currentAudio = new Audio(url);
    currentAudio.onended = () => { avatarCallback?.(false); currentAudio = null; };
    currentAudio.onerror = () => { avatarCallback?.(false); currentAudio = null; };
    await currentAudio.play();
  } catch (e) {
    console.warn("ElevenLabs error:", e.message);
    avatarCallback?.(false);
    // Fallback a Web Speech API se ElevenLabs fallisce
    speakWithWS(text);
  }
}

// ─── API pubblica ────────────────────────────────────────────────────────────
export function setAvatarCallback(fn) { avatarCallback = fn; }

export function speakText(text) {
  if (!voiceEnabled) return;
  if (ELEVENLABS_KEY) {
    speakWithElevenLabs(text);
  } else {
    if (typeof speechSynthesis === "undefined") return;
    speakWithWS(text);
  }
}

export function stopSpeech() {
  if (currentAudio) { currentAudio.pause(); currentAudio = null; }
  if (typeof speechSynthesis !== "undefined") { speechSynthesis.cancel(); wsStopKeepAlive(); }
  avatarCallback?.(false);
}

export function isVoiceEnabled() { return voiceEnabled; }

export function setVoiceEnabled(enabled) {
  voiceEnabled = enabled;
  localStorage.setItem("voiceEnabled", String(enabled));
  if (!enabled) stopSpeech();
}
