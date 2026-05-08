// Dati ECR-R: salva in sessionStorage + Firestore parziale.
import { patchDoc } from "./fs.js";

const QUESTIONS = [
  "Preferisco non mostrare al partner come mi sento dentro.",
  "Ho paura di perdere l\u2019amore del mio partner.",
  "Mi sento a mio agio nel condividere con il partner i miei pensieri e sentimenti pi\u00f9 personali.",
  "Spesso temo che il mio partner non voglia pi\u00f9 stare con me.",
  "Trovo difficile concedermi di fare affidamento sul partner.",
  "Spesso ho paura che il mio partner non mi ami veramente.",
  "Mi sento molto a mio agio quando mi trovo in intimit\u00e0 con il partner.",
  "Temo che il partner non tenga a me quanto io tengo a lui/lei.",
  "Non mi sento a mio agio ad aprirmi con il partner.",
  "Spesso desidero che i sentimenti del mio partner verso di me siano forti quanto i miei verso di lui/lei.",
  "Preferisco non avere eccessiva intimit\u00e0 con il partner.",
  "Mi preoccupo molto per le mie relazioni sentimentali.",
  "Mi sento a disagio quando il partner vuole essermi molto vicino/a.",
  "Quando il mio partner non \u00e8 con me, temo che possa interessarsi a qualcun altro.",
  "Trovo abbastanza facile entrare in intimit\u00e0 con il mio partner.",
  "Quando manifesto i miei sentimenti al partner, temo che lui/lei non senta le stesse cose per me.",
  "Non \u00e8 difficile per me entrare in intimit\u00e0 con il mio partner.",
  "Raramente mi preoccupo del fatto che il mio partner possa lasciarmi.",
  "Di solito parlo con il mio partner dei miei problemi e delle mie preoccupazioni.",
  "Il mio partner mi fa dubitare di me stesso/a.",
  "Mi \u00e8 d\u2019aiuto rivolgermi al mio partner nei momenti di bisogno.",
  "Non mi preoccupo spesso di essere abbandonato/a.",
  "Al mio partner dico quasi tutto.",
  "Trovo che il mio partner non voglia essere intimo con me quanto io vorrei.",
  "Dialogo e mi consulto sulle cose con il mio partner.",
  "Capita a volte che i sentimenti del partner nei miei confronti cambino senza una ragione apparente.",
  "M\u2019innervosisco quando il partner si avvicina troppo a me.",
  "A volte il mio desiderio di stabilire un rapporto molto stretto fa allontanare le persone.",
  "Mi sento a mio agio a fare affidamento sul partner.",
  "Temo che non piacerei al partner, se mi conoscesse per come sono veramente.",
  "Per me \u00e8 facile fare affidamento sul partner.",
  "\u201cDivento matto/a\u201d se non ricevo dal mio partner l\u2019affetto e il sostegno di cui ho bisogno.",
  "Per me \u00e8 facile essere affettuoso/a con il mio partner.",
  "Temo di non essere all\u2019altezza delle altre persone.",
  "Il mio partner capisce veramente me e i miei bisogni.",
  "Il mio partner sembra accorgersi di me solo quando sono arrabbiato/a.",
];

const TIMER_SECONDS = 0; // ← rimetti 6 dopo il test
let currentQ = 0;
const answers = new Array(QUESTIONS.length).fill(null);
let timerInterval = null;
let timerDone = false;
let maxReached = -1; // -1 = nessuna domanda ancora vista

const progressBar     = document.getElementById("progress-bar");
const progressLabel   = document.getElementById("progress-label");
const questionNum     = document.getElementById("question-num");
const questionText    = document.getElementById("question-text");
const radios          = document.querySelectorAll("input[name='answer']");
const nextBtn         = document.getElementById("btn-next");
const backBtn         = document.getElementById("btn-back");
const timerEl         = document.getElementById("timer");
const errEl           = document.getElementById("err");
const questionSection = document.getElementById("question-section");
const relationSection = document.getElementById("relation-section");
const relazioneDetails = document.getElementById("relazione-details");
const errRelEl        = document.getElementById("err-rel");

function renderQuestion(n) {
  const pct = Math.round((n / QUESTIONS.length) * 100);
  progressBar.style.width = pct + "%";
  progressBar.setAttribute("aria-valuenow", pct);
  progressLabel.textContent = "Domanda " + (n + 1) + " di " + QUESTIONS.length;
  questionNum.textContent = n + 1;
  questionText.textContent = QUESTIONS[n];
  radios.forEach(r => { r.checked = answers[n] !== null && Number(r.value) === answers[n]; });
  errEl.textContent = "";
  backBtn.hidden = (n === 0);
  if (n <= maxReached) {
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
  if (TIMER_SECONDS <= 0) { skipTimer(); return; }
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
    showRelationPanel();
  }
});

// --- Pannello relazione ---

function showRelationPanel() {
  clearInterval(timerInterval);
  questionSection.hidden = true;
  relationSection.hidden = false;
  progressBar.style.width = "100%";
  progressBar.setAttribute("aria-valuenow", "100");
  progressLabel.textContent = "Ultima sezione";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll("input[name='relazione']").forEach(r => {
  r.addEventListener("change", () => {
    relazioneDetails.hidden = (r.value !== "si");
    errRelEl.textContent = "";
  });
});

document.getElementById("btn-back-rel").addEventListener("click", () => {
  relationSection.hidden = true;
  questionSection.hidden = false;
  currentQ = QUESTIONS.length - 1;
  renderQuestion(currentQ);
});

document.getElementById("btn-submit").addEventListener("click", () => {
  const relazioneVal = document.querySelector("input[name='relazione']:checked")?.value;
  if (!relazioneVal) { errRelEl.textContent = "Indica se hai una relazione stabile."; return; }
  if (relazioneVal === "si") {
    const durata = document.getElementById("relazione-durata").value.trim();
    if (!durata) { errRelEl.textContent = "Indica da quanto tempo dura la relazione."; return; }
    const convivenza = document.querySelector("input[name='convivenza']:checked")?.value;
    if (!convivenza) { errRelEl.textContent = "Indica se convivi con il partner."; return; }
  }
  submitAll();
});

// --- Salvataggio in sessionStorage e redirect a PBS ---

async function submitAll() {
  const submitBtn = document.getElementById("btn-submit");
  submitBtn.disabled = true;
  submitBtn.textContent = "Caricamento...";

  const ecrData = {};

  // Risposte ECR-R
  answers.forEach((ans, i) => { ecrData["ecr_q" + (i + 1)] = ans; });

  // Dati relazione
  const relazioneVal = document.querySelector("input[name='relazione']:checked").value;
  ecrData["ecr_relazione"] = relazioneVal;
  if (relazioneVal === "si") {
    ecrData["ecr_relazione_durata"] = document.getElementById("relazione-durata").value.trim();
    ecrData["ecr_convivenza"] = document.querySelector("input[name='convivenza']:checked")?.value ?? null;
  }

  sessionStorage.setItem("ecrData", JSON.stringify(ecrData));
  try { await patchDoc({ ...ecrData, status: "ecr" }); }
  catch (ex) { console.warn("Firestore patch failed, continuing:", ex.message); }
  window.location.href = "pbs.html";
}

renderQuestion(0);
