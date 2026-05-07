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
    source: "github-pages",
  });
}

// ─── Nominatim address autocomplete ─────────────────────────────────────────

class AddressAutocomplete {
  constructor(inputId, hiddenId) {
    this.input  = document.getElementById(inputId);
    this.hidden = document.getElementById(hiddenId);
    this.timer  = null;
    this.lastQuery = "";

    if (!this.input || !this.hidden) return; // elemento non ancora nel DOM

    const wrap = this.input.closest(".ac-wrap");
    if (!wrap) return;
    this.dropdown = document.createElement("ul");
    this.dropdown.className = "ac-dropdown";
    this.dropdown.setAttribute("role", "listbox");
    this.dropdown.hidden = true;
    wrap.appendChild(this.dropdown);

    this.input.addEventListener("input",   () => this._onInput());
    this.input.addEventListener("keydown", (e) => this._onKey(e));
    document.addEventListener("click", (e) => {
      if (!wrap.contains(e.target)) this._close();
    });
  }

  _onInput() {
    const q = this.input.value.trim();
    this.hidden.value = "";
    clearTimeout(this.timer);
    if (q.length < 3 || q === this.lastQuery) { this._close(); return; }
    this.timer = setTimeout(() => this._fetch(q), 380);
  }

  async _fetch(q) {
    this.lastQuery = q;
    try {
      const url =
        "https://nominatim.openstreetmap.org/search?format=json&limit=6&accept-language=it&q=" +
        encodeURIComponent(q);
      const res = await fetch(url, { headers: { "Accept-Language": "it" } });
      if (!res.ok) return;
      const data = await res.json();
      this._render(data);
    } catch { /* network error — silent */ }
  }

  _render(results) {
    this.dropdown.innerHTML = "";
    if (!results.length) { this._close(); return; }
    results.forEach((r) => {
      const li = document.createElement("li");
      li.textContent = r.display_name;
      li.setAttribute("role", "option");
      li.addEventListener("mousedown", (e) => { e.preventDefault(); this._pick(r); });
      this.dropdown.appendChild(li);
    });
    this.dropdown.hidden = false;
  }

  _pick(r) {
    this.input.value  = r.display_name;
    this.lastQuery    = r.display_name;
    this.hidden.value = JSON.stringify({ display: r.display_name, lat: r.lat, lon: r.lon });
    this._close();
  }

  _close() {
    this.dropdown.innerHTML = "";
    this.dropdown.hidden = true;
  }

  _focused() { return this.dropdown.querySelector("li.focused"); }

  _onKey(e) {
    const items = [...this.dropdown.querySelectorAll("li")];
    if (!items.length) return;
    const idx = items.indexOf(this._focused());
    if (e.key === "ArrowDown") {
      e.preventDefault();
      items.forEach((i) => i.classList.remove("focused"));
      items[(idx + 1) % items.length].classList.add("focused");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      items.forEach((i) => i.classList.remove("focused"));
      items[(idx - 1 + items.length) % items.length].classList.add("focused");
    } else if (e.key === "Enter") {
      const f = this._focused();
      if (f) { e.preventDefault(); f.dispatchEvent(new MouseEvent("mousedown")); }
    } else if (e.key === "Escape") {
      this._close();
    }
  }

  isValid()  { return !!this.hidden.value; }
  getValue() { return this.hidden.value ? JSON.parse(this.hidden.value) : null; }
}

// ─── Autocomplete instances (lazy: create when step 2 first opens) ──────────

let acBirth = null;
let acGrew  = null;
let acStudy = null;

function initAutocomplete() {
  if (acBirth) return; // already initialised
  acBirth = new AddressAutocomplete("birthPlace",  "birthPlace-val");
  acGrew  = new AddressAutocomplete("grewUpPlace", "grewUpPlace-val");
  acStudy = new AddressAutocomplete("studyPlace",  "studyPlace-val");
}

// ─── Step navigation ─────────────────────────────────────────────────────────

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
  if (n === 2) initAutocomplete();
  currentStep = n;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ─── Conditional fields ──────────────────────────────────────────────────────

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

// ─── Validation ──────────────────────────────────────────────────────────────

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
  if (!acBirth || !acBirth.isValid()) return "Seleziona il luogo di nascita dalla lista.";
  if (!acGrew  || !acGrew.isValid())  return "Seleziona il luogo dove sei cresciuto/a dalla lista.";
  if (isStudent()) {
    if (!acStudy || !acStudy.isValid()) return "Seleziona il luogo dove studi dalla lista.";
    if (!val("studyField")) return "Inserisci il corso di studi.";
    if (!val("studyYear"))  return "Seleziona l\u2019anno di studi.";
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

// ─── Button listeners ────────────────────────────────────────────────────────

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

// ─── Submit ──────────────────────────────────────────────────────────────────

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
    birthPlace:        acBirth ? acBirth.getValue() : null,
    grewUpPlace:       acGrew  ? acGrew.getValue()  : null,
    hadTherapy:        therapy === "si",
    therapyDuration:   therapy === "si" ? val("therapyDuration") : null,
    sexualOrientation: val("sexualOrientation"),
    consent:           true,
    source:            "github-pages",
  };

  if (isStudent()) {
    payload.studyPlace = acStudy ? acStudy.getValue() : null;
    payload.studyField = val("studyField");
    payload.studyYear  = val("studyYear");
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
    console.error(error);
    setStatus("Errore durante il salvataggio. Riprova tra poco.", "error");
    submitBtn.disabled = false;
  }
});
