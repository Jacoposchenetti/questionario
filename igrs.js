// Dati IGRS salvati in sessionStorage; il salvataggio su Firestore avviene alla fine dell'ECR-R.
import { speakText, stopSpeech, setAvatarCallback, isVoiceEnabled, setVoiceEnabled, getAvatarUrl } from './speech.js';

const QUESTIONS = [
  "Credo che se gli altri mi conoscessero realmente non vorrebbero avere nulla a che fare con me",
  "Sono in difficolt\u00e0 quando sento che sto meglio degli altri",
  "Credo che se fossi spontaneo/a farei sentire le altre persone appesantite",
  "Sento che \u00e8 mio dovere risolvere i problemi degli altri",
  "Sono sempre attento/a a come mi comporto perch\u00e9 ho paura di infastidire le altre persone",
  "Mi sento a disagio a essere migliore degli altri",
  "Penso di essere egoista e insensibile se non mi prendo cura degli altri",
  "Credo che chi mi apprezza lo fa solo perch\u00e9 ho nascosto bene la mia vera natura",
  "Credo che esprimere i miei desideri e/o bisogni faccia sentire gli altri oppressi",
  "L\u2019idea di essere invidiato/a mi mette intensamente a disagio",
  "Sento che dovrei fare visita ai miei genitori ogni volta che me lo chiedono",
  "Mi sento eccessivamente responsabile del benessere degli altri",
  "Sento che dovrei anteporre i desideri della mia famiglia ai miei",
  "Credo di essere un peso per le altre persone",
  "Sento di non meritare di essere felice",
  "Nascondo o minimizzo i miei successi per il timore di far soffrire le persone che hanno meno successo di me",
  "Mi sentirei molto male se fossi sleale con la mia famiglia",
  "Penso che non dovrei separarmi dalle persone che amo perch\u00e9 per loro sarebbe doloroso",
  "Mi sento a disagio quando ricevo un trattamento migliore degli altri",
  "Chiedere aiuto mi fa sentire molto a disagio",
];

const TIMER_SECONDS = 6;
let currentQ = 0;
const answers = new Array(QUESTIONS.length).fill(null);
let timerInterval = null;
let timerDone = false;
let maxReached = -1; // indice massimo raggiunto; -1 = nessuna domanda ancora vista

const progressBar  = document.getElementById("progress-bar");
const progressLabel = document.getElementById("progress-label");
const questionNum  = document.getElementById("question-num");
const questionText = document.getElementById("question-text");
const radios       = document.querySelectorAll("input[name=\u0027answer\u0027]");
const nextBtn      = document.getElementById("btn-next");
const backBtn      = document.getElementById("btn-back");
const timerEl      = document.getElementById("timer");
const errEl        = document.getElementById("err");
const avatarWrap   = document.getElementById("avatar-wrap");
const avatarImg    = document.getElementById("avatar");
const btnReplay    = document.getElementById("btn-replay");
const btnVoice     = document.getElementById("btn-voice-toggle");

// Imposta avatar in base al genere
avatarImg.src = getAvatarUrl();

// Sincronizza icona toggle voce
function syncVoiceBtn() {
  btnVoice.textContent = isVoiceEnabled() ? '\u{1F508}' : '\u{1F507}';
}
syncVoiceBtn();

// Callback animazione bocca avatar
setAvatarCallback(speaking => {
  avatarWrap.classList.toggle("avatar-speaking", speaking);
});

btnReplay.addEventListener("click", () => speakText(QUESTIONS[currentQ]));
btnVoice.addEventListener("click", () => { setVoiceEnabled(!isVoiceEnabled()); syncVoiceBtn(); });

function renderQuestion(n) {
  const pct = Math.round((n / QUESTIONS.length) * 100);
  progressBar.style.width = pct + "%";
  progressBar.setAttribute("aria-valuenow", pct);
  progressLabel.textContent = "Domanda " + (n + 1) + " di " + QUESTIONS.length;
  questionNum.textContent = n + 1;
  questionText.textContent = QUESTIONS[n];
  speakText(QUESTIONS[n]);
  radios.forEach(r => { r.checked = answers[n] !== null && Number(r.value) === answers[n]; });
  errEl.textContent = "";
  backBtn.hidden = (n === 0);
  if (n <= maxReached && answers[n] !== null) {
    // domanda già vista e risposta già data: timer non necessario
    skipTimer();
  } else if (n <= maxReached) {
    // domanda già vista ma senza risposta (es. tornato indietro senza selezionare)
    skipTimer();
  } else {
    maxReached = n;
    startTimer();
  }
}

function skipTimer() {
  clearInterval(timerInterval);
  timerDone = true;
  timerEl.textContent = "";
  nextBtn.disabled = ![...radios].some(r => r.checked);
}

function startTimer() {
  clearInterval(timerInterval);
  timerDone = false;
  nextBtn.disabled = true;
  let remaining = TIMER_SECONDS;
  timerEl.textContent = "Puoi procedere tra " + remaining + "s";
  timerInterval = setInterval(() => {
    remaining--;
    if (remaining <= 0) {
      clearInterval(timerInterval);
      timerDone = true;
      timerEl.textContent = "";
      if ([...radios].some(r => r.checked)) nextBtn.disabled = false;
    } else {
      timerEl.textContent = "Puoi procedere tra " + remaining + "s";
    }
  }, 1000);
}

radios.forEach(r => {
  r.addEventListener("change", () => {
    if (timerDone) nextBtn.disabled = false;
    errEl.textContent = "";
  });
});

backBtn.addEventListener("click", () => {
  // salva la risposta corrente anche tornando indietro
  const selected = [...radios].find(r => r.checked);
  if (selected) answers[currentQ] = Number(selected.value);
  currentQ--;
  renderQuestion(currentQ);
});

nextBtn.addEventListener("click", () => {
  const selected = [...radios].find(r => r.checked);
  if (!selected) { errEl.textContent = "Seleziona una risposta prima di continuare."; return; }
  answers[currentQ] = Number(selected.value);
  if (currentQ < QUESTIONS.length - 1) {
    currentQ++;
    renderQuestion(currentQ);
  } else {
    submitAll();
  }
});

function submitAll() {
  clearInterval(timerInterval);
  const igrsData = {};
  answers.forEach((ans, i) => { igrsData["igrs_q" + (i + 1)] = ans; });
  sessionStorage.setItem("igrsData", JSON.stringify(igrsData));
  window.location.href = "ecr.html";
}

renderQuestion(0);