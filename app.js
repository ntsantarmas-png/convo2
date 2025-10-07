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

// ===================== SEND MESSAGE (FINAL CLEAN FIX) =====================
const messageForm = document.getElementById("messageForm");
const input = document.getElementById("messageInput");

if (input) {
  // === ENTER to send, SHIFT+ENTER for newline ===
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault(); // Μην κάνει newline
      messageForm.requestSubmit(); // Στείλε το μήνυμα
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

    try {
      // ✅ fallback σε "general" αν το currentRoom είναι null
      const roomPath = currentRoom || "general";

      await push(ref(db, "v3/messages/" + roomPath), {
        uid: user.uid,
        user: user.displayName || "Guest",
        text,
        createdAt: serverTimestamp(),
      });

      // ✅ Καθαρισμός input (σταθερός σε όλους τους browsers)
      input.value = "";
      input.style.height = "auto";
      input.scrollTop = 0;

      // 👇 Extra fix για Chrome/Linux bug (buffer flush + re-render)
      setTimeout(() => {
        input.value = "";
        input.dispatchEvent(new Event("input"));
        input.blur();       // αναγκάζει re-render
        input.focus();      // επαναφέρει focus για συνεχή πληκτρολόγηση
      }, 50);
    } catch (err) {
      console.error("Message send error:", err);
    }
  });
}

// ===================== AUTO-GROW MESSAGE INPUT (SAFE VERSION) =====================
const msgInput = document.getElementById("messageInput");

if (msgInput) {
  msgInput.addEventListener("input", () => {
    if (!msgInput.value.trim()) {
      // Αν είναι κενό, επαναφορά πλήρης
      msgInput.style.height = "auto";
      return;
    }
    msgInput.style.height = "auto";
    msgInput.style.height = msgInput.scrollHeight + "px";
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
