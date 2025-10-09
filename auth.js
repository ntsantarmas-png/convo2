// ===================== AUTH.JS (Convo Reignite Base v1.8.0) =====================
//  Handles Register, Login & Guest login  ✅
//  Uses the global window.auth & window.db objects from index.html
// ================================================================================
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInAnonymously,
  updateProfile,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
import { ref, set, update } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-database.js";

// ===================== SPLASH + AUTH FLOW =====================

// Μόλις φορτώσει η σελίδα
window.addEventListener("load", () => {
  const splash = document.getElementById("splashScreen");
  const authContainer = document.getElementById("authContainer");
  const appContainer = document.getElementById("appContainer");

  // 1️⃣ Ελέγχουμε πρώτα αν υπάρχει ήδη logged user
  onAuthStateChanged(window.auth, (user) => {
    if (user) {
      // Αν υπάρχει χρήστης: δείξε κατευθείαν το chat
      if (splash) splash.style.display = "none";
      if (authContainer) authContainer.style.display = "none";
      if (appContainer) {
        appContainer.style.display = "block";
        appContainer.style.opacity = "1";
      }
      console.log("✅ User already logged in:", user.displayName || "Guest");
      return;
    }

    // 2️⃣ Αν ΔΕΝ υπάρχει user, δείξε cinematic splash για 3.5s
    if (authContainer) authContainer.style.opacity = "0";
    if (appContainer) appContainer.style.display = "none";

    setTimeout(() => {
      // Κρύψε splash και δείξε login panel με fade-in
      if (splash) splash.style.display = "none";
      if (authContainer) {
        authContainer.style.transition = "opacity 0.8s ease-in-out";
        authContainer.style.opacity = "1";
        authContainer.style.display = "block";
      }
    }, 3500);
  });
});

// === DOM references ===
const authContainer = document.getElementById("authContainer");
const registerBtn     = document.getElementById("registerBtn");
const loginBtn        = document.getElementById("loginBtn");
const guestLoginBtn   = document.getElementById("guestLoginBtn");
const logoutBtn       = document.getElementById("logoutBtn");


// ============================================================================
//  REGISTER (username + email + password)
// ============================================================================
if (registerBtn) {
  registerBtn.addEventListener("click", async () => {
    const username = document.getElementById("registerUsername").value.trim();
    const email    = document.getElementById("registerEmail").value.trim();
    const password = document.getElementById("registerPassword").value.trim();

    if (!email || !password) return alert("⚠️ Συμπλήρωσε email και password!");

    try {
      const userCredential = await createUserWithEmailAndPassword(window.auth, email, password);
      const user = userCredential.user;

      // Ενημέρωση Auth Profile με το username
      await updateProfile(user, { displayName: username || "User" });

      // Δημιουργία στο Realtime Database
      await set(ref(window.db, "users/" + user.uid), {
        uid: user.uid,
        displayName: user.displayName,
        online: true,
        role: "user",
        createdAt: Date.now()
      });

      console.log("✅ User registered:", user.displayName);
    } catch (err) {
      alert("❌ Σφάλμα εγγραφής: " + err.message);
    }
  });
}

// ============================================================================
//  LOGIN (με email + password)
// ============================================================================
if (loginBtn) {
  loginBtn.addEventListener("click", async () => {
    const email    = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value.trim();

    if (!email || !password) return alert("⚠️ Συμπλήρωσε email και password!");

    try {
      await signInWithEmailAndPassword(window.auth, email, password);
      console.log("✅ User logged in:", email);
    } catch (err) {
      alert("❌ Σφάλμα login: " + err.message);
    }
  });
}

// ============================================================================
//  GUEST LOGIN (anonymous)
// ============================================================================
if (guestLoginBtn) {
  guestLoginBtn.addEventListener("click", async () => {
    try {
      const userCredential = await signInAnonymously(window.auth);
      const user = userCredential.user;

      await set(ref(window.db, "users/" + user.uid), {
        uid: user.uid,
        displayName: "Guest_" + user.uid.substring(0, 5),
        online: true,
        role: "guest",
        createdAt: Date.now()
      });

      console.log("✅ Guest login:", user.uid);
    } catch (err) {
      alert("❌ Guest login error: " + err.message);
    }
  });
}

// ============================================================================
//  LOGOUT
// ============================================================================
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await signOut(window.auth);
      console.log("👋 User logged out");
    } catch (err) {
      alert("❌ Logout error: " + err.message);
    }
  });
}

// ============================================================================
//  AUTH STATE CHANGE → Εμφάνιση / Απόκρυψη Auth & Chat Containers
// ============================================================================
onAuthStateChanged(window.auth, (user) => {
  const authContainer = document.getElementById("authContainer");
  const appContainer = document.getElementById("appContainer");

  if (user) {
    console.log("✅ User logged in:", user.displayName || "Guest");

    // Κρύψε το login/register panel
    if (authContainer) authContainer.classList.add("hidden");

    // Εμφάνισε το chat με ομαλό fade-in
    if (appContainer) {
      appContainer.style.display = "block";
      appContainer.style.opacity = "0";
      appContainer.style.transition = "opacity 0.6s ease-in-out";
      setTimeout(() => (appContainer.style.opacity = "1"), 50);
    }

    // Ενημέρωσε την ένδειξη ονόματος
    document.getElementById("currentUserName").textContent =
      user.displayName || "Guest";

    // Ενημέρωσε Firebase για online status
    update(ref(window.db, "users/" + user.uid), { online: true });
  } else {
    console.log("🔒 No user logged in");

    // Κρύψε το chat
    if (appContainer) appContainer.style.display = "none";

    // Εμφάνισε το login/register panel
    if (authContainer) authContainer.classList.remove("hidden");
  }
});

