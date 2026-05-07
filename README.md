# Questionario Tesi (GitHub Pages + Firebase)

Landing page per raccogliere informazioni demografiche e salvarle in Firebase Firestore.

## 1) Configura Firebase

1. Vai in Firebase Console -> Progetto -> Firestore Database e crea il database (modalita produzione o test).
2. In Firebase Console -> Impostazioni progetto -> Le tue app (Web), copia la configurazione SDK.
3. Sostituisci i valori in `firebase-config.js`.

## 2) Regole Firestore minime (MVP)

Per una prima raccolta dati senza login partecipanti, puoi usare regole minime (poi da irrigidire):

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /demographics/{docId} {
      allow create: if true;
      allow read, update, delete: if false;
    }
  }
}
```

Questo permette solo l'inserimento dal form e blocca lettura/modifica/cancellazione dal client.

## 3) Avvio locale rapido

Puoi aprire `index.html` direttamente nel browser, ma alcuni browser bloccano i moduli ES da file locale.
Meglio usare un server statico locale, ad esempio:

```powershell
npx serve .
```

## 4) Deploy su GitHub Pages

1. Commit e push su `main`.
2. Su GitHub: Repository -> Settings -> Pages.
3. In "Build and deployment", scegli "Deploy from a branch".
4. Seleziona branch `main` e cartella `/ (root)`.
5. Salva e attendi il link pubblico.

## 5) Dove trovi i dati

- Firebase Console -> Firestore Database -> collection `demographics`.

## 6) Passo successivo consigliato

- Dopo il salvataggio demografico, reindirizza a una pagina con il questionario principale (es. `questionario.html`).
