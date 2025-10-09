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
//  AUTH STATE CHANGE → δείξε/κρύψε auth container
// ============================================================================
onAuthStateChanged(window.auth, (user) => {
  if (user) {
    authContainer.classList.add("hidden");
    document.getElementById("currentUserName").textContent =
      user.displayName || "Guest";
    update(ref(window.db, "users/" + user.uid), { online: true });
  } else {
    authContainer.classList.remove("hidden");
  }
});
