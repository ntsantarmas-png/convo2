// ===================== APP.JS =====================

// === Firebase Imports & Config ===
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
  getAuth, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
  getDatabase, ref, get, set, child, onValue, push, serverTimestamp, onDisconnect, update 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// 👉 Firebase Config από το Convo2 project
const firebaseConfig = {
  apiKey: "AIzaSyBEiZEcY54mFT7OnrfCv0t3sPo33DthcZ4",
  authDomain: "convo2-4a075.firebaseapp.com",
  projectId: "convo2-4a075",
  storageBucket: "convo2-4a075.appspot.com",
  messagingSenderId: "543901633763",
  appId: "1:543901633763:web:2f91926e4c0c6ce11789d6",
  databaseURL: "https://convo2-4a075-default-rtdb.europe-west1.firebasedatabase.app"
};

// === Initialize Firebase ===
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// ===================== AUTH STATE HANDLING =====================
const authView = document.getElementById("auth");
const appView = document.getElementById("app");

onAuthStateChanged(auth, (user) => {
  if (user) {
    // ✅ Logged in
    authView.classList.add("hidden");
    appView.classList.remove("hidden");

    // === Extra: Presence + Rooms + Users + Messages ===
    setupPresence(user);
    renderRooms();
    renderUserList();
    switchRoom("general");
  } else {
    // ❌ Not logged in
    authView.classList.remove("hidden");
    appView.classList.add("hidden");
  }
});

// ===================== PRESENCE =====================
function setupPresence(user) {
  const userRef = ref(db, "users/" + user.uid);
  const presenceRef = ref(db, ".info/connected");

  onValue(presenceRef, (snap) => {
    if (snap.val() === false) return;

    onDisconnect(userRef).update({ online: false });
    update(userRef, {
      uid: user.uid,
      displayName: user.displayName || "Guest",
      online: true
    });
  });
}

// ===================== ROOMS =====================
const defaultRooms = ["general", "random"];

async function renderRooms() {
  const roomsList = document.getElementById("roomsList");
  if (!roomsList) return;

  roomsList.innerHTML = "";

  // Σιγουρευόμαστε ότι υπάρχουν τα default rooms
  await Promise.all(defaultRooms.map(async (roomName) => {
    const snap = await get(child(ref(db), `rooms/${roomName}`));
    if (!snap.exists()) {
      await set(ref(db, `rooms/${roomName}`), {
        name: roomName,
        createdAt: Date.now()
      });
    }
  }));

  // Real-time rooms list
  onValue(ref(db, "rooms"), (snap) => {
    roomsList.innerHTML = "";
    snap.forEach(childSnap => {
      const r = childSnap.val();
      const li = document.createElement("li");
      li.textContent = "#" + r.name;
      li.addEventListener("click", () => switchRoom(r.name));
      roomsList.appendChild(li);
    });
  });
}

const newRoomBtn = document.getElementById("newRoomBtn");
if (newRoomBtn) {
  newRoomBtn.addEventListener("click", async () => {
    const name = prompt("Enter room name:");
    if (!name) return;
    await set(ref(db, "rooms/" + name), {
      name,
      createdAt: Date.now()
    });
  });
}

// ===================== CHAT =====================
let currentRoom = "general";

function switchRoom(room) {
  currentRoom = room;
  document.getElementById("roomTitle").textContent = "#" + room;
  renderMessages(room);
}

function renderMessages(room) {
  const messagesRef = ref(db, "messages/" + room);
  const messagesDiv = document.getElementById("messages");
  messagesDiv.innerHTML = "";

  onValue(messagesRef, (snap) => {
    messagesDiv.innerHTML = "";
    snap.forEach(childSnap => {
      const msg = childSnap.val();
      const p = document.createElement("p");
      p.textContent = (msg.user || "Anon") + ": " + msg.text;
      messagesDiv.appendChild(p);
    });
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  });
}

const messageForm = document.getElementById("messageForm");
if (messageForm) {
  messageForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = document.getElementById("messageInput");
    const text = input.value.trim();
    if (!text) return;

    const user = auth.currentUser;
    await push(ref(db, "messages/" + currentRoom), {
      user: user?.displayName || "Guest",
      text,
      createdAt: serverTimestamp()
    });

    input.value = "";
  });
}

// ===================== USER LIST =====================
function renderUserList() {
  const usersList = document.getElementById("usersList");
  if (!usersList) return;

  onValue(ref(db, "users"), (snap) => {
    usersList.innerHTML = "";
    snap.forEach(childSnap => {
      const u = childSnap.val();
      const li = document.createElement("li");
      li.textContent = u.displayName || "Guest";
      li.style.color = u.online ? "lime" : "gray";
      usersList.appendChild(li);
    });
  });
}

console.log("✅ app.js loaded");
