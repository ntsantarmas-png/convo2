// ===========================================
// 🔹 CONVO v2 CLEAN BUILD (UTF-8 SAFE)
// 🔹 Created by MysteryMan + ChatGPT
// 🔹 Date: October 2025
// ===========================================

// ===================== CONFIG & INIT =====================

// === GIPHY CONFIG ===
const GIPHY_KEY = "bCn5Jvx2ZOepneH6fMteNoX31hVfqX25";

// === Firebase Imports & Config ===
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
  getAuth, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
  getDatabase, ref, get, set, update, onValue, push, remove, serverTimestamp, onDisconnect
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// === Initialize Firebase ===
const firebaseConfig = {
  apiKey: "AIzaSyBEiZEcY54mFT7OnrfCv0t3sPo33DthcZ4",
  authDomain: "convo2-4a075.firebaseapp.com",
  projectId: "convo2-4a075",
  storageBucket: "convo2-4a075.appspot.com",
  messagingSenderId: "543901633763",
  appId: "1:543901633763:web:2f91926e4c0c6ce11789d6",
  databaseURL: "https://convo2-4a075-default-rtdb.europe-west1.firebasedatabase.app"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// === Global State ===
let currentRoom = "general";
let typingTimeouts = {};
let messageMemory = {}; // input memory per room

// ===================== AUTH STATE HANDLING =====================
const authView = document.getElementById("auth");
const appView = document.getElementById("app");

// Παρακολουθεί την κατάσταση σύνδεσης (login/logout)
onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log("✅ Authenticated:", user.displayName || user.uid);

    // Κρύβει το login/register view
    authView.classList.add("hidden");
    appView.classList.remove("hidden");

    // === Presence (online/offline)
    setupPresence(user);

    // === Render βασικά panels ===
    renderRooms();
    renderUserList();

    // Μικρή καθυστέρηση για σταθερότητα
    setTimeout(() => switchRoom("general"), 250);

    // === Coins & Admin Buttons ===
    setupCoinsSync(user.uid);
    setupAddCoinsButton(user);

  } else {
    console.log("❌ Logged out or no user");
    authView.classList.remove("hidden");
    appView.classList.add("hidden");
  }
});

// ===================== PRESENCE =====================
function setupPresence(user) {
  const userRef = ref(db, "users/" + user.uid);
  const connectedRef = ref(db, ".info/connected");

  onValue(connectedRef, (snap) => {
    if (snap.val() === false) return;

    // Όταν ο χρήστης αποσυνδέεται, ενημέρωσε τη βάση
    onDisconnect(userRef).update({ online: false });

    // Πάρε υπάρχοντα δεδομένα (αν υπάρχουν)
    get(userRef).then((userSnap) => {
      const existing = userSnap.val() || {};

      const finalRole =
        existing.role ||
        (user.isAnonymous ? "guest" : user.displayName === "MysteryMan" ? "admin" : "user");

      update(userRef, {
        uid: user.uid,
        displayName: user.displayName || "User" + Math.floor(Math.random() * 10000),
        email: user.email || null,
        photoURL:
          user.photoURL ||
          `https://i.pravatar.cc/150?u=${user.uid}`,
        role: finalRole,
        online: true,
        lastLogin: Date.now(),
      });
    });
  });
}

// ===================== ROOMS =====================

// === RENDER ROOMS LIST ===
function renderRooms() {
  const roomsList = document.getElementById("roomsList");
  const newRoomBtn = document.getElementById("newRoomBtn");

  if (!roomsList) return;

  onValue(ref(db, "rooms"), (snap) => {
    roomsList.innerHTML = "";

    if (!snap.exists()) {
      const li = document.createElement("li");
      li.textContent = "No rooms yet";
      li.style.opacity = "0.6";
      roomsList.appendChild(li);
      return;
    }

    snap.forEach((child) => {
      const room = child.key;
      const li = document.createElement("li");
      li.textContent = "#" + room;

      if (room === currentRoom) li.classList.add("active");

      li.addEventListener("click", () => switchRoom(room));
      roomsList.appendChild(li);
    });
  });

  // === NEW ROOM BUTTON ===
  if (newRoomBtn) {
    newRoomBtn.onclick = async () => {
      const name = prompt("🏠 Όνομα νέου room:");
      if (!name) return;

      const cleanName = name.trim().toLowerCase().replace(/\s+/g, "-");
      await set(ref(db, "rooms/" + cleanName), {
        createdAt: Date.now(),
      });
    };
  }
}

// === SWITCH ROOM (με input memory fix) ===
function switchRoom(room) {
  if (!room) return;

  // 💾 Αποθήκευσε προσωρινά το input του τρέχοντος room
  const inputEl = document.getElementById("messageInput");
  if (inputEl) {
    messageMemory[currentRoom] = inputEl.value;
  }

  // Αν είναι ίδιο δωμάτιο → αγνόησε
  if (room === currentRoom) return;

  // Άδειασε τα μηνύματα
  const messagesDiv = document.getElementById("messages");
  if (messagesDiv) messagesDiv.innerHTML = "";

  // Άλλαξε το room
  currentRoom = room;
  const roomTitle = document.getElementById("roomTitle");
  if (roomTitle) roomTitle.textContent = "#" + room;

  console.log("📦 Switched to room:", room);

  // 🔄 Απόδοση προηγούμενου input (αν υπάρχει)
  if (inputEl) {
    inputEl.value = messageMemory[room] || "";
  }

  renderMessages(room);
}


// ===================== MESSAGES =====================

// === SEND MESSAGE ===
const messageForm = document.getElementById("messageForm");
if (messageForm) {
  messageForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const input = document.getElementById("messageInput");
    const text = input.value.trim();
    if (!text) return;

    const user = auth.currentUser;
    if (!user) return;

    // === YouTube Link Detection ===
    const ytRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = text.match(ytRegex);

    const msgData = {
      uid: user.uid,
      user: user.displayName || "Guest",
      text: text,
      photoURL: user.photoURL || `https://i.pravatar.cc/150?u=${user.uid}`,
      createdAt: Date.now(),
    };

    // === Push message to DB ===
    await push(ref(db, "messages/" + currentRoom), msgData);

    // === Εμφάνιση τραγουδιού στο System Panel ===
    if (match) {
      const videoId = match[1];
      const titleMsg = `🎵 ${user.displayName || "Someone"} is playing: https://youtu.be/${videoId}`;
      await push(ref(db, "adminLogs"), {
        type: "song",
        text: titleMsg,
        time: Date.now(),
      });
    }

    // === Καθάρισε input ===
    input.value = "";
    messageMemory[currentRoom] = "";
  });
}

// === RENDER MESSAGES ===
function renderMessages(room) {
  const messagesRef = ref(db, "messages/" + room);
  const messagesDiv = document.getElementById("messages");
  if (!messagesDiv) return;

  onValue(messagesRef, (snap) => {
    messagesDiv.innerHTML = "";

    snap.forEach((child) => {
      const msg = child.val();
      const div = document.createElement("div");
      div.className = "message";
      if (msg.uid === auth.currentUser?.uid) div.classList.add("mine");

      // Avatar
      const avatar = document.createElement("div");
      avatar.className = "message-avatar";
      avatar.innerHTML = `<img src="${msg.photoURL || "https://i.pravatar.cc/150"}" alt="">`;

      // Content
      const content = document.createElement("div");
      content.className = "message-content";

      const userSpan = document.createElement("div");
      userSpan.className = "message-user";
      userSpan.textContent = msg.user || "Unknown";

      const bubble = document.createElement("div");
      bubble.className = "message-bubble";

      // === YouTube Link ===
      const ytRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
      const match = msg.text.match(ytRegex);

      if (match) {
        const videoId = match[1];
        const link = document.createElement("a");
        link.href = `https://youtu.be/${videoId}`;
        link.textContent = msg.text;
        link.target = "_blank";
        bubble.appendChild(link);
      } else {
        bubble.textContent = msg.text;
      }

      // === Timestamp ===
      const time = document.createElement("div");
      time.className = "msg-line2";
      time.textContent = new Date(msg.createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      content.appendChild(userSpan);
      content.appendChild(bubble);
      content.appendChild(time);

      div.appendChild(avatar);
      div.appendChild(content);
      messagesDiv.appendChild(div);
    });

    // Auto-scroll
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  });
}
// ===================== USER LIST =====================
async function renderUserList() {
  const usersList = document.getElementById("usersList");
  if (!usersList) return;

  try {
    const [usersSnap, rolesSnap] = await Promise.all([
      get(ref(db, "users")),
      get(ref(db, "roles"))
    ]);

    const users = usersSnap.val() || {};
    const roles = rolesSnap.val() || {};

    usersList.innerHTML = "";

    // Κατηγορίες
    const admins = [], vips = [], normal = [], guests = [];

    // Ταξινόμηση
    Object.values(users).forEach((u) => {
      const role =
        u.displayName === "MysteryMan"
          ? "admin"
          : u.role || (u.isAnonymous ? "guest" : "user");

      if (role === "admin") admins.push(u);
      else if (role === "vip") vips.push(u);
      else if (role === "guest") guests.push(u);
      else normal.push(u);
    });

    // Helper για κατηγορία
    function renderCategory(title, arr, cssClass) {
      if (arr.length === 0) return;
      const header = document.createElement("li");
      header.className = "user-category " + cssClass;
      header.textContent = title + " (" + arr.length + ")";
      usersList.appendChild(header);

      arr.forEach((u) => {
        const li = document.createElement("li");
        li.className = "user-item";

        // Avatar
        const avatarDiv = document.createElement("div");
        avatarDiv.className = "user-avatar";
        avatarDiv.innerHTML = `<img src="${u.photoURL || `https://i.pravatar.cc/150?u=${u.uid}`}" alt="">`;

        // Status Ring
        if (u.online) avatarDiv.classList.add("online");
        else avatarDiv.classList.add("offline");

        // Name
        const nameSpan = document.createElement("span");
        nameSpan.className = "user-name";
        nameSpan.textContent = u.displayName || "Unknown";

        // Badge
        const badge = document.createElement("span");
        badge.className = "user-badge " + (u.role || "user");
        badge.textContent = (u.role || "user").toUpperCase();

        // Συνδυασμός
        li.appendChild(avatarDiv);
        li.appendChild(nameSpan);
        li.appendChild(badge);

        // === Context Menu Trigger (για admin actions) ===
        li.addEventListener("contextmenu", (e) => {
          e.preventDefault();
          openUserContextMenu(e, u.uid, u.displayName, u.role);
        });

        usersList.appendChild(li);
      });
    }

    // === Render Κατηγορίες ===
    renderCategory("Admins", admins, "admins");
    renderCategory("VIP", vips, "vips");
    renderCategory("Users", normal, "users");
    renderCategory("Guests", guests, "guests");
  } catch (err) {
    console.error("⚠️ Error rendering user list:", err);
  }
}
// ===================== ADMIN TOOLS =====================

// === Globals για context menu ===
let contextTargetUid = null;
const userContextMenu = document.getElementById("userContextMenu");

// === Άνοιγμα Context Menu ===
function openUserContextMenu(e, uid, displayName, role) {
  if (!auth.currentUser || auth.currentUser.displayName !== "MysteryMan") return;

  contextTargetUid = uid;
  const menu = userContextMenu;
  if (!menu) return;

  menu.style.left = e.pageX + "px";
  menu.style.top = e.pageY + "px";
  menu.classList.remove("hidden");

  document.addEventListener("click", closeContextMenu);
}

function closeContextMenu() {
  if (userContextMenu) userContextMenu.classList.add("hidden");
  document.removeEventListener("click", closeContextMenu);
}

// === DELETE MESSAGE (right click σε μήνυμα) ===
async function deleteMessage(msgId, room) {
  const user = auth.currentUser;
  if (!user || user.displayName !== "MysteryMan") return;
  try {
    await remove(ref(db, `messages/${room}/${msgId}`));
    await push(ref(db, "adminLogs"), {
      type: "delete",
      text: `🗑️ ${user.displayName} deleted a message in #${room}`,
      time: Date.now(),
    });
  } catch (err) {
    console.error("Delete failed:", err);
  }
}

// === CLEAR CHAT (όλο το room) ===
async function clearChat(room) {
  const user = auth.currentUser;
  if (!user || user.displayName !== "MysteryMan") return;
  if (!confirm(`🧹 Clear all messages in #${room}?`)) return;

  await remove(ref(db, "messages/" + room));
  await push(ref(db, "adminLogs"), {
    type: "clear",
    text: `🧹 ${user.displayName} cleared chat in #${room}`,
    time: Date.now(),
  });
}

// === KICK USER ===
async function kickUser(uid, displayName) {
  const currentUser = auth.currentUser;
  if (!currentUser || currentUser.displayName !== "MysteryMan") return;

  await push(ref(db, "adminLogs"), {
    type: "kick",
    text: `🚪 ${displayName} was kicked by ${currentUser.displayName}`,
    time: Date.now(),
  });

  alert(`🚪 ${displayName} has been kicked.`);
}

// === BAN USER ===
async function banUser(uid, displayName) {
  const currentUser = auth.currentUser;
  if (!currentUser || currentUser.displayName !== "MysteryMan") return;

  await set(ref(db, "banned/" + uid), {
    uid,
    displayName,
    time: Date.now(),
  });

  await push(ref(db, "adminLogs"), {
    type: "ban",
    text: `⛔ ${displayName} was banned by ${currentUser.displayName}`,
    time: Date.now(),
  });

  alert(`⛔ ${displayName} has been banned.`);
}

// === MUTE USER ===
async function muteUser(uid, displayName, minutes = 5) {
  const currentUser = auth.currentUser;
  if (!currentUser || currentUser.displayName !== "MysteryMan") return;

  const unmuteAt = Date.now() + minutes * 60000;
  await set(ref(db, `muted/${uid}`), { until: unmuteAt });

  await push(ref(db, "adminLogs"), {
    type: "mute",
    text: `🔇 ${displayName} muted for ${minutes}m by ${currentUser.displayName}`,
    time: Date.now(),
  });

  alert(`🔇 ${displayName} muted for ${minutes} minutes.`);
}

// === ADD COINS ===
function setupAddCoinsButton(user) {
  const btn = document.getElementById("addCoinsUser");
  if (!btn) return;

  btn.onclick = async () => {
    if (auth.currentUser?.displayName !== "MysteryMan") {
      alert("❌ Μόνο ο MysteryMan μπορεί να δώσει coins!");
      return;
    }

    const amount = parseInt(prompt("💰 Πόσα coins να προσθέσω;", "50"), 10);
    if (isNaN(amount) || amount <= 0) return;

    if (!contextTargetUid) {
      alert("⚠️ Κανένας χρήστης δεν επιλέχθηκε!");
      return;
    }

    const targetRef = ref(db, "users/" + contextTargetUid + "/coins");
    const currentSnap = await get(targetRef);
    const currentCoins = currentSnap.exists() ? currentSnap.val() : 0;

    await set(targetRef, currentCoins + amount);
    await push(ref(db, "adminLogs"), {
      type: "coins",
      text: `💰 ${user.displayName} added ${amount} coins to user ${contextTargetUid}`,
      time: Date.now(),
    });

    alert(`💰 Added ${amount} coins successfully!`);
  };
}

// === SYNC COINS (auto update) ===
function setupCoinsSync(uid) {
  const coinsEl = document.getElementById("coinsValue");
  if (!coinsEl) return;

  onValue(ref(db, "users/" + uid + "/coins"), (snap) => {
    coinsEl.textContent = snap.exists() ? snap.val() : 0;
  });
}
// ===================== PROFILE PANEL =====================

const profileBtn = document.getElementById("profileBtn");
const profilePanel = document.getElementById("profilePanel");
const closeProfileBtn = document.getElementById("closeProfileBtn");

// === Άνοιγμα/Κλείσιμο Panel ===
if (profileBtn && profilePanel) {
  profileBtn.addEventListener("click", () => {
    profilePanel.classList.remove("hidden");
  });
}

if (closeProfileBtn) {
  closeProfileBtn.addEventListener("click", () => {
    profilePanel.classList.add("hidden");
  });
}

// === Κλείσιμο με ESC ===
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    profilePanel.classList.add("hidden");
  }
});

// === Tabs ===
const profileTabs = document.querySelectorAll(".profile-tab");
const profileSections = document.querySelectorAll(".profile-section");

profileTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const target = tab.dataset.target;

    // Αφαίρεση active από όλα
    profileTabs.forEach((t) => t.classList.remove("active"));
    profileSections.forEach((s) => s.classList.add("hidden"));

    // Ενεργοποίηση επιλεγμένου tab
    tab.classList.add("active");
    document.getElementById(target)?.classList.remove("hidden");
  });
});

// === Ενημέρωση στοιχείων χρήστη ===
function updateProfilePanel(user) {
  const usernameEl = document.getElementById("profileUsername");
  const emailEl = document.getElementById("profileEmail");
  const avatarEl = document.getElementById("profileAvatar");

  if (!user) return;

  if (usernameEl) usernameEl.textContent = user.displayName || "Guest";
  if (emailEl) emailEl.textContent = user.email || "—";
  if (avatarEl)
    avatarEl.src =
      user.photoURL || `https://i.pravatar.cc/150?u=${user.uid}`;
}

// === Φόρτωση Coins ===
function loadUserCoins(uid) {
  const coinsDisplay = document.getElementById("profileCoinsValue");
  if (!coinsDisplay) return;

  onValue(ref(db, "users/" + uid + "/coins"), (snap) => {
    coinsDisplay.textContent = snap.exists() ? snap.val() : 0;
  });
}
// ===================== SYSTEM PANEL (ADMIN LOGS) =====================

const systemBtn = document.getElementById("systemBtn");
const systemPanel = document.getElementById("systemPanel");
const closeSystemBtn = document.getElementById("closeSystemBtn");
const systemLogsDiv = document.getElementById("systemLogs");

// === Εμφάνιση κουμπιού μόνο για MysteryMan ===
onAuthStateChanged(auth, (user) => {
  if (user && user.displayName === "MysteryMan") {
    systemBtn?.classList.remove("hidden");
  } else {
    systemBtn?.classList.add("hidden");
  }
});

// === Άνοιγμα/Κλείσιμο Panel ===
if (systemBtn && systemPanel) {
  systemBtn.addEventListener("click", () => {
    systemPanel.classList.remove("hidden");
  });
}

if (closeSystemBtn) {
  closeSystemBtn.addEventListener("click", () => {
    systemPanel.classList.add("hidden");
  });
}

// === Κλείσιμο με ESC ===
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    systemPanel.classList.add("hidden");
  }
});

// === Render Admin Logs ===
function renderSystemLogs() {
  if (!systemLogsDiv) return;

  const logsRef = ref(db, "adminLogs");
  onValue(logsRef, (snap) => {
    systemLogsDiv.innerHTML = "";

    if (!snap.exists()) {
      systemLogsDiv.innerHTML = "<p>📭 No admin logs yet.</p>";
      return;
    }

    // Δημιουργία λίστας
    const logs = [];
    snap.forEach((child) => {
      logs.push(child.val());
    });

    logs
      .sort((a, b) => b.time - a.time)
      .slice(0, 50)
      .forEach((log) => {
        const item = document.createElement("div");
        item.className = "log-item";
        const time = new Date(log.time).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
        item.textContent = `[${time}] ${log.text}`;
        systemLogsDiv.appendChild(item);
      });
  });
}

// === Auto Render στο Login ===
onAuthStateChanged(auth, (user) => {
  if (user && user.displayName === "MysteryMan") {
    renderSystemLogs();
  }
});

// ===================== YOUTUBE PANEL =====================

const youtubeBtn = document.getElementById("youtubeBtn");
const youtubePanel = document.getElementById("youtubePanel");
const closeYouTubeBtn = document.getElementById("closeYouTubeBtn");
const youtubeFrame = document.getElementById("youtubeFrame");
const youtubePlaceholder = document.getElementById("youtubePlaceholder");

let currentVideoId = null;

// === Toggle κουμπί (εμφάνιση / απόκρυψη panel) ===
if (youtubeBtn) {
  youtubeBtn.addEventListener("click", () => {
    youtubePanel.classList.toggle("hidden");
    if (youtubePanel.classList.contains("hidden")) {
      youtubeBtn.textContent = "🎵 YouTube";
      stopYouTubeVideo();
    } else {
      youtubeBtn.textContent = "❌ Hide YouTube";
      if (!currentVideoId) {
        showYouTubePlaceholder();
      }
    }
  });
}

// === Κλείσιμο με κουμπί Χ ===
if (closeYouTubeBtn) {
  closeYouTubeBtn.addEventListener("click", () => {
    youtubePanel.classList.add("hidden");
    youtubeBtn.textContent = "🎵 YouTube";
    stopYouTubeVideo();
  });
}

// === Προβολή YouTube βίντεο ===
function playYouTubeVideo(videoId) {
  if (!youtubeFrame) return;
  currentVideoId = videoId;
  youtubeFrame.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
  youtubeFrame.classList.remove("hidden");
  youtubePlaceholder.classList.add("hidden");
  youtubePanel.classList.remove("hidden");
  youtubeBtn.textContent = "❌ Hide YouTube";
}

// === Διακοπή αναπαραγωγής ===
function stopYouTubeVideo() {
  if (youtubeFrame) {
    youtubeFrame.src = "";
  }
  currentVideoId = null;
  showYouTubePlaceholder();
}

// === Εμφάνιση placeholder ===
function showYouTubePlaceholder() {
  if (youtubePlaceholder) {
    youtubePlaceholder.classList.remove("hidden");
    youtubePlaceholder.textContent = "🎵 Κανένα βίντεο – στείλε ένα YouTube link στο chat!";
  }
  if (youtubeFrame) youtubeFrame.classList.add("hidden");
}

// === YouTube Link Detection ===
function handleYouTubeLinks(text) {
  const ytRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = text.match(ytRegex);
  if (match) {
    playYouTubeVideo(match[1]);
  }
}
// ===================== HELPERS & EVENTS =====================

// === Γενικό κλείσιμο panels με ESC ===
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    // Κλείσιμο όλων των panels
    const panels = document.querySelectorAll(".panel");
    panels.forEach((p) => p.classList.add("hidden"));
  }
});

// === Emoji / GIF / Sticker Handlers (placeholder functions) ===
// Εδώ θα επεκταθούν στο Fun Pack v1
function handleEmojiInsert(emoji) {
  const input = document.getElementById("messageInput");
  if (!input) return;
  input.value += emoji;
  input.focus();
}

function handleGifInsert(url) {
  const input = document.getElementById("messageInput");
  if (!input) return;
  input.value += " " + url + " ";
  input.focus();
}

// === Format Helper ===
function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// === General Alert Bubble (για system μηνύματα στο UI) ===
function showAlertBubble(msg, type = "info") {
  const bubble = document.createElement("div");
  bubble.className = "alert-bubble " + type;
  bubble.textContent = msg;
  document.body.appendChild(bubble);
  setTimeout(() => bubble.remove(), 4000);
}

// === Network Connectivity Check ===
window.addEventListener("offline", () => showAlertBubble("⚠️ Χάθηκε η σύνδεση στο δίκτυο!", "warn"));
window.addEventListener("online", () => showAlertBubble("✅ Επανασύνδεση στο διαδίκτυο", "success"));

// === Console Debug Confirmation ===
console.log("✅ Convo app_clean_v2 loaded successfully!");


