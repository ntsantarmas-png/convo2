
import { auth, db } from "./auth.js";
import { ref, push, onValue, get, update } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-database.js";

// ===================== GLOBALS =====================
let currentRoom = "general";
const messagesDiv = document.getElementById("messages");

// ===================== ROOMS =====================
const roomsList = document.getElementById("roomsList");
const createRoomBtn = document.getElementById("createRoomBtn");

function loadRooms() {
  onValue(ref(db, "rooms"), (snap) => {
    roomsList.innerHTML = "";
    snap.forEach(child => {
      const name = child.key;
      const li = document.createElement("li");
      li.textContent = name;
      li.className = "room-item";
      li.onclick = () => switchRoom(name);
      roomsList.appendChild(li);
    });
  });
}

createRoomBtn.onclick = async () => {
  const roomName = prompt("Όνομα νέου room:");
  if (roomName) {
    await update(ref(db, "rooms/" + roomName), { createdAt: Date.now() });
  }
};

// ===================== SWITCH ROOM =====================
function switchRoom(name) {
  currentRoom = name;
  messagesDiv.innerHTML = "";
  loadMessages();
}

// ===================== LOAD MESSAGES =====================
function loadMessages() {
  onValue(ref(db, "messages/" + currentRoom), (snap) => {
    messagesDiv.innerHTML = "";
    snap.forEach(child => renderMessage(child.val()));
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  });
}

// ===================== RENDER MESSAGE =====================
function renderMessage(msg) {
  const div = document.createElement("div");
  div.className = "msg";

  const name = document.createElement("div");
  name.className = "msg-name";
  name.textContent = msg.displayName || "Unknown";

  const bubble = document.createElement("div");
  bubble.className = "msg-bubble";
  bubble.textContent = msg.text;

  const time = document.createElement("span");
  time.className = "msg-time";
  time.textContent = msg.time || "";

  bubble.appendChild(time);
  div.appendChild(name);
  div.appendChild(bubble);
  messagesDiv.appendChild(div);
}

// ===================== SEND MESSAGE =====================
const form = document.getElementById("messageForm");
const input = document.getElementById("messageInput");

if (input) {
  const baseHeight = 40;
  const maxHeight = 90;
  input.style.height = baseHeight + "px";
  input.addEventListener("input", () => {
    input.style.height = baseHeight + "px";
    input.style.height = Math.min(input.scrollHeight, maxHeight) + "px";
    input.style.overflowY = input.scrollHeight > maxHeight ? "auto" : "hidden";
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      form.requestSubmit();
    }
  });
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;

  const user = auth.currentUser;
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  await push(ref(db, "messages/" + currentRoom), {
    uid: user.uid,
    displayName: user.displayName,
    text,
    time: timeStr
  });

  input.value = "";
  input.style.height = baseHeight + "px";
});

// ===================== USERS LIST =====================
function loadUsers() {
  const adminsList = document.getElementById("adminsList");
  const vipsList = document.getElementById("vipsList");
  const usersList = document.getElementById("usersList");

  onValue(ref(db, "users"), (snap) => {
    adminsList.innerHTML = "";
    vipsList.innerHTML = "";
    usersList.innerHTML = "";

    snap.forEach(child => {
      const u = child.val();
      const li = document.createElement("li");
      li.textContent = u.displayName;
      li.className = "user-item";
      li.oncontextmenu = (e) => {
        e.preventDefault();
        alert("Δεξί κλικ σε " + u.displayName + " — εδώ θα μπει μενού");
      };

      if (u.role === "admin") adminsList.appendChild(li);
      else if (u.role === "vip") vipsList.appendChild(li);
      else usersList.appendChild(li);
    });
  });
}

// ===================== INIT =====================
loadRooms();
loadMessages();
loadUsers();
