// ===================== APP.JS (Convo Reignite Base v1.8.0) =====================
// Core Chat Logic: Rooms, Messages, Presence, Giphy Integration
// ================================================================================
// ===================== GIPHY CONFIG =====================
const GIPHY_KEY = "bCn5Jvx2ZOepneH6fMteNoX31hVfqX25";


import {
  ref, onValue, push, set, update, serverTimestamp, onDisconnect
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-database.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";

// === DOM Elements ===
const roomsList = document.getElementById("roomsList");
const usersList = document.getElementById("usersList");
const messagesDiv = document.getElementById("messages");
const messageForm = document.getElementById("messageForm");
const msgInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const giphyBtn = document.getElementById("giphyBtn");

let currentRoom = "general"; // default room
let lastMessageId = null;    // anti-duplicate guard

// ============================================================================
//  1️⃣ ON AUTH STATE
// ============================================================================
onAuthStateChanged(window.auth, (user) => {
  if (!user) return;
  renderRooms();
  renderUserList();
  renderMessages(currentRoom);
  setupPresence(user);
});

// ============================================================================
//  2️⃣ RENDER ROOMS
// ============================================================================
function renderRooms() {
  const defaultRooms = ["general", "lounge", "music"];
  roomsList.innerHTML = "";
  defaultRooms.forEach(room => {
    const li = document.createElement("li");
    li.textContent = "#" + room;
    li.className = (room === currentRoom) ? "active" : "";
    li.addEventListener("click", () => switchRoom(room));
    roomsList.appendChild(li);
  });
}

// ============================================================================
//  3️⃣ SWITCH ROOM
// ============================================================================
function switchRoom(room) {
  if (room === currentRoom) return;
  currentRoom = room;
  renderRooms();
  messagesDiv.innerHTML = "";
  renderMessages(room);
  console.log("🔁 Switched to room:", room);
}

// ============================================================================
//  4️⃣ RENDER MESSAGES (Convo Glow Bubble Layout v1.1)
// ============================================================================
function renderMessages(room) {
  const msgsRef = ref(window.db, "v3/messages/" + room);
  onValue(msgsRef, (snap) => {
    messagesDiv.innerHTML = "";

    const user = window.auth.currentUser;

    snap.forEach((child) => {
      const msg = child.val();

      // === Main bubble ===
      const div = document.createElement("div");
      const isSelf = user && msg.uid === user.uid;
      div.className = "message " + (isSelf ? "self" : "other");

      // === Username ===
      const userSpan = document.createElement("span");
      userSpan.className = "msgUser";
      userSpan.textContent = msg.username || "User";

      // === Text ===
      const textSpan = document.createElement("span");
      textSpan.className = "msgText";
      textSpan.textContent = msg.text || "";

      // === Timestamp (time + date) ===
      const timeSpan = document.createElement("span");
      timeSpan.className = "msgTime";

      if (msg.createdAt) {
        const d = new Date(msg.createdAt);
        const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        const dateStr = d.toLocaleDateString([], { day: "2-digit", month: "2-digit", year: "2-digit" });
        timeSpan.textContent = `${timeStr} · ${dateStr}`;
      }

      // === Append all ===
      div.append(userSpan, textSpan, timeSpan);
      messagesDiv.appendChild(div);
    });

    // Auto-scroll to latest
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  });
}

// ============================================================================
//  5️⃣ SEND MESSAGE (anti-duplicate)
// ============================================================================
if (messageForm) {
  messageForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = msgInput.value.trim();
    const user = window.auth.currentUser;
    if (!text || !user) return;

    const msgRef = ref(window.db, "v3/messages/" + currentRoom);
    const newMsg = {
      uid: user.uid,
      username: user.displayName || "Guest",
      text,
      createdAt: serverTimestamp()
    };

    // Guard against accidental double submit
    if (text === lastMessageId) return;
    lastMessageId = text;

    await push(msgRef, newMsg);
    msgInput.value = "";
    msgInput.focus();
  });
}

// ============================================================================
//  6️⃣ PRESENCE (online indicator)
// ============================================================================
function setupPresence(user) {
  const userRef = ref(window.db, "users/" + user.uid);
  const connectedRef = ref(window.db, ".info/connected");

  onValue(connectedRef, (snap) => {
    if (snap.val() === false) return;
    onDisconnect(userRef).update({ online: false });
    update(userRef, { online: true });
  });
}

// ============================================================================
//  7️⃣ RENDER USER LIST
// ============================================================================
function renderUserList() {
  const usersRef = ref(window.db, "users");
  onValue(usersRef, (snap) => {
    usersList.innerHTML = "";
    snap.forEach(child => {
      const u = child.val();
      const li = document.createElement("li");
      li.textContent = u.displayName || "User";
      if (u.online) li.classList.add("online");
      usersList.appendChild(li);
    });
  });
}

// ============================================================================
//  8️⃣ GIPHY SEARCH + SEND
// ============================================================================
if (giphyBtn) {
  giphyBtn.addEventListener("click", async () => {
const query = await convoPrompt("🔍 Αναζήτησε GIF", "Πληκτρολόγησε λέξη...");

    if (!query) return;


    const apiKey = GIPHY_KEY; // ✅ το δικό σου key εδώ
    const res = await fetch(
      `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(query)}&limit=1`
    );
    const data = await res.json();
    const gifUrl = data.data[0]?.images?.downsized_medium?.url;
    if (!gifUrl) return alert("❌ Δεν βρέθηκε GIF!");

    const user = window.auth.currentUser;
    if (!user) return;

    await push(ref(window.db, "v3/messages/" + currentRoom), {
      uid: user.uid,
      username: user.displayName || "Guest",
      text: gifUrl,
      isGif: true,
      createdAt: serverTimestamp()
    });
  });
}
// ===================== CONVO MODAL SYSTEM (v1.8.3) =====================
// replaces default alert(), confirm(), prompt() with custom Convo UI modals

function convoAlert(message, title = "Ειδοποίηση") {
  return new Promise((resolve) => {
    const modal = document.getElementById("convoModal");
    const titleEl = document.getElementById("convoModalTitle");
    const msgEl = document.getElementById("convoModalMsg");
    const inputBox = document.getElementById("convoModalInputBox");
    const okBtn = document.getElementById("convoModalOk");
    const cancelBtn = document.getElementById("convoModalCancel");

    titleEl.textContent = title;
    msgEl.textContent = message;
    inputBox.classList.add("hidden");
    cancelBtn.classList.add("hidden");
    modal.classList.remove("hidden");

    okBtn.onclick = () => {
      modal.classList.add("hidden");
      cancelBtn.classList.remove("hidden");
      resolve(true);
    };
  });
}

function convoConfirm(message, title = "Επιβεβαίωση") {
  return new Promise((resolve) => {
    const modal = document.getElementById("convoModal");
    const titleEl = document.getElementById("convoModalTitle");
    const msgEl = document.getElementById("convoModalMsg");
    const inputBox = document.getElementById("convoModalInputBox");
    const okBtn = document.getElementById("convoModalOk");
    const cancelBtn = document.getElementById("convoModalCancel");

    titleEl.textContent = title;
    msgEl.textContent = message;
    inputBox.classList.add("hidden");
    cancelBtn.classList.remove("hidden");
    modal.classList.remove("hidden");

    okBtn.onclick = () => {
      modal.classList.add("hidden");
      resolve(true);
    };
    cancelBtn.onclick = () => {
      modal.classList.add("hidden");
      resolve(false);
    };
  });
}

function convoPrompt(title = "Εισαγωγή", placeholder = "") {
  return new Promise((resolve) => {
    const modal = document.getElementById("convoModal");
    const titleEl = document.getElementById("convoModalTitle");
    const msgEl = document.getElementById("convoModalMsg");
    const inputBox = document.getElementById("convoModalInputBox");
    const inputEl = document.getElementById("convoModalInput");
    const okBtn = document.getElementById("convoModalOk");
    const cancelBtn = document.getElementById("convoModalCancel");

    titleEl.textContent = title;
    msgEl.textContent = "";
    inputBox.classList.remove("hidden");
    inputEl.placeholder = placeholder;
    inputEl.value = "";
    cancelBtn.classList.remove("hidden");
    modal.classList.remove("hidden");
    inputEl.focus();

    okBtn.onclick = () => {
      modal.classList.add("hidden");
      resolve(inputEl.value.trim());
    };
    cancelBtn.onclick = () => {
      modal.classList.add("hidden");
      resolve(null);
    };
  });
}

// ✅ Override native popups globally
window.alert = (msg) => convoAlert(msg);
window.confirm = (msg) => convoConfirm(msg);
window.prompt = (msg, placeholder = "") => convoPrompt(msg, placeholder);
