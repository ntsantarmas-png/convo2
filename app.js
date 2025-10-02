// ===================== APP.JS =====================

// === Firebase Imports & Config ===
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import { 
  getAuth, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import { 
  getDatabase, ref, get, set, child, onValue, push, serverTimestamp, onDisconnect, update, off
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

    onDisconnect(userRef).set({
      uid: user.uid,
      displayName: user.displayName || "Guest",
      online: false
    });

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

  // ✅ Καθαρίζουμε τυχόν παλιούς listeners πριν βάλουμε καινούργιο
  const roomsRef = ref(db, "rooms");
  off(roomsRef);

  // Real-time rooms list
  onValue(roomsRef, (snap) => {
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

// Νέο room button
const newRoomBtn = document.getElementById("newRoomBtn");
if (newRoomBtn) {
  newRoomBtn.addEventListener("click", async () => {
    const name = prompt("Enter room name:");
    if (!name) return;

    const roomRef = ref(db, "rooms/" + name);
    const snap = await get(roomRef);
    if (snap.exists()) {
      alert("⚠️ Το room υπάρχει ήδη!");
      return;
    }

    await set(roomRef, {
      name,
      createdAt: Date.now()
    });
  });
}

// ===================== CHAT =====================
let currentRoom = "general";

// 👇 Indicator reference (κρατάμε το element για μελλοντική χρήση)
const newMessagesIndicator = document.getElementById("newMessagesIndicator");

// Κάνε το clickable -> πάει στο τέλος (θα δουλέψει μόνο manual)
if (newMessagesIndicator) {
  newMessagesIndicator.addEventListener("click", () => {
    const messagesDiv = document.getElementById("messages");
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    newMessagesIndicator.classList.add("hidden");
  });
}

function switchRoom(room) {
  currentRoom = room;
  document.getElementById("roomTitle").textContent = "#" + room;
  renderMessages(room);
}

function renderMessages(room) {
  const messagesRef = ref(db, "messages/" + room);
  const messagesDiv = document.getElementById("messages");
  messagesDiv.innerHTML = "";

  // ✅ Καθαρίζουμε τυχόν παλιούς listeners
  off(messagesRef);

  onValue(messagesRef, (snap) => {
    messagesDiv.innerHTML = "";

    snap.forEach(childSnap => {
      const msg = childSnap.val();

      // === Container ===
      const messageDiv = document.createElement("div");
      messageDiv.className = "message";

      // Αν είναι το δικό μου uid -> βάλε class "mine"
      if (msg.uid && auth.currentUser && msg.uid === auth.currentUser.uid) {
        messageDiv.classList.add("mine");
      }

      // === Avatar ===
      const avatarDiv = document.createElement("div");
      avatarDiv.className = "message-avatar";

      const img = document.createElement("img");
      img.src = msg.photoURL || "https://i.pravatar.cc/150?u=" + (msg.uid || msg.user);
      img.alt = "avatar";
      avatarDiv.appendChild(img);

      // === Content ===
      const contentDiv = document.createElement("div");
      contentDiv.className = "message-content";

      // Username
      const userDiv = document.createElement("div");
      userDiv.className = "message-user";
      userDiv.textContent = msg.user || "Anon";

      // Bubble
      const bubbleDiv = document.createElement("div");
      bubbleDiv.className = "message-bubble";
      bubbleDiv.textContent = msg.text;

      contentDiv.appendChild(userDiv);
      contentDiv.appendChild(bubbleDiv);

      // Put together
      messageDiv.appendChild(avatarDiv);
      messageDiv.appendChild(contentDiv);

      messagesDiv.appendChild(messageDiv);
    });

    // 👇 Πάντα scroll στο τέλος όταν φορτώνει / αλλάζει room
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  });
}


// === Message form ===
const messageForm = document.getElementById("messageForm");
if (messageForm) {
  messageForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = document.getElementById("messageInput");
    const text = input.value.trim();
    if (!text) return;

    const user = auth.currentUser;
    await push(ref(db, "messages/" + currentRoom), {
      uid: user?.uid,
      user: user?.displayName || "Guest",
      text,
      createdAt: serverTimestamp()
    });

    input.value = "";
    input.focus(); // 👈 συνεχίζεις να γράφεις αμέσως
  });
}
// ===================== MEDIA PANEL (Emoji / GIFs / Stickers) =====================
const emojiBtn = document.getElementById("emojiBtn");
const mediaPanel = document.getElementById("mediaPanel");

if (emojiBtn && mediaPanel) {
  // Toggle open/close
  emojiBtn.addEventListener("click", () => {
    mediaPanel.classList.toggle("hidden");
  });

  // Κλείσιμο με click έξω
  document.addEventListener("click", (e) => {
    if (!mediaPanel.contains(e.target) && e.target !== emojiBtn) {
      mediaPanel.classList.add("hidden");
    }
  });

  // Κλείσιμο με ESC
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      mediaPanel.classList.add("hidden");
    }
  });

  // Tabs logic
  const tabButtons = mediaPanel.querySelectorAll(".media-tabs button");
  const tabs = mediaPanel.querySelectorAll(".tab");

  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      // Reset
      tabButtons.forEach(b => b.classList.remove("active"));
      tabs.forEach(t => t.classList.remove("active"));

      // Activate
      btn.classList.add("active");
      const tabId = "tab-" + btn.dataset.tab;
      document.getElementById(tabId).classList.add("active");
    });
  });
}

// ===================== RENDER USER LIST =====================
function renderUserList() {
  const usersList = document.getElementById("usersList");
  if (!usersList) return;

  onValue(ref(db, "users"), (snap) => {
    usersList.innerHTML = "";

    // Κατηγορίες
    const admins = [], vips = [], normal = [], guests = [];

    snap.forEach(childSnap => {
      const u = childSnap.val();

      if (u.role === "admin") {
        admins.push(u);
      } else if (u.role === "vip") {
        vips.push(u);
      } else if (u.isAnonymous) {
        guests.push(u);
      } else {
        normal.push(u);
      }
    });

    // Helper function για κατηγορία
    function renderCategory(title, arr, cssClass) {
      if (arr.length === 0) return;

      const header = document.createElement("li");
      header.textContent = title;
      header.className = "user-category " + cssClass; // 👈 τώρα παίρνει class ανά ρόλο
      usersList.appendChild(header);

      // Users της κατηγορίας
      arr.forEach(u => {
        const li = document.createElement("li");

        // === Avatar ===
        const avatarDiv = document.createElement("div");
        avatarDiv.className = "user-avatar";

        const img = document.createElement("img");
        img.src = u.photoURL || "https://i.pravatar.cc/150?u=" + u.uid;
        img.alt = "avatar";
        img.style.border = u.online
          ? "2px solid limegreen"
          : "2px solid gray";

        avatarDiv.appendChild(img);

        // === Username ===
        const nameSpan = document.createElement("span");
        nameSpan.textContent = u.displayName || "Guest";

        li.appendChild(avatarDiv);
        li.appendChild(nameSpan);

        usersList.appendChild(li);
      });
    }

    // Render με σειρά + class
    renderCategory("Admins", admins, "admin");
    renderCategory("VIP", vips, "vip");
    renderCategory("Users", normal, "user");
    renderCategory("Guests", guests, "guest");
  });
}

console.log("✅ app.js loaded");
