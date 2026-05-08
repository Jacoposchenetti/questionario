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
  "devo adeguarmi agli altri anziché perseguire le mie idee, bisogni o interessi",
  "di aver fallito nel rendere felici i miei genitori o altri significativi",
  "di essere fisicamente fragile, vulnerabile e malaticcio/a",
  "sia sbagliato, pericoloso o disonesto superare/avere più successo di un membro della propria famiglia o di altri significativi",
  "sia pericoloso sperimentare e/o esprimere sentimenti aggressivi o critici",
  "sia impossibile che qualcuno mi ami",
  "di non riuscire a regolare adeguatamente le mie emozioni e i miei impulsi",
  "gli altri mi feriscano, abusino di me, mi umilino, mi tradiscano o mi manipolino",
  "di non meritare di essere felice",
  "se non mi preoccupo delle cose o mi rilasso verrò punito/a o accadrà qualcosa di terribile",
  "di essere estremamente potente (onnipotente) e di poter controllare quello che gli altri sentono e come si comportano",
  "di dover essere perfetto/a per sentirmi bene con me stesso/a",
  "dovrei essere in grado di affrontare grandi pericoli o cambiamenti difficili senza sentirmi ansioso/a o impaurito/a",
  "amare qualcuno significhi idealizzarlo, ammirarlo e sottomettervi",
  "di meritarmi di essere maltrattato/a e per questo mi coinvolgo in relazioni autodistruttive o abusanti",
  "non dovrei separarmi dalla mia famiglia e dalle altre persone che amo",
  "i bisogni degli altri siano molto più importanti dei miei",
  "non dovrei riconoscere o criticare i problemi e i limiti altrui",
  "preoccupandomi costantemente possa evitare che succedano cose spiacevoli",
  "essere in disaccordo con gli altri produrrà reazioni sprezzanti, rabbiose e rifiutanti nei miei confronti",
  "non dovrei sperimentare o esprimere sentimenti di orgoglio e/o entusiasmo",
  "il mondo sia un posto imprevedibile e pericoloso",
  "per non ferire i miei genitori o altri significativi dovrei emulare o identificarmi con loro",
  "perseguendo i miei interessi e obiettivi sarei egoista e indifferente ai bisogni degli altri",
  "di essere debole, indifeso/a ed emotivamente vulnerabile",
  "gli altri siano superiori e/o più competenti di me",
  "di dover essere ipercoinvolto nel rapporto con i miei genitori e le persone che amo",
  "di essere superiore agli altri, di avere tutti i diritti e di non essere vincolato/a alle normali convenzioni sociali",
  "il mio desiderio di sostegno emotivo e accudimento non verrà accolto dagli altri",
  "capiterà presto una catastrofe e non potrà fare nulla per prevenirla o evitarla",
  "non sono stato/a all'altezza delle aspettative dei miei genitori",
  "merito di essere punito/a duramente",
  "non possa fare affidamento sugli altri per mantenere legami stabili e significativi",
  "separarmi dai miei genitori o da altre persone amate sarebbe doloroso e sleale nei loro confronti e/o li farebbe sentire abbandonati",
  "gli altri si rivelino attenti e affezionati solo quando mi mostro sofferente o infelice",
  "non merito di essere preso/a sul serio",
  "di essere responsabile per i sentimenti e comportamenti altrui",
  "gli altri siano emotivamente inaffidabili e rifiutanti",
  "avere una buona relazione (con un genitore, figlio, fratello/sorella, amico,) farà soffrire un'altra persona (genitore, fratello, etc.)",
  "se non avrò successo mi sentirò indegno/a e senza scopo nella vita",
  "di non essere in grado di svolgere le normali attività quotidiane senza un aiuto considerevole da parte degli altri",
  "i miei sentimenti, bisogni o comportamenti siano opprimenti e/o alienanti per gli altri",
  "non merito di essere accudito/a e di sentirmi protetto/a",
  "non dovrei mai contraddire gli altri e/o far valere il mio punto di vista personale",
  "non merito l'attenzione/affetto/aiuto degli altri e per questo mi sacrifico e mi denigro",
  "di essere difettoso/a e/o danneggiato/a",
  "perseguire i miei obiettivi e sogni sia troppo rischioso perché potrebbe fallire",
  "di non dover chiedere aiuto perché ciò vorrebbe dire che sono debole/bisognoso/a",
  "di dovermi sottomettere al controllo degli altri",
  "se fossi troppo attraente gli altri sarebbero invidiosi e si sentirebbero svalutati e/o danneggiati",
  "avevo la responsabilità di \"salvare\" un genitore e/o un amico e ho fallito",
  "impegnarsi in una relazione significhi rimanere intrappolati per sempre",
  "sia essenziale avere sempre l'approvazione e l'ammirazione degli altri",
  "di essere indegno/a e di meritarmi molto poco nella vita",
  "per avere successo debba controllarmi in modo rigido e programmare tutto",
  "mi merito la trascuratezza e la mancanza di attenzione che ho ricevuto dai miei genitori",
  "di dover minimizzare i miei successi così da evitare di sminuire, offendere o castrare gli altri",
  "sia pericoloso esprimere sentimenti di amore",
  "sentirsi oppressi e affaticati o essere dei martiri sia un marchio di virtù",
];

const TIMER_SECONDS = 0; // ← rimetti 6 dopo il test
let currentQ = 0;
const answers = new Array(QUESTIONS.length).fill(null);
let timerInterval = null;
let timerDone = false;
let maxReached = -1; // -1 = nessuna domanda ancora vista

const progressBar  = document.getElementById("progress-bar");
const progressLabel = document.getElementById("progress-label");
const questionNum  = document.getElementById("question-num");
const questionText = document.getElementById("question-text");
const radios       = document.querySelectorAll("input[name='answer']");
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
    submitAll();
  }
});

// --- Salvataggio finale (tutto) ---

async function submitAll() {
  clearInterval(timerInterval);
  nextBtn.disabled = true;
  nextBtn.textContent = "Salvataggio...";

  const demographics = JSON.parse(sessionStorage.getItem("demographicsData") ?? "{}");
  const igrsData     = JSON.parse(sessionStorage.getItem("igrsData") ?? "{}");
  const ecrData      = JSON.parse(sessionStorage.getItem("ecrData") ?? "{}");

  const fields = {};

  // Dati demografici
  for (const [k, v] of Object.entries(demographics)) fields[k] = toFSVal(v);
  // Risposte IGRS
  for (const [k, v] of Object.entries(igrsData)) fields[k] = toFSVal(v);
  // Risposte ECR-R + dati relazione
  for (const [k, v] of Object.entries(ecrData)) fields[k] = toFSVal(v);
  // Risposte PBS
  answers.forEach((ans, i) => { fields["pbs_q" + (i + 1)] = toFSVal(ans); });

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
    sessionStorage.removeItem("ecrData");
    document.querySelector(".page").innerHTML = `
      <div class="card" style="text-align:center;padding:56px 32px;animation:fadeUp 600ms ease-out both">
        <p style="font-size:2.8rem;margin:0">&#x2713;</p>
        <h2 style="margin:14px 0 8px">Grazie per la partecipazione!</h2>
        <p style="color:var(--ink-soft)">Le tue risposte sono state salvate correttamente.<br>Puoi chiudere questa pagina.</p>
      </div>`;
  } catch(e) {
    errEl.textContent = "Errore durante il salvataggio: " + e.message;
    nextBtn.disabled = false;
    nextBtn.textContent = "Invia risposte";
  }
}

renderQuestion(0);
