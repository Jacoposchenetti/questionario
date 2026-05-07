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
let maxReached = 0; // indice massimo raggiunto — non si ripete il timer se torniamo indietro

const progressBar  = document.getElementById("progress-bar");
const progressLabel = document.getElementById("progress-label");
const questionNum  = document.getElementById("question-num");
const questionText = document.getElementById("question-text");
const radios       = document.querySelectorAll("input[name=\u0027answer\u0027]");
const nextBtn      = document.getElementById("btn-next");
const backBtn      = document.getElementById("btn-back");
const timerEl      = document.getElementById("timer");
const errEl        = document.getElementById("err");

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

async function submitAll() {
  clearInterval(timerInterval);
  nextBtn.disabled = true;
  nextBtn.textContent = "Salvataggio...";

  // Carica i dati demografici salvati in sessionStorage
  const demographics = JSON.parse(sessionStorage.getItem("demographicsData") ?? "{}");

  // Costruisce il documento Firestore unificato
  const fields = {};

  // Dati demografici
  for (const [k, v] of Object.entries(demographics)) {
    fields[k] = toFSVal(v);
  }

  // Risposte IGRS (prefisso igrs_)
  answers.forEach((ans, i) => {
    fields["igrs_q" + (i + 1)] = { integerValue: String(ans) };
  });

  fields.createdAt = { timestampValue: new Date().toISOString() };

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
    document.querySelector(".page").innerHTML = `
      <div class="card" style="text-align:center;padding:56px 32px;animation:fadeUp 600ms ease-out both">
        <p style="font-size:2.8rem;margin:0">&#x2713;</p>
        <h2 style="margin:14px 0 8px">Grazie per la partecipazione!</h2>
        <p style="color:var(--ink-soft)">Le tue risposte sono state salvate correttamente.</p>
      </div>`;
  } catch(e) {
    errEl.textContent = "Errore durante il salvataggio: " + e.message;
    nextBtn.disabled = false;
    nextBtn.textContent = "Invia risposte";
  }
}

renderQuestion(0);