// ===================== GIPHY CONFIG =====================
const GIPHY_KEY = "bCn5Jvx2ZOepneH6fMteNoX31hVfqX25";

// ===================== FIREBASE INIT =====================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, push, onChildAdded, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBEiZEcY54mFT7OnrfCv0t3sPo33DthcZ4",
  authDomain: "convo2-4a075.firebaseapp.com",
  databaseURL: "https://convo2-4a075-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "convo2-4a075",
  storageBucket: "convo2-4a075.firebasestorage.app",
  messagingSenderId: "543901633763",
  appId: "1:543901633763:web:2f91926e4c0c6ce11789d6"
};

export const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);


// === DEFAULT ROOM ===
let currentRoom = "general";
export { currentRoom };

// === TEST LOG ===
console.log("✅ Convo Firebase initialized");


// ===================== SEND MESSAGE (FINAL CLEAN FIX) =====================
const messageForm = document.getElementById("messageForm");
const input = document.getElementById("messageInput");

if (input) {
  // === ENTER to send, SHIFT+ENTER for newline ===
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      messageForm.requestSubmit();
    }
  });
}

if (messageForm) {
  messageForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const text = input.value.trim();
    if (!text) return;

    // 🧹 Καθάρισε άμεσα το input (πριν στείλει)
    input.value = "";
    input.style.height = "40px"; // 👈 επαναφορά στο αρχικό ύψος
    input.scrollTop = 0;


    const user = auth.currentUser;
    if (!user) {
      alert("⚠️ Not logged in!");
      return;
    }

    try {
      const roomPath = currentRoom || "general";

      await push(ref(db, "v3/messages/" + roomPath), {
        uid: user.uid,
  displayName: user.displayName || "Guest",
        text,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Message send error:", err);
    }
  });
}

// ===================== RENDER MESSAGES (STABLE v3) =====================
const messagesDiv = document.getElementById("messages");

onAuthStateChanged(auth, (user) => {
  if (!user || !messagesDiv) return;

  const msgRef = ref(db, "v3/messages/" + currentRoom);

  onChildAdded(msgRef, (snap) => {
    const msg = snap.val();
    const mine = msg.uid === user.uid;

    // === Bubble ===
    const bubble = document.createElement("div");
    bubble.className = mine ? "msg mine" : "msg";

    // === Username ===
    const name = document.createElement("div");
    name.className = "msg-user";
    name.textContent = msg.displayName || "Guest";

    // === Text ===
    const text = document.createElement("div");
    text.className = "msg-text";
    text.innerHTML = (msg.text || "")
      .replace(/\n/g, "<br>")
      .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>');

    // === Timestamp ===
    const time = document.createElement("div");
    time.className = "msg-time";
    const date = new Date(msg.createdAt || Date.now());
    time.textContent = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // === Assemble ===
    bubble.append(name, text, time);
    messagesDiv.appendChild(bubble);

    // === Auto scroll ===
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  });
});
// ===================== RENDER USER LIST (REALTIME) =====================
function renderUserList() {
  const usersList = document.getElementById("usersList");
  if (!usersList) return;

  // 📡 Άκου κάθε αλλαγή στο /users
  onValue(ref(db, "users"), (snap) => {
    usersList.innerHTML = "";

    snap.forEach((child) => {
      const u = child.val();
      if (!u) return;

      const li = document.createElement("li");

      // ✅ Εμφάνιση ονόματος (πραγματικό displayName)
      const displayName = u.displayName || "Guest";

      // 👑 Αν είναι MysteryMan → ειδικό σήμα
      li.textContent = displayName === "MysteryMan" ? "MysteryMan 👑" : displayName;

      usersList.appendChild(li);
    });
  });
}

// 🧠 Κάλεσέ την μετά το login
onAuthStateChanged(auth, (user) => {
  if (user) renderUserList();
});

// ===================== AUTO-GROW MESSAGE INPUT (DISCORD STYLE) =====================
const msgInput = document.getElementById("messageInput");
const baseHeight = 40;   // 1 γραμμή
const maxHeight = 120;   // περίπου 3 γραμμές

if (msgInput) {
  msgInput.style.height = baseHeight + "px";
  msgInput.style.overflowY = "auto"; // ενεργό scroll (αλλά αόρατο λόγω CSS)

msgInput.addEventListener("input", () => {
  msgInput.style.height = baseHeight + "px"; // πάντα ξεκινά από τη βάση
  const newHeight = Math.min(msgInput.scrollHeight, maxHeight);
  msgInput.style.height = newHeight + "px";
});


    // Αν περάσει το όριο, κρατά scroll ενεργό (χωρίς να φαίνεται)
    msgInput.scrollTop = msgInput.scrollHeight;
  

  // ✅ Μετά την αποστολή, καθάρισε & επανέφερε ύψος
  if (messageForm) {
    messageForm.addEventListener("submit", () => {
      msgInput.value = "";
      msgInput.style.height = baseHeight + "px";
      msgInput.scrollTop = 0;
    });
  }
}


// ===================== WELCOME BUBBLE =====================
function showWelcomeBubble(userName) {
  const bubble = document.getElementById("welcomeBubble");
  const nameSpan = document.getElementById("welcomeName");

  if (!bubble) return;

  nameSpan.textContent = userName || "Guest";
  bubble.classList.add("show");
  bubble.classList.remove("hidden");

  // Εξαφανίζεται μετά από 3 δευτερόλεπτα
  setTimeout(() => {
    bubble.classList.remove("show");
    bubble.classList.add("hidden");
  }, 3000);
}

// Κάλεσμα μετά το login
onAuthStateChanged(auth, (user) => {
  if (user) {
    showWelcomeBubble(user.displayName || "Guest");
  }
});


console.log("✅ Convo v3 base loaded");
