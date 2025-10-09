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

// ===================== SPLASH + AUTH FLOW (Unified) =====================

// Μόλις φορτώσει η σελίδα
window.addEventListener("load", () => {
  const splash = document.getElementById("splashScreen");
  const authContainer = document.getElementById("authContainer");
  const appContainer = document.getElementById("appContainer");

  onAuthStateChanged(window.auth, (user) => {
    if (user) {
      // === LOGGED IN ===
      if (splash) splash.style.display = "none";
      if (authContainer) authContainer.style.display = "none";
      if (appContainer) {
        appContainer.style.display = "block";
        appContainer.style.opacity = "0";
        appContainer.style.transition = "opacity 0.6s ease-in-out";
        setTimeout(() => (appContainer.style.opacity = "1"), 50);
      }

      document.getElementById("currentUserName").textContent =
        user.displayName || "Guest";
      update(ref(window.db, "users/" + user.uid), { online: true });
      console.log("✅ Logged in:", user.displayName || "Guest");
    } else {
      // === LOGGED OUT ===
      if (appContainer) {
        appContainer.style.opacity = "0";
        setTimeout(() => (appContainer.style.display = "none"), 400);
      }

      // 🔹 Εμφάνιση cinematic splash μόνο στην πρώτη φόρτωση
      if (sessionStorage.getItem("splashPlayed")) {
        // Ήδη παίχτηκε: δείξε αμέσως το login
        if (splash) splash.style.display = "none";
        if (authContainer) {
          authContainer.style.display = "block";
          authContainer.style.opacity = "1";
        }
      } else {
        // Παίξε splash animation για 3.5s
        if (authContainer) authContainer.style.opacity = "0";
        if (appContainer) appContainer.style.display = "none";
        setTimeout(() => {
  if (splash) splash.style.display = "none";
  if (authContainer) {
    authContainer.classList.add("show"); // 👈 ενεργοποιεί το fade-in cinematic
    authContainer.style.display = "block";
    authContainer.style.opacity = "1";
  }
  sessionStorage.setItem("splashPlayed", "true");
}, 3500);
      }

      console.log("👋 User logged out or no session");
    }
  });
});

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

