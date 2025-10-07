// ===================== FIREBASE AUTH =====================
import { 
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInAnonymously, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
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
// === FORGOT PASSWORD ===
const forgotBtn = document.getElementById("forgotPasswordBtn");
if (forgotBtn) {
  forgotBtn.addEventListener("click", async () => {
    const email = document.getElementById("loginEmail").value.trim();
    if (!email) {
      alert("⚠️ Please enter your email first!");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      alert("📧 Password reset email sent! Check your inbox.");
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

// ===================== AUTH STATE =====================
onAuthStateChanged(auth, (user) => {
  const authView = document.getElementById("authView");
  const appView = document.getElementById("appView");
  const logoutBtn = document.getElementById("logoutBtn");
  const welcomeBanner = document.getElementById("welcomeBanner");
  const welcomeName = document.getElementById("welcomeName");

  if (user) {
    document.getElementById("authView").style.display = "none";
    // === Εμφάνιση Chat ===
    authView.classList.add("hidden");
    appView.classList.remove("hidden");
    appView.style.display = "block";
    logoutBtn.classList.remove("hidden");

    // === WELCOME BANNER ===
    if (welcomeBanner && welcomeName) {
      welcomeName.textContent = user.displayName || "Guest";
      welcomeBanner.classList.remove("hidden");

      // Fade out μετά από 3 δευτερόλεπτα
      setTimeout(() => {
        welcomeBanner.classList.add("hidden");
      }, 3000);
    }

  } else {
    document.getElementById("authView").style.display = "block";
    // === Επιστροφή στο Auth View ===
    authView.classList.remove("hidden");
    appView.classList.add("hidden");
    appView.style.display = "none";
    logoutBtn.classList.add("hidden");
  }
});


document.getElementById("logoutBtn").addEventListener("click", async () => {
  await auth.signOut();
});
