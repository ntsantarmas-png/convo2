// ===================== FIREBASE AUTH =====================
import { 
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInAnonymously, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { updateProfile } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import { getDatabase, ref, set, update } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { app } from "./app.js";

const auth = getAuth(app);
const db = getDatabase(app);

// === LOGIN ===
document.getElementById("loginBtn").addEventListener("click", async () => {
  const email = document.getElementById("loginEmail").value.trim();
  const pass = document.getElementById("loginPassword").value.trim();
  if (!email || !pass) return alert("⚠️ Fill all fields");
  await signInWithEmailAndPassword(auth, email, pass).catch(err => alert(err.message));
});
// ===================== FORGOT PASSWORD =====================
const forgotBtn = document.getElementById("forgotPasswordBtn");
const resetBanner = document.getElementById("resetBanner");

if (forgotBtn) {
  forgotBtn.addEventListener("click", async () => {
    const email = document.getElementById("loginEmail").value.trim();

    if (!email) {
      alert("⚠️ Please enter your email first!");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);

      // === Εμφάνιση επιτυχίας ===
      if (resetBanner) {
        resetBanner.classList.remove("hidden");
        setTimeout(() => {
          resetBanner.classList.add("hidden");
        }, 3000);
      }
    } catch (err) {
      alert("❌ " + err.message);
    }
  });
}



// === REGISTER ===
document.getElementById("registerBtn").addEventListener("click", async () => {
  const username = document.getElementById("registerUsername").value.trim() || "User";
  const email = document.getElementById("registerEmail").value.trim();
  const pass = document.getElementById("registerPassword").value.trim();
  if (!email || !pass) return alert("⚠️ Fill all fields");
  const cred = await createUserWithEmailAndPassword(auth, email, pass);

// ✅ Ορισμός username ή fallback
const finalName = username || "User" + Math.floor(Math.random() * 10000);

// ✅ Ενημέρωση Firebase Auth προφίλ
await updateProfile(cred.user, { displayName: finalName });

// ✅ Καταχώρηση στο Realtime Database
await update(ref(db, "users/" + cred.user.uid), {
  uid: cred.user.uid,
  displayName: finalName,
  email,
  createdAt: Date.now(),
});

  await update(ref(db, "users/" + cred.user.uid), {
    uid: cred.user.uid,
    displayName: username,
    email,
    createdAt: Date.now(),
  });
  alert("✅ Registration complete!");
});

// === GUEST ===
document.getElementById("guestBtn").addEventListener("click", async () => {
  await signInAnonymously(auth);
});

// ===================== AUTH STATE (Universal) =====================
onAuthStateChanged(auth, async (user) => {
  const authView = document.getElementById("authView");
  const appView = document.getElementById("appView");
  const logoutBtn = document.getElementById("logoutBtn");
  const welcomeBanner = document.getElementById("welcomeBanner");
  const welcomeName = document.getElementById("welcomeName");

  if (user) {
    // ✅ 1. Αν είναι MysteryMan → ειδική μεταχείριση
    if (user.email === "ntsantarmas@gmail.com" && user.displayName !== "MysteryMan") {
      await updateProfile(user, { displayName: "MysteryMan" });
      console.log("👑 Logged in as MysteryMan");
    }

    // ✅ 2. Αν δεν έχει καθόλου displayName → φτιάξε του ένα
    if (!user.displayName) {
      let newName;

      if (user.isAnonymous) {
        newName = "Guest" + Math.floor(Math.random() * 1000);
      } else if (user.email) {
        const emailPrefix = user.email.split("@")[0];
        newName = emailPrefix.length > 2 ? emailPrefix : "User" + Math.floor(Math.random() * 10000);
      } else {
        newName = "User" + Math.floor(Math.random() * 10000);
      }

      await updateProfile(user, { displayName: newName });
      console.log("✅ Assigned displayName:", newName);
    }

    // ✅ 3. Καταχώρηση/ενημέρωση στο Realtime Database
    await update(ref(db, "users/" + user.uid), {
      uid: user.uid,
      displayName: user.displayName || "Guest",
      email: user.email || "anonymous",
      isAnonymous: user.isAnonymous || false,
      lastLogin: Date.now(),
    });

    // ✅ 4. Εμφάνιση Chat
    authView.classList.add("hidden");
    appView.classList.remove("hidden");
    logoutBtn.classList.remove("hidden");
    appView.style.display = "block";

    // ✅ 5. Welcome bubble/banner
    if (welcomeBanner && welcomeName) {
      welcomeName.textContent = user.displayName || "Guest";
      welcomeBanner.classList.remove("hidden");
      setTimeout(() => welcomeBanner.classList.add("hidden"), 3000);
    }

  } else {
    // ❌ Επιστροφή στο login/register view
    authView.classList.remove("hidden");
    appView.classList.add("hidden");
    logoutBtn.classList.add("hidden");
    appView.style.display = "none";
  }
});

// === LOGOUT ===
document.getElementById("logoutBtn").addEventListener("click", async () => {
  await auth.signOut();
});
