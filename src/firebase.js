import { initializeApp } from "firebase/app";
import {
  getDatabase, ref, set, onValue, push,
  query, orderByChild, limitToLast,
} from "firebase/database";

const firebaseConfig = {
  apiKey:            process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain:        process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  databaseURL:       process.env.REACT_APP_FIREBASE_DATABASE_URL,
  projectId:         process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.REACT_APP_FIREBASE_APP_ID,
};

let db = null;
try {
  if (process.env.REACT_APP_FIREBASE_DATABASE_URL) {
    const app = initializeApp(firebaseConfig);
    db = getDatabase(app);
  }
} catch (e) {
  console.warn("Firebase init failed:", e);
}

export function saveTrip(tripId, state) {
  if (!db || !tripId) return Promise.resolve();
  return set(ref(db, `trips/${tripId}/state`), state);
}

export function subscribeState(tripId, callback) {
  if (!db || !tripId) return () => {};
  const r = ref(db, `trips/${tripId}/state`);
  return onValue(r, (snap) => {
    const val = snap.val();
    if (val) callback(val);
  });
}

export function pushActivity(tripId, entry) {
  if (!db || !tripId) return Promise.resolve();
  return push(ref(db, `trips/${tripId}/activity`), entry);
}

export function subscribeActivity(tripId, callback) {
  if (!db || !tripId) return () => {};
  const q = query(
    ref(db, `trips/${tripId}/activity`),
    orderByChild("ts"),
    limitToLast(20),
  );
  return onValue(q, (snap) => {
    const items = [];
    snap.forEach((child) => items.push(child.val()));
    callback(items.reverse()); // newest first
  });
}
