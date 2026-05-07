// Salva su Firestore via REST API — unico salvataggio finale con tutti i dati
const FIREBASE_API_KEY = "AIzaSyACw47qEsgsMCC2tUlbPEu81f-1ENRB0-U";
const FINAL_URL = "https://firestore.googleapis.com/v1/projects/questionario-9b487/databases/(default)/documents/responses?key=" + FIREBASE_API_KEY;

function toFSVal(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") return { integerValue: String(v) };
  return { stringValue: String(v) };
}

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

const TIMER_SECONDS = 6;
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

// --- Salvataggio finale ---

async function submitAll() {
  const submitBtn = document.getElementById("btn-submit");
  submitBtn.disabled = true;
  submitBtn.textContent = "Salvataggio...";

  const demographics = JSON.parse(sessionStorage.getItem("demographicsData") ?? "{}");
  const igrsData     = JSON.parse(sessionStorage.getItem("igrsData") ?? "{}");

  const fields = {};

  // Dati demografici
  for (const [k, v] of Object.entries(demographics)) fields[k] = toFSVal(v);

  // Risposte IGRS
  for (const [k, v] of Object.entries(igrsData)) fields[k] = toFSVal(v);

  // Risposte ECR-R
  answers.forEach((ans, i) => { fields["ecr_q" + (i + 1)] = toFSVal(ans); });

  // Dati relazione
  const relazioneVal = document.querySelector("input[name='relazione']:checked").value;
  fields["ecr_relazione"] = toFSVal(relazioneVal);
  if (relazioneVal === "si") {
    fields["ecr_relazione_durata"] = toFSVal(document.getElementById("relazione-durata").value.trim());
    const conv = document.querySelector("input[name='convivenza']:checked")?.value ?? null;
    fields["ecr_convivenza"] = toFSVal(conv);
  }

  fields["createdAt"] = { timestampValue: new Date().toISOString() };

  try {
    const res = await fetch(FINAL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message ?? "HTTP " + res.status);
    }
    sessionStorage.removeItem("demographicsData");
    sessionStorage.removeItem("igrsData");
    document.querySelector(".page").innerHTML = `
      <div class="card" style="text-align:center;padding:56px 32px;animation:fadeUp 600ms ease-out both">
        <p style="font-size:2.8rem;margin:0">&#x2713;</p>
        <h2 style="margin:14px 0 8px">Grazie per la partecipazione!</h2>
        <p style="color:var(--ink-soft)">Le tue risposte sono state salvate correttamente.</p>
      </div>`;
  } catch(e) {
    errRelEl.textContent = "Errore durante il salvataggio: " + e.message;
    submitBtn.disabled = false;
    submitBtn.textContent = "Avanti \u2192";
  }
}

renderQuestion(0);
