// ===================== GIPHY CONFIG =====================
const GIPHY_KEY = "bCn5Jvx2ZOepneH6fMteNoX31hVfqX25";

// ===================== FIREBASE CONFIG =====================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, signOut, sendPasswordResetEmail, 
  signInAnonymously, updateProfile } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import { getDatabase, ref, set, update } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBEiZEcY54mFT7OnrfCv0t3sPo33DthcZ4",
  authDomain: "convo2-4a075.firebaseapp.com",
  databaseURL: "https://convo2-4a075-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "convo2-4a075",
  storageBucket: "convo2-4a075.firebasestorage.app",
  messagingSenderId: "543901633763",
  appId: "1:543901633763:web:2f91926e4c0c6ce11789d6"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);

// ===================== AUTH HANDLERS =====================
const authScreen = document.getElementById("authScreen");
const chatScreen = document.getElementById("chatScreen");

// === Toggle boxes ===
const loginBox = document.getElementById("loginBox");
const registerBox = document.getElementById("registerBox");
const forgetBox = document.getElementById("forgetBox");

document.getElementById("showRegister").onclick = () => {
  loginBox.classList.add("hidden");
  registerBox.classList.remove("hidden");
};
document.getElementById("showLogin").onclick = () => {
  registerBox.classList.add("hidden");
  loginBox.classList.remove("hidden");
};
document.getElementById("showForget").onclick = () => {
  loginBox.classList.add("hidden");
  forgetBox.classList.remove("hidden");
};
document.getElementById("backToLogin").onclick = () => {
  forgetBox.classList.add("hidden");
  loginBox.classList.remove("hidden");
};

// === REGISTER ===
document.getElementById("registerBtn").addEventListener("click", async () => {
  const username = document.getElementById("registerUsername").value.trim();
  const email = document.getElementById("registerEmail").value.trim();
  const password = document.getElementById("registerPassword").value.trim();
  if (!username || !email || !password) return alert("⚠️ Συμπλήρωσε όλα τα πεδία!");

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: username });
    await set(ref(db, "users/" + cred.user.uid), {
      uid: cred.user.uid,
      displayName: username,
      role: username === "MysteryMan" ? "admin" : "user",
      online: true
    });
    alert("✅ Εγγραφή επιτυχής!");
  } catch (err) {
    alert("❌ Σφάλμα: " + err.message);
  }
});

// === LOGIN ===
document.getElementById("loginBtn").addEventListener("click", async () => {
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value.trim();
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    alert("❌ " + err.message);
  }
});

// === GUEST ===
document.getElementById("guestBtn").addEventListener("click", async () => {
  try {
    const cred = await signInAnonymously(auth);
    const guestName = "Guest" + Math.floor(Math.random() * 10000);
    await updateProfile(cred.user, { displayName: guestName });
    await set(ref(db, "users/" + cred.user.uid), {
      uid: cred.user.uid,
      displayName: guestName,
      role: "guest",
      online: true
    });
  } catch (err) {
    alert("❌ " + err.message);
  }
});

// === FORGOT PASSWORD ===
document.getElementById("resetBtn").addEventListener("click", async () => {
  const email = document.getElementById("forgetEmail").value.trim();
  if (!email) return alert("Συμπλήρωσε email!");
  try {
    await sendPasswordResetEmail(auth, email);
    alert("📧 Email επαναφοράς στάλθηκε!");
  } catch (err) {
    alert(err.message);
  }
});

// === LOGOUT ===
document.getElementById("logoutBtn").addEventListener("click", async () => {
  await signOut(auth);
});

// === AUTH STATE ===
onAuthStateChanged(auth, (user) => {
  if (user) {
    authScreen.classList.add("hidden");
    chatScreen.classList.remove("hidden");
    update(ref(db, "users/" + user.uid), { online: true });
  } else {
    chatScreen.classList.add("hidden");
    authScreen.classList.remove("hidden");
  }
});
