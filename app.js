// ─── Diagnostica Firebase (auto-run al caricamento) ──────────────────────────
(async () => {
  const log = (msg, ok = true) => console.log(`%c[FB-TEST] ${msg}`, `color:${ok ? "green" : "red"};font-weight:bold`);
  try {
    log("1. Carico firebase-app...");
    const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js");
    log("2. Carico firebase-firestore...");
    const { getFirestore, collection, addDoc, serverTimestamp } =
      await import("https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js");
    log("3. Carico firebase-config...");
    const { firebaseConfig } = await import("./firebase-config.js");
    log("4. InitializeApp...");
    const app = initializeApp(firebaseConfig, "diagnostic-instance");
    log("5. GetFirestore...");
    const db = getFirestore(app);
    log("6. Scrivo documento di test su Firestore...");
    const ref = await addDoc(collection(db, "diagnostics"), {
      test: true,
      createdAt: serverTimestamp(),
    });
    log(`7. SUCCESSO! Documento scritto: ${ref.id}`);
  } catch (e) {
    console.error("[FB-TEST] FALLITO:", e.code ?? "", e.message);
  }
})();

// Firebase è caricato dinamicamente solo al momento dell'invio
// così i bottoni di navigazione funzionano sempre, anche se il CDN è lento.

let _db = null;

async function getDb() {
  if (_db) return _db;
  const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js");
  const { getFirestore }  = await import("https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js");
  const { firebaseConfig } = await import("./firebase-config.js");
  const app = initializeApp(firebaseConfig);
  _db = getFirestore(app);
  return _db;
}

async function saveDoc(payload) {
  const { addDoc, collection, serverTimestamp } =
    await import("https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js");
  const db = await getDb();
  await addDoc(collection(db, "demographics"), {
    ...payload,
    createdAt: serverTimestamp(),
  });
}

// --- Step navigation ---------------------------------------------------------

const TOTAL_STEPS   = 3;
const panels        = document.querySelectorAll(".step-panel");
const progressBar   = document.getElementById("progress-bar");
const progressLabel = document.getElementById("progress-label");
let   currentStep   = 1;

function showStep(n) {
  panels.forEach((p) => {
    const isTarget = Number(p.dataset.panel) === n;
    p.hidden = !isTarget;
    p.classList.toggle("active", isTarget);
  });
  const pct = Math.round((n / TOTAL_STEPS) * 100);
  progressBar.style.width = pct + "%";
  progressBar.setAttribute("aria-valuenow", pct);
  progressLabel.textContent = "Sezione " + n + " di " + TOTAL_STEPS;
  currentStep = n;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// --- Conditional fields ------------------------------------------------------

const occupationSel       = document.getElementById("occupation");
const studentFields       = document.getElementById("student-fields");
const therapyDurationWrap = document.getElementById("therapy-duration-wrap");

function isStudent() {
  return ["studente", "studente-lavoratore"].includes(occupationSel.value);
}

occupationSel.addEventListener("change", () => {
  studentFields.hidden = !isStudent();
});

document.querySelectorAll("[name='hadTherapy']").forEach((r) => {
  r.addEventListener("change", () => {
    therapyDurationWrap.hidden = !(r.value === "si" && r.checked);
  });
});

// --- Validation --------------------------------------------------------------

function val(id) { return (document.getElementById(id)?.value ?? "").trim(); }

function showErr(id, msg) { document.getElementById(id).textContent = msg; }
function clearErr(id)     { document.getElementById(id).textContent = ""; }

function validateStep1() {
  if (!val("nome"))       return "Inserisci il nome.";
  if (!val("cognome"))    return "Inserisci il cognome.";
  const age = Number(val("age"));
  if (!age || age < 18 || age > 99) return "Inserisci un\u2019et\u00e0 valida (18\u201399).";
  if (!val("gender"))     return "Seleziona il genere.";
  if (!val("education"))  return "Seleziona il titolo di studio.";
  if (!val("occupation")) return "Seleziona l\u2019occupazione.";
  if (!document.getElementById("consent").checked)
    return "Devi fornire il consenso per procedere.";
  return null;
}

function validateStep2() {
  if (!val("birthPlace"))      return "Inserisci il luogo di nascita.";
  if (!val("grewUpPlace"))     return "Inserisci il luogo dove sei cresciuto/a.";
  if (!val("motherEducation")) return "Seleziona il titolo di studio della madre.";
  if (!val("fatherEducation")) return "Seleziona il titolo di studio del padre.";
  if (isStudent()) {
    if (!val("studyPlace")) return "Inserisci il luogo dove studi.";
    if (!val("studyField")) return "Inserisci il corso di studi.";
  }
  return null;
}

function validateStep3() {
  const therapy = document.querySelector("[name='hadTherapy']:checked");
  if (!therapy) return "Indica se hai mai fatto terapia psicologica.";
  if (therapy.value === "si" && !val("therapyDuration"))
    return "Seleziona la durata della terapia.";
  if (!val("sexualOrientation")) return "Seleziona l\u2019orientamento sessuale.";
  return null;
}

// --- Button listeners --------------------------------------------------------

document.getElementById("btn-next-1").addEventListener("click", () => {
  const err = validateStep1();
  if (err) { showErr("err-1", err); return; }
  clearErr("err-1");
  showStep(2);
});

document.getElementById("btn-back-2").addEventListener("click", () => showStep(1));

document.getElementById("btn-next-2").addEventListener("click", () => {
  const err = validateStep2();
  if (err) { showErr("err-2", err); return; }
  clearErr("err-2");
  showStep(3);
});

document.getElementById("btn-back-3").addEventListener("click", () => showStep(2));

// --- Submit ------------------------------------------------------------------

function setStatus(msg, type = "") {
  const el = document.getElementById("status");
  el.textContent = msg;
  el.className = ("status " + type).trim();
}

document.getElementById("main-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const err = validateStep3();
  if (err) { showErr("err-3", err); return; }
  clearErr("err-3");

  const submitBtn = document.getElementById("submit-btn");
  submitBtn.disabled = true;
  setStatus("Salvataggio in corso\u2026");

  const therapy = document.querySelector("[name='hadTherapy']:checked").value;

  const payload = {
    nome:              val("nome"),
    cognome:           val("cognome"),
    age:               Number(val("age")),
    gender:            val("gender"),
    education:         val("education"),
    occupation:        val("occupation"),
    birthPlace:        val("birthPlace"),
    grewUpPlace:       val("grewUpPlace"),
    motherEducation:   val("motherEducation"),
    fatherEducation:   val("fatherEducation"),
    hadTherapy:        therapy === "si",
    therapyDuration:   therapy === "si" ? val("therapyDuration") : null,
    sexualOrientation: val("sexualOrientation"),
    consent:           true,
    source:            "github-pages",
  };

  if (isStudent()) {
    payload.studyPlace = val("studyPlace");
    payload.studyField = val("studyField");
  }

  try {
    await saveDoc(payload);
    document.querySelector(".page").innerHTML = `
      <div class="card" style="text-align:center;padding:56px 32px;animation:fadeUp 600ms ease-out both">
        <p style="font-size:2.8rem;margin:0">&#x2713;</p>
        <h2 style="margin:14px 0 8px">Grazie per la partecipazione!</h2>
        <p style="color:var(--ink-soft)">I tuoi dati sono stati salvati correttamente.</p>
      </div>`;
  } catch (error) {
    console.error("Firestore error:", error);
    const code = error?.code ?? "";
    let msg = "Errore durante il salvataggio.";
    if (code === "permission-denied") msg = "Firestore: permessi negati. Controlla le regole del database.";
    else if (code) msg = "Errore Firebase: " + code;
    else if (error.message) msg = error.message;
    setStatus(msg, "error");
    submitBtn.disabled = false;
  }
});