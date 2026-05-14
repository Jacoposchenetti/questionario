// Dati demografici salvati in sessionStorage; il salvataggio su Firestore avviene alla fine di tutti i questionari.

// ── Resume session check ──────────────────────────────────────────────────
(function checkResume() {
  const sess = JSON.parse(localStorage.getItem('questionario_session') || 'null');
  if (!sess?.docId || sess.status === 'completed') return;
  const banner = document.getElementById('resume-banner');
  if (!banner) return;
  // Hide form panels + progress UI, show banner
  document.querySelectorAll('.step-panel').forEach(p => { p.hidden = true; });
  const stepper = document.querySelector('.stepper');
  const progressWrap = document.querySelector('.progress-wrap');
  const progressLbl = document.getElementById('progress-label');
  if (stepper) stepper.style.display = 'none';
  if (progressWrap) progressWrap.style.display = 'none';
  if (progressLbl) progressLbl.style.display = 'none';
  banner.hidden = false;

  document.getElementById('btn-resume').addEventListener('click', () => {
    sessionStorage.setItem('firestoreDocId', sess.docId);
    window.location.href = sess.lastPage;
  });
  document.getElementById('btn-restart').addEventListener('click', () => {
    localStorage.removeItem('questionario_session');
    banner.hidden = true;
    document.querySelectorAll('.step-panel').forEach((p, i) => { p.hidden = i !== 0; });
    if (stepper) stepper.style.display = '';
    if (progressWrap) progressWrap.style.display = '';
    if (progressLbl) progressLbl.style.display = '';
  });
})();

// --- Step navigation ---------------------------------------------------------

const TOTAL_STEPS   = 4;
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
  if (!val("email"))      return "Inserisci l'email.";
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
  if (!val("birthPlace"))      return "Seleziona la regione di nascita.";
  if (!val("grewUpPlace"))     return "Seleziona la regione dove sei cresciuto/a.";
  if (!val("motherEducation")) return "Seleziona il titolo di studio della madre.";
  if (!val("fatherEducation")) return "Seleziona il titolo di studio del padre.";
  if (!val("studyPlace"))      return "Seleziona la regione in cui vivi.";
  if (isStudent()) {
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

document.getElementById("btn-next-3").addEventListener("click", () => {
  const err = validateStep3();
  if (err) { showErr("err-3", err); return; }
  clearErr("err-3");
  showStep(4);
});

document.getElementById("btn-back-4").addEventListener("click", () => showStep(3));

// --- Firestore partial save --------------------------------------------------

import { createDoc } from "./fs.js";

// --- Validation step 4 -------------------------------------------------------

function validateStep4() {
  const fields = [
    "ethnicity", "socioeconomicStatus", "physicalDisease",
    "psychotropicDisorders", "substanceAbuse", "childhoodAbuse",
    "childhoodNeglect", "familyProblems", "caregivingRole",
    "familySeparationDistress", "familyCaregivingDifficulty",
  ];
  for (const name of fields) {
    if (!document.querySelector(`[name='${name}']:checked`))
      return "Rispondi a tutte le domande prima di continuare.";
  }
  return null;
}

// --- Submit ------------------------------------------------------------------

document.getElementById("main-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const err = validateStep4();
  if (err) { showErr("err-4", err); return; }
  clearErr("err-4");

  const submitBtn = document.getElementById("submit-btn");
  submitBtn.disabled = true;
  submitBtn.textContent = "Salvataggio...";

  const therapy = document.querySelector("[name='hadTherapy']:checked").value;
  const checkedVal = (name) => document.querySelector(`[name='${name}']:checked`)?.value ?? null;

  const payload = {
    nome:                       val("nome"),
    cognome:                    val("cognome"),
    email:                      val("email"),
    age:                        Number(val("age")),
    gender:                     val("gender"),
    education:                  val("education"),
    occupation:                 val("occupation"),
    birthPlace:                 val("birthPlace"),
    grewUpPlace:                val("grewUpPlace"),
    studyPlace:                 val("studyPlace"),
    motherEducation:            val("motherEducation"),
    fatherEducation:            val("fatherEducation"),
    hadTherapy:                 therapy === "si",
    therapyDuration:            therapy === "si" ? val("therapyDuration") : null,
    sexualOrientation:          val("sexualOrientation"),
    ethnicity:                  checkedVal("ethnicity"),
    socioeconomicStatus:        checkedVal("socioeconomicStatus"),
    physicalDisease:            checkedVal("physicalDisease") === "si",
    psychotropicDisorders:      checkedVal("psychotropicDisorders") === "si",
    substanceAbuse:             checkedVal("substanceAbuse") === "si",
    childhoodAbuse:             checkedVal("childhoodAbuse") === "si",
    childhoodNeglect:           checkedVal("childhoodNeglect") === "si",
    familyProblems:             checkedVal("familyProblems") === "si",
    caregivingRole:             checkedVal("caregivingRole") === "si",
    familySeparationDistress:   checkedVal("familySeparationDistress") === "si",
    familyCaregivingDifficulty: checkedVal("familyCaregivingDifficulty") === "si",
    consent:                    true,
    source:                     "github-pages",
    createdAt:                  new Date().toISOString(),
    status:                     "demographics",
  };

  if (isStudent()) {
    payload.studyField = val("studyField");
  }

  try { await createDoc(payload); }
  catch (ex) { console.warn("Firestore create failed, continuing:", ex.message); }

  // Salva sessione in localStorage per permettere il ripristino in caso di uscita
  const _docId = sessionStorage.getItem('firestoreDocId');
  if (_docId) {
    localStorage.setItem('questionario_session', JSON.stringify({
      docId: _docId,
      status: 'domande-aperte',
      lastPage: 'domande-aperte.html',
      timestamp: new Date().toISOString()
    }));
  }

  sessionStorage.setItem("demographicsData", JSON.stringify(payload));
  window.location.href = "domande-aperte.html";
});