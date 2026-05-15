// Shared Firestore REST utilities
import { firebaseConfig } from "./firebase-config.js";
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";

export const FIREBASE_API_KEY = "AIzaSyACw47qEsgsMCC2tUlbPEu81f-1ENRB0-U";
export const FIRESTORE_BASE   = "https://firestore.googleapis.com/v1/projects/questionario-9b487/databases/(default)/documents";
const COLLECTION = "responses";

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
let anonymousAuthPromise = null;

async function ensureAnonymousAuth() {
  if (auth.currentUser) return auth.currentUser;
  if (!anonymousAuthPromise) {
    anonymousAuthPromise = signInAnonymously(auth)
      .then(({ user }) => user)
      .catch((error) => {
        anonymousAuthPromise = null;
        throw error;
      });
  }
  return anonymousAuthPromise;
}

async function authHeaders() {
  const user = await ensureAnonymousAuth();
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

export function toFSVal(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === "boolean")        return { booleanValue: v };
  if (typeof v === "number")         return { integerValue: String(v) };
  return { stringValue: String(v) };
}

function buildFields(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) fields[k] = toFSVal(v);
  return fields;
}

/**
 * Create a new document with the given data.
 * Returns the document ID (stored in sessionStorage as "firestoreDocId").
 */
export async function createDoc(data) {
  const url = `${FIRESTORE_BASE}/${COLLECTION}?key=${FIREBASE_API_KEY}`;
  const headers = { "Content-Type": "application/json", ...(await authHeaders()) };
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ fields: buildFields(data) }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? "HTTP " + res.status);
  }
  const doc = await res.json();
  // doc.name = "projects/.../documents/responses/DOCID"
  const docId = doc.name.split("/").pop();
  sessionStorage.setItem("firestoreDocId", docId);
  return docId;
}

/**
 * Patch (merge) an existing document with new data.
 * Reads the docId from sessionStorage. If no docId, falls back to createDoc.
 * Uses ?currentDocument.exists=true so the patch only touches existing docs.
 */
export async function patchDoc(data) {
  const docId = sessionStorage.getItem("firestoreDocId");
  if (!docId) {
    // Fallback: create
    return createDoc(data);
  }
  const fields = buildFields(data);
  // Build updateMask from the keys
  const mask = Object.keys(fields)
    .map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`)
    .join("&");
  const url = `${FIRESTORE_BASE}/${COLLECTION}/${docId}?key=${FIREBASE_API_KEY}&${mask}`;
  const headers = { "Content-Type": "application/json", ...(await authHeaders()) };
  const res = await fetch(url, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? "HTTP " + res.status);
  }
}
