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

function updateCounter(ta, cntEl) {
  const n = ta.value.trim().length;
  const ok = n >= MIN_CHARS;
  cntEl.textContent = `${n} / ${MIN_CHARS} caratteri minimi`;
  cntEl.className = "char-counter " + (ok ? "ok" : n > 0 ? "warn" : "");
}

padreTa.addEventListener("input", () => {
  updateCounter(padreTa, cntPadre);
  errPadre.textContent = "";
});
madreTa.addEventListener("input", () => {
  updateCounter(madreTa, cntMadre);
  errMadre.textContent = "";
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

  window.location.href = "igrs.html";
});
