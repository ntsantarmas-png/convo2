// ===================== APP.JS =====================
// ===================== GIPHY CONFIG =====================
const GIPHY_KEY = "bCn5Jvx2ZOepneH6fMteNoX31hVfqX25";
// === Firebase Imports & Config ===
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import { 
  getAuth, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import { 
  getDatabase, ref, get, set, child, onValue, push, serverTimestamp, onDisconnect, update, off, remove
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
    if (!snap.val()) return;

    onDisconnect(userRef).update({
      online: false,
      lastSeen: Date.now()
    });

    // Μόνο presence info
  update(userRef, {
  uid: user.uid,
  displayName: user.displayName || "User" + Math.floor(Math.random() * 10000),
  photoURL: user.photoURL || null,
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
// ===================== TOGGLE ROOMS PANEL =====================
const toggleRoomsBtn = document.getElementById("toggleRoomsBtn");
const roomsPanel = document.getElementById("roomsPanel");

if (toggleRoomsBtn && roomsPanel) {
  toggleRoomsBtn.addEventListener("click", () => {
    roomsPanel.classList.toggle("collapsed");
  });
}
// ===================== TOGGLE USERS PANEL =====================
const toggleUsersBtn = document.getElementById("toggleUsersBtn");
const usersPanel = document.getElementById("usersPanel");

if (toggleUsersBtn && usersPanel) {
  toggleUsersBtn.addEventListener("click", () => {
    usersPanel.classList.toggle("collapsed");
  });
}


// ===================== CHAT =====================
let currentRoom = "general";
// Typing indicator reference
let typingRef;
let typingTimeout;

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
  watchTyping(room); // 👈 εδώ μπαίνει η σύνδεση
}
function watchTyping(room) {
  const typingDiv = document.getElementById("typingIndicator");
  const roomTypingRef = ref(db, `typing/${room}`);

  onValue(roomTypingRef, (snap) => {
    const typers = [];
    snap.forEach(child => {
      const t = child.val();
      if (t.typing) typers.push(t.name);
    });

    if (typers.length > 0) {
      typingDiv.textContent =
        typers.length === 1
          ? `${typers[0]} is typing...`
          : `${typers.join(", ")} are typing...`;
      typingDiv.classList.remove("hidden");
    } else {
      typingDiv.classList.add("hidden");
    }
  });
}

// === Helper: check if message is only emoji ===
function isEmojiOnly(text) {
  // Regex που πιάνει emoji (πιο απλό και safe)
  const emojiRegex = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu;
  const matches = text.match(emojiRegex);

  if (!matches) return false;

  // Trim για να βγάλουμε τυχόν κενά
  const stripped = text.trim();

  // Ελέγχουμε ότι όλο το string είναι μόνο emoji
  return matches.join('') === stripped;
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
const msgId = childSnap.key; // 👈 Firebase key για delete
// === Container ===
const messageDiv = document.createElement("div");
messageDiv.className = "message";
messageDiv.dataset.id = msgId; // 👈 αποθηκεύουμε το ID

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

// Username (πάνω από το bubble)
const userDiv = document.createElement("div");
userDiv.className = "message-user";
userDiv.textContent = msg.user || "Anon";
contentDiv.appendChild(userDiv);   // 👈 εδώ το προσθέτουμε στο contentDiv

// Bubble (μόνο το μήνυμα + ώρα)
if (msg.text) {
  const bubbleDiv = document.createElement("div");
  bubbleDiv.className = "message-bubble";

  // Γραμμή 1: Text
  const line1 = document.createElement("div");
  line1.className = "msg-line1";
  line1.textContent = msg.text;

  // ✅ Emoji-only check
  if (isEmojiOnly(msg.text)) {
    const emojiCount = msg.text.match(/\p{Extended_Pictographic}/gu).length;
    line1.classList.add("emoji-only");
    if (emojiCount <= 2) {
      line1.classList.add("big");
    }
  }

  // Γραμμή 2: Date + Time
  const line2 = document.createElement("div");
  line2.className = "msg-line2";
  if (msg.createdAt) {
    const date = new Date(msg.createdAt);
    line2.textContent =
      date.toLocaleDateString() +
      " - " +
      date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  bubbleDiv.appendChild(line1);
  bubbleDiv.appendChild(line2);
  contentDiv.appendChild(bubbleDiv);
}


// GIF
if (msg.gif) {
  const gifEl = document.createElement("img");
  gifEl.src = msg.gif;
  gifEl.alt = "GIF";
  gifEl.className = "chat-gif"; // 👈 θα το στυλάρουμε στο CSS
  contentDiv.appendChild(gifEl);
}
// STICKER
if (msg.sticker) {
  const stickerEl = document.createElement("img");
  stickerEl.src = msg.sticker;
  stickerEl.alt = "Sticker";
  stickerEl.className = "chat-sticker";
  contentDiv.appendChild(stickerEl);
}


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

    
// 👉 Κλείσε το emoji panel ΜΟΝΟ μετά την αποστολή
closeEmojiPanel();

    input.value = "";
input.style.height = "40px"; // 👈 reset στο default ύψος
input.focus(); 

  });
}
// ===================== ADMIN CONTEXT MENU =====================
const contextMenu = document.getElementById("contextMenu");
const deleteBtn = document.getElementById("deleteMessageBtn");
const clearChatBtn = document.getElementById("clearChatBtn");

if (clearChatBtn) {
  clearChatBtn.addEventListener("click", async () => {
    try {
      await remove(ref(db, "messages/" + currentRoom));
      console.log("✅ Chat cleared in room:", currentRoom);
    } catch (err) {
      console.error("❌ Clear chat failed:", err);
    }

    // Κλείσε το menu
    contextMenu.classList.add("hidden");
  });
}

let targetMessageId = null; // αποθηκεύουμε ποιο μήνυμα έγινε δεξί κλικ

// Δεξί κλικ πάνω σε μήνυμα
document.getElementById("messages").addEventListener("contextmenu", (e) => {
  e.preventDefault();

  const messageDiv = e.target.closest(".message");
  if (!messageDiv) return;

  // ✅ Εμφανίζει το menu μόνο αν είμαι admin
  const currentUser = auth.currentUser;
  if (!currentUser) return;

  // check στο DB role
  const userRef = ref(db, "users/" + currentUser.uid);
  get(userRef).then((snap) => {
    const u = snap.val();
    if (!u || u.role !== "admin") return;

    targetMessageId = messageDiv.dataset.id;

    // Τοποθέτηση του menu στη θέση του κλικ
    contextMenu.style.top = e.pageY + "px";
    contextMenu.style.left = e.pageX + "px";
    contextMenu.classList.remove("hidden");
  });
});

// Κλείσιμο με κλικ έξω
document.addEventListener("click", () => {
  contextMenu.classList.add("hidden");
});

// Κλικ στο Delete
if (deleteBtn) {
  deleteBtn.addEventListener("click", async () => {
    if (!targetMessageId) return;

    try {
      await remove(ref(db, "messages/" + currentRoom + "/" + targetMessageId));
      console.log("✅ Message deleted:", targetMessageId);
    } catch (err) {
      console.error("❌ Delete failed:", err);
    }

    // Κλείσε το menu
    contextMenu.classList.add("hidden");
    targetMessageId = null;
  });
}

// ===================== ENTER / SHIFT+ENTER =====================
const messageInput = document.getElementById("messageInput");

if (messageInput) {
  messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault(); 
      messageForm.requestSubmit(); // 👈 στέλνει το μήνυμα
    }
    // αν είναι Shift+Enter → αφήνουμε το default (νέα γραμμή)
  });

  // ===================== TYPING =====================
  messageInput.addEventListener("input", () => {
    typingRef = ref(db, `typing/${currentRoom}/${auth.currentUser.uid}`);
    set(typingRef, {
      uid: auth.currentUser.uid,
      name: auth.currentUser.displayName || "Anonymous",
      typing: true
    });

    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      set(typingRef, { typing: false });
    }, 3000);
  });
}

// ===================== AUTO-GROW TEXTAREA =====================
if (messageInput) {
  messageInput.addEventListener("input", () => {
    messageInput.style.height = "auto"; // reset
    messageInput.style.height = messageInput.scrollHeight + "px"; // προσαρμογή στο περιεχόμενο
  });
}


// ===================== SEND GIF MESSAGE =====================
function sendGifMessage(url) {
  const user = auth.currentUser;
  if (!user) return;

  push(ref(db, "messages/" + currentRoom), {
    uid: user.uid,
    user: user.displayName || "Guest",
    gif: url,  // 👈 αποθηκεύουμε το URL του GIF
    createdAt: serverTimestamp()
  });
}

// ===================== MEDIA PANEL (Emoji / GIFs / Stickers) =====================
const emojiBtn = document.getElementById("emojiBtn");
const mediaPanel = document.getElementById("mediaPanel");

function closeEmojiPanel() {
  if (mediaPanel) {
    mediaPanel.classList.add("hidden");
  }
}

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
// ===================== EMOJI PICKER =====================
document.querySelectorAll("#tab-emoji .emoji-grid span").forEach(span => {
  span.addEventListener("click", () => {
    const input = document.getElementById("messageInput");
    input.value += span.textContent;  // 👈 προσθέτει το emoji στο input
    input.focus();

    // Κλείσιμο panel μετά το click

  });
});

// ===================== GIF SEARCH =====================
const gifSearchInput = document.getElementById("gifSearchInput");
const gifResults = document.getElementById("gifResults");

if (gifSearchInput) {
  gifSearchInput.addEventListener("keydown", async (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const query = gifSearchInput.value.trim();
      if (!query) return;

      // Καθαρίζουμε τα προηγούμενα
      gifResults.innerHTML = "Loading...";

      try {
        const res = await fetch(
          `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(query)}&limit=20&rating=g`
        );
        const data = await res.json();

        gifResults.innerHTML = "";
        data.data.forEach(gif => {
          const img = document.createElement("img");
          img.src = gif.images.fixed_width.url;
          img.alt = gif.title;
          img.addEventListener("click", () => {
  sendGifMessage(img.src);

  // Κλείσε το media panel
  const mediaPanel = document.getElementById("mediaPanel");
  if (mediaPanel) mediaPanel.classList.add("hidden");
});

          gifResults.appendChild(img);
        });
      } catch (err) {
        console.error("GIF fetch error:", err);
        gifResults.innerHTML = "❌ Error loading GIFs";
      }
    }
  });
}
// ==== GIF TRENDING (default όταν ανοίγει το tab) ====
async function loadTrendingGifs() {
  if (!gifResults) return;
  gifResults.innerHTML = "Loading...";

  try {
    const res = await fetch(
      `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_KEY}&limit=20&rating=g`
    );
    const data = await res.json();

    gifResults.innerHTML = "";
    data.data.forEach(gif => {
      const img = document.createElement("img");
      img.src = gif.images.fixed_width.url;
      img.alt = gif.title;
     img.addEventListener("click", () => {
  sendGifMessage(img.src);

  const mediaPanel = document.getElementById("mediaPanel");
  if (mediaPanel) mediaPanel.classList.add("hidden");

  const input = document.getElementById("messageInput");
  if (input) input.focus();
});

      gifResults.appendChild(img);
    });
  } catch (err) {
    console.error("GIF trending error:", err);
    gifResults.innerHTML = "❌ Error loading GIFs";
  }
}

// Φόρτωσε trending μόλις ανοίξει η σελίδα
loadTrendingGifs();
// ===================== STICKER SEARCH =====================
const stickerSearchInput = document.getElementById("stickerSearchInput");
const stickerResults = document.getElementById("stickerResults");

if (stickerSearchInput) {
  stickerSearchInput.addEventListener("keydown", async (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const query = stickerSearchInput.value.trim();
      if (!query) return;

      // Καθαρίζουμε τα προηγούμενα
      stickerResults.innerHTML = "Loading...";

      try {
        const res = await fetch(
          `https://api.giphy.com/v1/stickers/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(query)}&limit=20&rating=g`
        );
        const data = await res.json();

        stickerResults.innerHTML = "";
        data.data.forEach(sticker => {
          const img = document.createElement("img");
          img.src = sticker.images.fixed_width.url;
          img.alt = sticker.title;
          img.addEventListener("click", () => {
            sendStickerMessage(img.src);

            // Κλείσε το panel
            const mediaPanel = document.getElementById("mediaPanel");
            if (mediaPanel) mediaPanel.classList.add("hidden");

            // Focus στο input
            const input = document.getElementById("messageInput");
            if (input) input.focus();
          });
          stickerResults.appendChild(img);
        });
      } catch (err) {
        console.error("Sticker fetch error:", err);
        stickerResults.innerHTML = "❌ Error loading Stickers";
      }
    }
  });
}

// ==== STICKER TRENDING (default όταν ανοίγει το tab) ====
async function loadTrendingStickers() {
  if (!stickerResults) return;
  stickerResults.innerHTML = "Loading...";

  try {
    const res = await fetch(
      `https://api.giphy.com/v1/stickers/trending?api_key=${GIPHY_KEY}&limit=20&rating=g`
    );
    const data = await res.json();

    stickerResults.innerHTML = "";
    data.data.forEach(sticker => {
      const img = document.createElement("img");
      img.src = sticker.images.fixed_width.url;
      img.alt = sticker.title;
      img.addEventListener("click", () => {
        sendStickerMessage(img.src);

        const mediaPanel = document.getElementById("mediaPanel");
        if (mediaPanel) mediaPanel.classList.add("hidden");

        const input = document.getElementById("messageInput");
        if (input) input.focus();
      });
      stickerResults.appendChild(img);
    });
  } catch (err) {
    console.error("Sticker trending error:", err);
    stickerResults.innerHTML = "❌ Error loading Stickers";
  }
}

// Φόρτωσε trending stickers μόλις ανοίξει η σελίδα
loadTrendingStickers();

// ===== Συναρτηση για αποστολή Sticker =====
function sendStickerMessage(url) {
  const user = auth.currentUser;
  if (!user) return;

  push(ref(db, "messages/" + currentRoom), {
    uid: user.uid,
    user: user.displayName || "Guest",
    sticker: url, // 👈 αποθηκεύουμε το sticker URL
    createdAt: serverTimestamp()
  });
}

// ===================== RENDER USER LIST =====================
function renderUserList() {
  const usersList = document.getElementById("usersList");
  if (!usersList) return;

    // 🧹 Καθαρίζουμε τυχόν παλιούς listeners
  off(ref(db, "users"));
  off(ref(db, "roles"));
  
  // Ακούμε live για users
  onValue(ref(db, "users"), (usersSnap) => {
  const users = usersSnap.val() || {};
  usersList.innerHTML = "";

  const admins = [], vips = [], normal = [], guests = [];

  const escapeHTML = (str = "") =>
    str.replace(/[&<>"']/g, (m) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[m]));

  Object.values(users).forEach(u => {
    let role;
    if (u.displayName === "MysteryMan") {
      role = "admin"; // MysteryMan πάντα admin
    } else if (u.role) {
      role = u.role; // 👈 τώρα διαβάζουμε από το users/$uid/role
    } else if (u.isAnonymous) {
      role = "guest";
    } else {
      role = "user";
    }

    if (role === "admin") {
      admins.push({ ...u, role });
    } else if (role === "vip") {
      vips.push({ ...u, role });
    } else if (role === "guest") {
      guests.push({ ...u, role });
    } else {
      normal.push({ ...u, role });
    }
  });


    // === Helper function για category ===
    function renderCategory(title, arr, cssClass) {
      if (arr.length === 0) return;

      const group = document.createElement("li");
      group.className = "user-group";

      const header = document.createElement("div");
      header.className = "category-header " + cssClass;

      const titleSpan = document.createElement("span");
      titleSpan.className = "category-title";
      titleSpan.textContent = title;

      const arrow = document.createElement("span");
      arrow.className = "arrow open";

      header.appendChild(titleSpan);
      header.appendChild(arrow);
      group.appendChild(header);

      const sublist = document.createElement("ul");
      sublist.className = "user-sublist";

      arr.forEach(u => {
        const li = document.createElement("li");

        // Avatar
        const avatarDiv = document.createElement("div");
        avatarDiv.className = "user-avatar " + (u.online ? "online" : "offline");

        const img = document.createElement("img");
        img.src = u.photoURL || "https://i.pravatar.cc/150?u=" + u.uid;
        img.alt = "avatar";
        avatarDiv.appendChild(img);

        // Όνομα
        const nameSpan = document.createElement("span");
        nameSpan.className = "user-name";
        nameSpan.textContent = escapeHTML(u.displayName || "Guest");

        // Icons
        if (u.role === "admin") {
          const shield = document.createElement("span");
          shield.textContent = "🛡️";
          shield.className = "role-icon admin-icon";
          nameSpan.appendChild(shield);
        }
        if (u.role === "vip") {
          const star = document.createElement("span");
          star.textContent = "⭐";
          star.className = "role-icon vip-icon";
          nameSpan.appendChild(star);
        }

        li.appendChild(avatarDiv);
        li.appendChild(nameSpan);
        // Δεξί κλικ (context menu) μόνο για admin
li.addEventListener("contextmenu", (e) => {
  e.preventDefault();

  if (!auth.currentUser || auth.currentUser.displayName !== "MysteryMan") return;

  contextTargetUid = u.uid;

  // Υπολογισμός θέσης (ώστε να μένει εντός οθόνης)
const menuWidth = userContextMenu.offsetWidth || 180; // fallback
const menuHeight = userContextMenu.offsetHeight || 150; // fallback
let posX = e.clientX;
let posY = e.clientY;

if (posX + menuWidth > window.innerWidth) {
  posX = window.innerWidth - menuWidth - 5;
}
if (posY + menuHeight > window.innerHeight) {
  posY = window.innerHeight - menuHeight - 5;
}

userContextMenu.style.left = posX + "px";
userContextMenu.style.top = posY + "px";

  userContextMenu.classList.remove("hidden");
});
        sublist.appendChild(li);
      });

      group.appendChild(sublist);
      usersList.appendChild(group);

      // toggle collapse
      header.addEventListener("click", () => {
        if (sublist.style.display === "none") {
          sublist.style.display = "flex";
          sublist.style.flexDirection = "column";
          arrow.classList.add("open");
        } else {
          sublist.style.display = "none";
          arrow.classList.remove("open");
        }
      });
    }

     // Render κατηγορίες
  renderCategory("Admins", admins, "admin");
  renderCategory("VIP", vips, "vip");
  renderCategory("Users", normal, "user");
  renderCategory("Guests", guests, "guest");

});   // 👈 κλείσιμο του onValue(users)
}      // 👈 κλείσιμο της function renderUserList


// ===================== USER CONTEXT MENU LOGIC =====================
const userContextMenu = document.getElementById("userContextMenu");
let contextTargetUid = null; // ποιον user κάναμε δεξί κλικ

// Κλικ έξω → κλείσιμο
document.addEventListener("click", (e) => {
  if (!userContextMenu.contains(e.target)) {
    userContextMenu.classList.add("hidden");
  }
});

// Esc → κλείσιμο
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    userContextMenu.classList.add("hidden");
  }
});
// ===================== PROFILE MODAL LOGIC =====================
const profileModal = document.getElementById("profileModal");
const profileDetails = document.getElementById("profileDetails");
const closeProfile = document.getElementById("closeProfile");

document.getElementById("viewProfile").addEventListener("click", async () => {
  if (!contextTargetUid) return;

  const snap = await get(ref(db, "users/" + contextTargetUid));
  const u = snap.val();
  if (!u) return;

  profileDetails.innerHTML = `
    <img src="${u.photoURL || "https://i.pravatar.cc/150?u=" + u.uid}" 
         alt="avatar" style="width:80px;height:80px;border-radius:50%;margin-bottom:10px;">
    <h3>${u.displayName || "Anon"}</h3>
    <p>Role: ${u.role || "user"}</p>
    <p>Status: ${u.online ? "🟢 Online" : "⚫ Offline"}</p>
  `;

  profileModal.classList.remove("hidden");
  userContextMenu.classList.add("hidden"); // κλείσε το context menu
});

// Κλείσιμο modal
closeProfile.addEventListener("click", () => {
  profileModal.classList.add("hidden");
});

// Κλείσιμο modal με κλικ έξω
profileModal.addEventListener("click", (e) => {
  if (e.target === profileModal) {
    profileModal.classList.add("hidden");
  }
});

// Κλείσιμο modal με Esc
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    profileModal.classList.add("hidden");
  }
});

// ===================== ROLE MODAL LOGIC =====================
const roleModal = document.getElementById("roleModal");
const closeRole = document.getElementById("closeRole");
const roleButtons = document.querySelectorAll(".role-btn");

// Άνοιγμα modal όταν πατηθεί Change Role
document.getElementById("changeRole").addEventListener("click", () => {
  if (!contextTargetUid) return; // αν δεν έχουμε user

  roleModal.classList.remove("hidden");       // δείξε το modal
  userContextMenu.classList.add("hidden");    // κλείσε το context menu
});
// Επιλογή ρόλου από τα κουμπιά
roleButtons.forEach(btn => {
  btn.addEventListener("click", async () => {
    const newRole = btn.dataset.role;

    if (!contextTargetUid) return;

    await update(ref(db, "users/" + contextTargetUid), {
      role: newRole
    });

    console.log("✅ Role updated:", contextTargetUid, "→", newRole);

    roleModal.classList.add("hidden"); // κλείσε το modal μετά την αλλαγή
  });
});
// Κλείσιμο με ❌
closeRole.addEventListener("click", () => {
  roleModal.classList.add("hidden");
});

// Κλείσιμο με click έξω
roleModal.addEventListener("click", (e) => {
  if (e.target === roleModal) {
    roleModal.classList.add("hidden");
  }
});

// Κλείσιμο με Esc
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    roleModal.classList.add("hidden");
  }
});
