import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

/* === STEP 1: REPLACE WITH YOUR FIREBASE CONFIG === */
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

window.auth = auth;
window.db = db;

/* === AUTH UI === */
const loginBtn = document.getElementById("loginBtn");
const guestBtn = document.getElementById("guestBtn");
const registerBtn = document.getElementById("registerBtn");
const logoutBtn = document.getElementById("logoutBtn");

if (loginBtn) {
  loginBtn.addEventListener("click", async () => {
    const email = document.getElementById("loginEmail").value;
    const pass = document.getElementById("loginPassword").value;
    if (!email || !pass) return alert("Enter email & password");
    await signInWithEmailAndPassword(auth, email, pass);
  });
}
if (registerBtn) {
  registerBtn.addEventListener("click", async () => {
    const email = document.getElementById("registerEmail").value;
    const pass = document.getElementById("registerPassword").value;
    if (!email || !pass) return alert("Enter email & password");
    await createUserWithEmailAndPassword(auth, email, pass);
  });
}
if (guestBtn) guestBtn.addEventListener("click", () => signInAnonymously(auth));
if (logoutBtn) logoutBtn.addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, (user) => {
  const authDiv = document.getElementById("authContainer");
  const chatDiv = document.getElementById("chatContainer");
  if (user) {
    authDiv.classList.add("hidden");
    chatDiv.classList.remove("hidden");
  } else {
    chatDiv.classList.add("hidden");
    authDiv.classList.remove("hidden");
  }
});
