import { patchDoc } from "./fs.js";

const MIN_CHARS = 100;

const padreTa  = document.getElementById("rapporto-padre");
const madreTa  = document.getElementById("rapporto-madre");
const cntPadre = document.getElementById("cnt-padre");
const cntMadre = document.getElementById("cnt-madre");
const errPadre = document.getElementById("err-padre");
const errMadre = document.getElementById("err-madre");
const errGlobal = document.getElementById("err-global");
const btnAvanti = document.getElementById("btn-avanti");
const btnBack   = document.getElementById("btn-back");

// ── Ripristino sessione ───────────────────────────────────────────────────
(function restoreSession() {
  const sess = JSON.parse(localStorage.getItem('questionario_session') || 'null');
  if (!sess?.docId) return;
  if (!sessionStorage.getItem('firestoreDocId')) {
    sessionStorage.setItem('firestoreDocId', sess.docId);
  }
  if (sess.rapportoPadre) { padreTa.value = sess.rapportoPadre; updateCounter(padreTa, cntPadre); }
  if (sess.rapportoMadre) { madreTa.value = sess.rapportoMadre; updateCounter(madreTa, cntMadre); }
})();

function updateCounter(ta, cntEl) {
  const n = ta.value.trim().length;
  const ok = n >= MIN_CHARS;
  cntEl.textContent = `${n} / ${MIN_CHARS} caratteri minimi`;
  cntEl.className = "char-counter " + (ok ? "ok" : n > 0 ? "warn" : "");
}

padreTa.addEventListener("input", () => {
  updateCounter(padreTa, cntPadre);
  errPadre.textContent = "";
  const _s = JSON.parse(localStorage.getItem('questionario_session') || '{}');
  _s.rapportoPadre = padreTa.value;
  localStorage.setItem('questionario_session', JSON.stringify(_s));
});
madreTa.addEventListener("input", () => {
  updateCounter(madreTa, cntMadre);
  errMadre.textContent = "";
  const _s = JSON.parse(localStorage.getItem('questionario_session') || '{}');
  _s.rapportoMadre = madreTa.value;
  localStorage.setItem('questionario_session', JSON.stringify(_s));
});

btnBack.addEventListener("click", () => {
  window.location.href = "index.html";
});

btnAvanti.addEventListener("click", async () => {
  errPadre.textContent = "";
  errMadre.textContent = "";
  errGlobal.textContent = "";

  const padre = padreTa.value.trim();
  const madre = madreTa.value.trim();
  let valid = true;

  if (padre.length < MIN_CHARS) {
    errPadre.textContent = `Risposta troppo breve (${padre.length} caratteri). Minimo ${MIN_CHARS}.`;
    padreTa.classList.add("invalid");
    valid = false;
  } else {
    padreTa.classList.remove("invalid");
  }

  if (madre.length < MIN_CHARS) {
    errMadre.textContent = `Risposta troppo breve (${madre.length} caratteri). Minimo ${MIN_CHARS}.`;
    madreTa.classList.add("invalid");
    valid = false;
  } else {
    madreTa.classList.remove("invalid");
  }

  if (!valid) return;

  const data = { rapportoPadre: padre, rapportoMadre: madre, status: "domande-aperte" };

  sessionStorage.setItem("domandeAperteData", JSON.stringify(data));

  btnAvanti.disabled = true;
  btnAvanti.textContent = "Salvataggio...";
  try { await patchDoc(data); }
  catch (ex) { console.warn("Firestore patch failed, continuing:", ex.message); }

  // Aggiorna sessione localStorage
  const _s = JSON.parse(localStorage.getItem('questionario_session') || '{}');
  _s.status = 'igrs'; _s.lastPage = 'igrs.html';
  delete _s.rapportoPadre; delete _s.rapportoMadre;
  localStorage.setItem('questionario_session', JSON.stringify(_s));

  window.location.href = "igrs.html";
});
