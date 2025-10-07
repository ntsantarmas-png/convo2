// ===================== GIPHY CONFIG =====================
const GIPHY_KEY = "bCn5Jvx2ZOepneH6fMteNoX31hVfqX25";
// ===================== FIREBASE INIT =====================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, push, onChildAdded, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// === CONFIG ===
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

let currentRoom = "general";

// ===================== SEND MESSAGE =====================
const messageForm = document.getElementById("messageForm");
const input = document.getElementById("messageInput");

if (input) {
  // === ENTER to send, SHIFT+ENTER for newline ===
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault(); // Μην κάνει newline
      document.getElementById("messageForm").requestSubmit(); // Στείλε το μήνυμα
    }
  });
}

if (messageForm) {
  messageForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const text = input.value.trim();
    
    if (!text) return;

    const user = auth.currentUser;
    if (!user) {
      alert("⚠️ Not logged in!");
      return;
    }

    await push(ref(db, "v3/messages/" + currentRoom), {
      uid: user.uid,
      user: user.displayName || "Guest",
      text,
      createdAt: serverTimestamp()
    });

    // === Καθάρισε input και κράτα focus ===
    input.value = "";
    input.style.height = "auto"; // 👈 Εδώ είναι το σωστό σημείο
    input.focus();
  });
}
// ===================== AUTO-GROW MESSAGE INPUT =====================
const msgInput = document.getElementById("messageInput");

if (msgInput) {
  msgInput.addEventListener("input", () => {
    msgInput.style.height = "auto";                // επαναφορά
    msgInput.style.height = msgInput.scrollHeight + "px"; // μεγαλώνει ανάλογα
  });
}


// ===================== RENDER MESSAGES =====================
const messagesDiv = document.getElementById("messages");
onAuthStateChanged(auth, (user) => {
  if (!user) return;
  const msgRef = ref(db, "v3/messages/" + currentRoom);
  onChildAdded(msgRef, (snap) => {
    const msg = snap.val();
    const div = document.createElement("div");
    div.className = "message";
    div.textContent = `${msg.user}: ${msg.text}`;
    messagesDiv.appendChild(div);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  });
});

console.log("✅ Convo v3 base loaded");
