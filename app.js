// Dati demografici salvati in sessionStorage; il salvataggio su Firestore avviene alla fine di tutti i questionari.

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

document.getElementById("main-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const err = validateStep3();
  if (err) { showErr("err-3", err); return; }
  clearErr("err-3");

  const submitBtn = document.getElementById("submit-btn");
  submitBtn.disabled = true;

  const therapy = document.querySelector("[name='hadTherapy']:checked").value;

  const payload = {
    nome:              val("nome"),
    cognome:           val("cognome"),
    email:             val("email"),
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

  sessionStorage.setItem("demographicsData", JSON.stringify(payload));
  window.location.href = "igrs.html";
});