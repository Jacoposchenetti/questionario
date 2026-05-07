import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import {
  getFirestore,
  addDoc,
  collection,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const form = document.getElementById("demographic-form");
const statusEl = document.getElementById("status");
const submitBtn = document.getElementById("submit-btn");

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function setStatus(message, type = "") {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`.trim();
}

function getFormValues() {
  const formData = new FormData(form);
  return {
    age: Number(formData.get("age")),
    gender: String(formData.get("gender") || ""),
    education: String(formData.get("education") || ""),
    occupation: String(formData.get("occupation") || "").trim(),
    country: String(formData.get("country") || "").trim(),
    consent: formData.get("consent") === "on"
  };
}

async function saveDemographics(payload) {
  await addDoc(collection(db, "demographics"), {
    ...payload,
    createdAt: serverTimestamp(),
    source: "github-pages",
    userAgent: navigator.userAgent
  });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const data = getFormValues();

  if (!data.consent) {
    setStatus("Per continuare devi fornire il consenso privacy.", "error");
    return;
  }

  submitBtn.disabled = true;
  setStatus("Salvataggio in corso...");

  try {
    await saveDemographics(data);
    form.reset();
    setStatus("Dati salvati con successo. Grazie per la partecipazione.", "success");
  } catch (error) {
    console.error(error);
    setStatus("Errore durante il salvataggio. Riprova tra poco.", "error");
  } finally {
    submitBtn.disabled = false;
  }
});
