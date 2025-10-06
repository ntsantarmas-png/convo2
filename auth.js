// ===================== AUTH.JS =====================

// Παίρνουμε το ίδιο app instance που φτιάχτηκε στο app.js
import { getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signInAnonymously, signOut, updateProfile, sendPasswordResetEmail, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getDatabase, ref, set, update, get
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";


const app = getApp();
const auth = getAuth(app);
const db = getDatabase(app);

// ===================== BUTTON HANDLERS =====================

// === GUEST LOGIN ===
const guestBtn = document.getElementById("guestBtn");
if (guestBtn) {
  guestBtn.addEventListener("click", async () => {
    try {
      await signInAnonymously(auth);
      console.log("✅ Signed in as Guest");
    } catch (err) {
      console.error("❌ Guest login failed:", err.message);
    }
  });
}

// === EMAIL LOGIN ===
const loginBtn = document.getElementById("loginBtn");
if (loginBtn) {
  loginBtn.addEventListener("click", async () => {
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    try {
      await signInWithEmailAndPassword(auth, email, password);
      console.log("✅ Logged in with email:", email);
    } catch (err) {
      console.error("❌ Login failed:", err.message);
      alert("Login failed: " + err.message);
    }
  });
}

// === REGISTER (Username + Email + Password) ===
const registerBtn = document.getElementById("registerBtn");
if (registerBtn) {
  registerBtn.addEventListener("click", async () => {
    const username = document.getElementById("registerUsername").value;
    const email = document.getElementById("registerEmail").value;
    const password = document.getElementById("registerPassword").value;

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Αποθήκευση username στο profile
const finalName = username || "User" + Math.floor(Math.random() * 10000);
await updateProfile(user, { displayName: finalName });

      // Αποθήκευση και στη βάση
   await set(ref(db, "users/" + user.uid), {
  uid: user.uid,
  email: email,
  displayName: finalName,  // 👈 εδώ να είναι το ίδιο με το updateProfile
    coins: 400,              // 💎 αρχικά coins με την εγγραφή
     online: true
});


      console.log("✅ Registered:", user.uid, username);
    } catch (err) {
      console.error("❌ Register failed:", err.message);
      alert("Register failed: " + err.message);
    }
  });
}

// === FORGOT PASSWORD ===
const forgotBtn = document.getElementById("forgotBtn");
if (forgotBtn) {
  forgotBtn.addEventListener("click", async () => {
    const email = document.getElementById("forgotEmail").value;
    if (!email) {
      alert("⚠️ Please enter an email");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      console.log("📩 Password reset email sent to:", email);
      alert("Check your inbox for the reset link!");
    } catch (err) {
      console.error("❌ Reset failed:", err.message);
      alert("Reset failed: " + err.message);
    }
  });
}

// === LOGOUT ===
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await signOut(auth);
      console.log("✅ Logged out");
    } catch (err) {
      console.error("❌ Logout failed:", err.message);
    }
  });
}

// ===================== AUTH STATE HANDLING =====================
const authView = document.getElementById("auth");   // login/register view
const appView = document.getElementById("app");     // main chat view
const headerUser = document.getElementById("headerUser"); // span στο header για το όνομα

onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log("✅ Logged in:", user.uid);

    // === Εμφάνισε το κουμπί logout ===
    if (logoutBtn) logoutBtn.classList.remove("hidden");

    // === Αν δεν υπάρχει displayName, δώσε default ===
    let name = user.displayName || "User" + Math.floor(Math.random() * 10000);

    if (!user.displayName) {
      await updateProfile(user, { displayName: name });
    }

    // === Αν δεν υπάρχει avatar, δώσε τυχαίο ===
    let avatar = user.photoURL;
    if (!avatar) {
      const avatarId = Math.floor(Math.random() * 70) + 1;
      avatar = `https://i.pravatar.cc/150?img=${avatarId}`;
      await updateProfile(user, { photoURL: avatar });
    }

   // === Ενημέρωση χρήστη στη DB με role persistence ===
try {
  const userRef = ref(db, "users/" + user.uid);
  const snap = await get(userRef);
  const existing = snap.val() || {};

  // === Καθορισμός ρόλου ===
  let role = existing.role || "user";
  if (user.isAnonymous) role = "guest";
  if (name === "MysteryMan") role = "admin"; // ✅ πάντα admin

await update(userRef, {
  uid: user.uid,
  displayName: name,
  email: user.email || null,
  photoURL: avatar,
  online: true,
  lastLogin: Date.now(),
  role: role
});

console.log("✅ Role persistence check:", role);
} catch (err) {
  console.error("❌ Role persistence failed:", err);
}



    // === UI switch (με hidden class) ===
    authView.classList.add("hidden");
    appView.classList.remove("hidden");
    // ✅ Εμφανίζει τα κουμπιά topbar ΜΟΝΟ στο app
document.getElementById("appTopActions").classList.remove("hidden");
// ✅ Με το που κάνει login ή register, κρύβουμε το YouTube panel
const youtubePanel = document.getElementById("youtubePanel");
if (youtubePanel) {
  youtubePanel.classList.add("hidden");
  youtubePanel.classList.remove("expanded");
}

    if (headerUser) {
  headerUser.textContent = user.displayName || name || "Guest";
  console.log("👤 Header name set to:", headerUser.textContent);
}

  } else {
    console.log("❌ Logged out");

    if (headerUser) headerUser.textContent = "";
    // === Κρύψε το κουμπί logout ===
    if (logoutBtn) logoutBtn.classList.add("hidden");

    appView.classList.add("hidden");
    authView.classList.remove("hidden");
    document.getElementById("appTopActions").classList.add("hidden");

    
  }
});
