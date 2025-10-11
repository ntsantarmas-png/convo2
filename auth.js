// ================================
//  CONVO CHATROOM — AUTH MODULE
// ================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  set,
  get,
  child,
  update,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// ============================================
// 1️⃣  CONFIGURATION (βάλε τα δικά σου στοιχεία)
// ============================================
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// ============================================
// 2️⃣  INITIALIZATION
// ============================================
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

window.auth = auth;
window.db = db;

// ============================================
// 3️⃣  ELEMENTS
// ============================================
const loginBtn = document.getElementById("loginBtn");
const registerBtn = document.getElementById("registerBtn");
const guestBtn = document.getElementById("guestBtn");
const logoutBtn = document.getElementById("logoutBtn");

// ============================================
// 4️⃣  LOGIN / REGISTER / GUEST / LOGOUT
// ============================================
if (loginBtn) {
  loginBtn.addEventListener("click", async () => {
    const email = document.getElementById("loginEmail").value.trim();
    const pass = document.getElementById("loginPassword").value.trim();
    if (!email || !pass) return alert("Enter email and password");

    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err) {
      alert("❌ Login failed: " + err.message);
    }
  });
}

if (registerBtn) {
  registerBtn.addEventListener("click", async () => {
    const email = document.getElementById("registerEmail").value.trim();
    const pass = document.getElementById("registerPassword").value.trim();
    if (!email || !pass) return alert("Enter email and password");

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      const username = email.split("@")[0];
      await updateProfile(cred.user, { displayName: username });

      // Store basic user info + default role
      await set(ref(db, "v3/users/" + cred.user.uid), {
        uid: cred.user.uid,
        username,
        role: username === "MysteryMan" ? "admin" : "user",
        coins: 0,
        status: "online",
        joinedAt: serverTimestamp()
      });

      alert("✅ Account created successfully!");
    } catch (err) {
      alert("❌ Register failed: " + err.message);
    }
  });
}

if (guestBtn) {
  guestBtn.addEventListener("click", async () => {
    try {
      const cred = await signInAnonymously(auth);
      const guestName = "Guest" + Math.floor(Math.random() * 1000);
      await updateProfile(cred.user, { displayName: guestName });
      await set(ref(db, "v3/users/" + cred.user.uid), {
        uid: cred.user.uid,
        username: guestName,
        role: "guest",
        coins: 0,
        status: "online",
        joinedAt: serverTimestamp()
      });
    } catch (err) {
      alert("❌ Guest login failed: " + err.message);
    }
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        await update(ref(db, "v3/users/" + user.uid), { status: "offline" });
      }
      await signOut(auth);
    } catch (err) {
      console.error("Logout error:", err);
    }
  });
}

// ============================================
// 5️⃣  AUTH STATE LISTENER
// ============================================
onAuthStateChanged(auth, async (user) => {
  const authDiv = document.getElementById("authContainer");
  const chatDiv = document.getElementById("chatContainer");
  const adminBtn = document.getElementById("adminBtn");

  if (user) {
    authDiv.classList.add("hidden");
    chatDiv.classList.remove("hidden");

    // Read or create user entry
    const userRef = ref(db, "v3/users/" + user.uid);
    const snapshot = await get(userRef);
    if (!snapshot.exists()) {
      const username = user.displayName || "User" + user.uid.slice(-4);
      const role = username === "MysteryMan" ? "admin" : "user";
      await set(userRef, {
        uid: user.uid,
        username,
        role,
        coins: 0,
        status: "online",
        joinedAt: serverTimestamp()
      });
    } else {
      // set status to online again
      await update(userRef, { status: "online" });
    }

    // === Presence tracking ===
    window.addEventListener("beforeunload", () => {
      update(userRef, { status: "offline" });
    });

    // === Show admin button if MysteryMan ===
    const currentSnap = await get(userRef);
    const role = currentSnap.val().role;
    if (role === "admin") adminBtn.classList.remove("hidden");

  } else {
    chatDiv.classList.add("hidden");
    authDiv.classList.remove("hidden");
  }
});

// ============================================
// END AUTH MODULE
// ============================================
