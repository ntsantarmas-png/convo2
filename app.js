// ================================
//  CONVO CHATROOM — APP MODULE
// ================================

import {
  ref,
  onChildAdded,
  onValue,
  push,
  remove,
  get,
  set,
  update,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const messagesDiv = document.getElementById("messages");
const roomList = document.getElementById("roomList");
const userList = document.getElementById("userList");
const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");
const emojiBtn = document.getElementById("emojiBtn");
const emojiPanel = document.getElementById("emojiPanel");
const emojiContent = document.querySelector(".emojiContent");
const tabs = document.querySelectorAll(".tabs button");
let currentRoom = "general";
let currentUser = null;

// ============================================
// 1️⃣ AUTH STATE
// ============================================
onAuthStateChanged(auth, (user) => {
  if (!user) return;
  currentUser = user;
  loadRooms();
  loadUsers();
  switchRoom("general");
});

// ============================================
// 2️⃣ LOAD ROOMS
// ============================================
async function loadRooms() {
  roomList.innerHTML = "";
  const roomsRef = ref(db, "v3/rooms");
  onValue(roomsRef, (snapshot) => {
    roomList.innerHTML = "";
    if (!snapshot.exists()) return;
    snapshot.forEach((child) => {
      const roomName = child.key;
      const li = document.createElement("li");
      li.textContent = roomName;
      if (roomName === currentRoom) li.classList.add("activeRoom");
      li.addEventListener("click", () => switchRoom(roomName));
      roomList.appendChild(li);
    });
  });

  // Προεπιλεγμένα rooms αν δεν υπάρχουν
  const data = await get(roomsRef);
  if (!data.exists()) {
    await set(ref(db, "v3/rooms"), {
      general: true,
      music: true,
      random: true
    });
  }
}

// ============================================
// 3️⃣ SWITCH ROOM
// ============================================
async function switchRoom(room) {
  if (room === currentRoom) return;
  currentRoom = room;
  messagesDiv.innerHTML = "";
  const allRooms = document.querySelectorAll("#roomList li");
  allRooms.forEach((li) => li.classList.remove("activeRoom"));
  const activeLi = [...allRooms].find((li) => li.textContent === room);
  if (activeLi) activeLi.classList.add("activeRoom");

  loadMessages(room);
  systemMessage(`📢 You joined room: ${room}`);
}

// ============================================
// 4️⃣ LOAD MESSAGES (Realtime)
// ============================================
function loadMessages(room) {
  const msgRef = ref(db, "v3/messages/" + room);
  messagesDiv.innerHTML = "";

  onChildAdded(msgRef, (snapshot) => {
    const msg = snapshot.val();
    renderMessage(snapshot.key, msg);
  });
}

// ============================================
// 5️⃣ RENDER MESSAGE
// ============================================
function renderMessage(id, msg) {
  const div = document.createElement("div");
  div.classList.add("message");
  if (msg.system) div.classList.add("system");
  if (msg.role === "admin") div.classList.add("admin");

  div.dataset.id = id;
  div.innerHTML = `<span class="username">${msg.username}:</span> ${msg.text}`;

  // === Right-click delete (Admin only)
  div.addEventListener("contextmenu", async (e) => {
    e.preventDefault();
    if (currentUser?.displayName !== "MysteryMan") return;
    if (confirm("🗑️ Delete this message?")) {
      await remove(ref(db, "v3/messages/" + currentRoom + "/" + id));
      systemLog(`🧹 ${msg.username}'s message deleted by Admin`);
    }
  });

  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// ============================================
// 6️⃣ SEND MESSAGE
// ============================================
messageForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  if (!text) return;

  const msgRef = ref(db, "v3/messages/" + currentRoom);
  const userRef = ref(db, "v3/users/" + currentUser.uid);
  const snapshot = await get(userRef);
  const role = snapshot.exists() ? snapshot.val().role : "user";

  await push(msgRef, {
    uid: currentUser.uid,
    username: currentUser.displayName || "User",
    role,
    text,
    createdAt: serverTimestamp()
  });

  messageInput.value = "";
  messageInput.style.height = "40px";
});

// ============================================
// 7️⃣ AUTO-GROW INPUT
// ============================================
const baseHeight = 40;
const maxHeight = 80;
messageInput.addEventListener("input", () => {
  messageInput.style.height = baseHeight + "px";
  messageInput.style.height = Math.min(messageInput.scrollHeight, maxHeight) + "px";
});

// ============================================
// 8️⃣ SYSTEM MESSAGES
// ============================================
function systemMessage(text) {
  const div = document.createElement("div");
  div.className = "message system";
  div.textContent = text;
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

async function systemLog(entry) {
  const logRef = ref(db, "v3/adminLogs");
  await push(logRef, {
    text: entry,
    time: new Date().toLocaleString()
  });
}

// ============================================
// 9️⃣ USER LIST (Presence)
// ============================================
function loadUsers() {
  const usersRef = ref(db, "v3/users");
  onValue(usersRef, (snapshot) => {
    userList.innerHTML = "";
    snapshot.forEach((child) => {
      const u = child.val();
      const li = document.createElement("li");
      const statusDot =
        u.status === "online"
          ? "🟢"
          : u.status === "away"
          ? "🟡"
          : "🔴";

      li.innerHTML = `${statusDot} ${u.username}`;
      if (u.role === "admin") li.innerHTML += " 👑";
      if (u.role === "vip") li.innerHTML += " 💎";
      userList.appendChild(li);
    });
  });
}

// ============================================
// 🔟 EMOJI PANEL
// ============================================
const emojiSet = ["😀","😅","😂","🤣","😊","😍","😎","🤩","😘","🤔","😴","😡","👍","👎","👏","🔥","💯","🎉","❤️","✨"];
emojiContent.innerHTML = emojiSet.map(e => `<span>${e}</span>`).join("");

emojiContent.addEventListener("click", (e) => {
  if (e.target.tagName === "SPAN") {
    messageInput.value += e.target.textContent;
    emojiPanel.classList.add("hidden");
    messageInput.focus();
  }
});

emojiBtn.addEventListener("click", () => {
  emojiPanel.classList.toggle("hidden");
});

// close on click outside
document.addEventListener("click", (e) => {
  if (!emojiPanel.contains(e.target) && e.target !== emojiBtn) {
    emojiPanel.classList.add("hidden");
  }
});

// ============================================
// 1️⃣1️⃣  ROOM CREATION
// ============================================
const newRoomBtn = document.getElementById("newRoomBtn");
if (newRoomBtn) {
  newRoomBtn.addEventListener("click", async () => {
    const name = prompt("🏠 New room name:");
    if (!name) return;
    await set(ref(db, "v3/rooms/" + name), true);
    systemLog(`🆕 Room created: ${name}`);
  });
}

// ============================================
// 1️⃣2️⃣  SHORTCUTS (ENTER TO SEND)
// ============================================
messageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    messageForm.requestSubmit();
  }
});

// ============================================
// END APP MODULE
// ============================================
