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
    setupCoinsSync(user);
setupAddCoinsButton(user);


    // === Coins Sync ===
    setupCoinsSync(user);  // 👈 Βάλε το εδώ
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

    // 🔻 Τι να γίνει αν αποσυνδεθεί (offline)
    onDisconnect(userRef).update({
      online: false,
      lastSeen: Date.now()
    });

    // 🔹 Διάβασε πρώτα τι υπάρχει ήδη
    get(userRef).then(userSnap => {
      const existing = userSnap.val() || {};

      // === Role Logic ===
      let role = existing.role || "user";
      if (user.isAnonymous) role = "guest";
      if (user.displayName === "MysteryMan") role = "admin"; // ✅ auto-lock admin

      // === Ενημέρωση στοιχείων χωρίς overwrite του role ===
      update(userRef, {
        uid: user.uid,
        displayName: user.displayName || "User" + Math.floor(Math.random() * 10000),
        photoURL: user.photoURL || null,
        role: role,
        online: true,
        coins: existing.coins ?? 0 // 👈 auto-create coins field
      })
      .then(() => {
        console.log("📡 Presence sync:", user.displayName, "| role:", role);
      })
      .catch(err => {
        console.error("❌ Presence role sync failed:", err);
      });
    }); // 👈 κλείνει το get(userRef).then(...)
  }); // 👈 κλείνει το onValue(...)
} // 👈 κλείνει η function setupPresence

// ===================== COINS SYNC =====================

function setupCoinsSync(user) {
  const coinsEl = document.getElementById("profileCoins");
  if (!coinsEl || !user) return;

  const coinsRef = ref(db, "users/" + user.uid + "/coins");

  // 🔁 Live ενημέρωση
  onValue(coinsRef, (snap) => {
    const panel = document.getElementById("profilePanel");
if (panel && panel.dataset.viewingUid && panel.dataset.viewingUid !== user.uid) return;

    const coins = snap.val();
    if (coins !== null) {
      coinsEl.textContent = coins;

      // ✨ Προαιρετικό animation feedback
      coinsEl.classList.add("coin-change");
      setTimeout(() => coinsEl.classList.remove("coin-change"), 400);
    } else {
      coinsEl.textContent = "0";
    }
  });
}
// ===================== ADMIN ADD COINS =====================
function setupAddCoinsButton(user) {
  const btn = document.getElementById("addCoinsBtn");
  if (!btn) return;

  // Εμφάνιση κουμπιού μόνο για MysteryMan
  if (user.displayName === "MysteryMan") {
    btn.classList.remove("hidden");
  } else {
    btn.classList.add("hidden");
    return;
  }

  // 👉 On click, πρόσθεσε coins
  btn.addEventListener("click", async () => {
    const addAmount = parseInt(prompt("💎 Πόσα coins να προσθέσω;", "50"));
    if (isNaN(addAmount) || addAmount <= 0) return alert("❌ Άκυρο ποσό");

    const coinsRef = ref(db, "users/" + user.uid + "/coins");

    try {
      const snap = await get(coinsRef);
      const current = snap.val() || 0;
      await set(coinsRef, current + addAmount);
      alert(`✅ Προστέθηκαν ${addAmount} coins!`);
    } catch (err) {
      console.error("❌ Add coins failed:", err);
    }
  });
}
// ===================== ADMIN ADD COINS TO USER =====================
const addCoinsUserBtn = document.getElementById("addCoinsUser");

if (addCoinsUserBtn) {
  addCoinsUserBtn.addEventListener("click", async () => {
    if (!contextTargetUid) {
      alert("⚠️ No user selected!");
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser || currentUser.displayName !== "MysteryMan") {
      alert("❌ Μόνο ο MysteryMan μπορεί να δώσει coins!");
      userContextMenu.classList.add("hidden");
      return;
    }

    const addAmount = parseInt(prompt("💎 Πόσα coins να προσθέσω σε αυτόν τον χρήστη;", "50"));
    if (isNaN(addAmount) || addAmount <= 0) {
      alert("❌ Άκυρο ποσό!");
      userContextMenu.classList.add("hidden");
      return;
    }

    const coinsRef = ref(db, "users/" + contextTargetUid + "/coins");

    try {
      const snap = await get(coinsRef);
      const currentCoins = snap.exists() ? snap.val() : 0;
      await set(coinsRef, currentCoins + addAmount);

      alert(`✅ Προστέθηκαν ${addAmount} coins!`);
      console.log(`💎 Admin added ${addAmount} coins to UID: ${contextTargetUid}`);

      // Προαιρετικά log στο adminLogs
      const logRef = push(ref(db, "adminLogs"));
      await set(logRef, {
        action: "Add Coins",
        targetUid: contextTargetUid,
        admin: currentUser.displayName,
        amount: addAmount,
        time: Date.now()
      });

    } catch (err) {
      console.error("❌ Add coins to user failed:", err);
      alert("❌ Αποτυχία προσθήκης coins.");
    }

    userContextMenu.classList.add("hidden");
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


// ===================== RENDER MESSAGES (Optimized) =====================
function renderMessages(room) {
  const messagesRef = ref(db, "messages/" + room);
  const messagesDiv = document.getElementById("messages");
  if (!messagesDiv) return;

  // Καθαρίζει μόνο ΜΙΑ φορά στην αλλαγή room
  messagesDiv.innerHTML = "";
  off(messagesRef);

  onValue(messagesRef, (snap) => {
    const existingIds = new Set(
      Array.from(messagesDiv.querySelectorAll(".message")).map(el => el.dataset.id)
    );

    snap.forEach(childSnap => {
      const msgId = childSnap.key;
      const msg = childSnap.val();
      if (existingIds.has(msgId)) return; // ✅ Μην ξαναπροσθέτεις υπάρχον μήνυμα

      // === Container ===
      const messageDiv = document.createElement("div");
      messageDiv.className = "message";
      messageDiv.dataset.id = msgId;

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
      contentDiv.appendChild(userDiv);

      // === Bubble ===
      if (msg.text) {
        const bubbleDiv = document.createElement("div");
        bubbleDiv.className = "message-bubble";

        // Γραμμή 1: Text
        const line1 = document.createElement("div");
        line1.className = "msg-line1";

        // === YouTube Embed Check ===
        const ytRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
        const match = msg.text.match(ytRegex);

        if (match) {
          const videoId = match[1];
          const youtubePanel = document.getElementById("youtubePanel");
          if (youtubePanel) {
            const wrapper = youtubePanel.querySelector(".video-wrapper");
            wrapper.innerHTML = `
              <iframe 
                src="https://www.youtube.com/embed/${videoId}" 
                frameborder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowfullscreen>
              </iframe>
            `;
            youtubePanel.classList.remove("hidden");
          }
          line1.textContent = ""; // ❌ Μην δείξεις URL
        } else {
          // ✅ Κανονικά μηνύματα
          line1.textContent = msg.text;

          // ✅ Emoji-only check
          if (isEmojiOnly(msg.text)) {
            const emojiCount = msg.text.match(/\p{Extended_Pictographic}/gu).length;
            bubbleDiv.classList.add("emoji-only");
            if (emojiCount <= 2) {
              bubbleDiv.classList.add("big");
            }
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

      // === GIF ===
      if (msg.gif) {
        const gifEl = document.createElement("img");
        gifEl.src = msg.gif;
        gifEl.alt = "GIF";
        gifEl.className = "chat-gif";
        contentDiv.appendChild(gifEl);
      }

      // === STICKER ===
      if (msg.sticker) {
        const stickerEl = document.createElement("img");
        stickerEl.src = msg.sticker;
        stickerEl.alt = "Sticker";
        stickerEl.className = "chat-sticker";
        contentDiv.appendChild(stickerEl);
      }

      // === Put together ===
      messageDiv.appendChild(avatarDiv);
      messageDiv.appendChild(contentDiv);
      messagesDiv.appendChild(messageDiv);
    });

    // ✅ Scroll μόνο αν είσαι ήδη κάτω
    if (messagesDiv.scrollHeight - messagesDiv.scrollTop <= messagesDiv.clientHeight + 100) {
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
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

    // 🔒 Check mute
    const muteSnap = await get(ref(db, "mutes/" + user.uid));
    if (muteSnap.exists()) {
      alert("⚠️ Είσαι muted και δεν μπορείς να στείλεις μηνύματα.");
      return;
    }

    // Αν δεν είναι muted → στέλνει κανονικά
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
// ===================== TOGGLE YOUTUBE BUTTON =====================
const toggleYoutubeBtn = document.getElementById("toggleYoutubeBtn");

if (toggleYoutubeBtn) {
  toggleYoutubeBtn.addEventListener("click", () => {
    youtubePanel.classList.toggle("hidden");

    if (youtubePanel.classList.contains("hidden")) {
      toggleYoutubeBtn.textContent = "YouTube";   // όταν είναι κλειστό
    } else {
      toggleYoutubeBtn.textContent = "Hide YouTube"; // όταν είναι ανοιχτό
    }
  });
}
// ===================== PROFILE PANEL =====================
const profileBtn = document.getElementById("headerUser"); // ή όποιο κουμπί θέλεις
const profilePanel = document.getElementById("profilePanel");
const closeProfileBtn = document.getElementById("closeProfileBtn");

// Άνοιγμα / κλείσιμο panel
if (profileBtn && profilePanel) {
  profileBtn.addEventListener("click", () => {
    profilePanel.classList.remove("hidden");
    profilePanel.classList.add("show");

  });
}
if (closeProfileBtn) {
  closeProfileBtn.addEventListener("click", () => {
    profilePanel.classList.remove("show");
    profilePanel.classList.add("hidden");
  });
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") profilePanel.classList.remove("show");
});

// Tabs λειτουργία
const tabButtons = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");

tabButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    tabButtons.forEach(b => b.classList.remove("active"));
    tabContents.forEach(c => c.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("tab-" + btn.dataset.tab).classList.add("active");
  });
});
// ===================== PROFILE PANEL (LOAD USER INFO) =====================
async function openProfilePanel(uid = null) {
  const panel = document.getElementById("profilePanel");
  if (!panel) return;

  // Καθάρισε και δείξε το panel
  panel.classList.remove("hidden");
  panel.classList.add("show");

  // Target UID (είτε άλλος user είτε εσύ)
  const targetUid = uid || auth.currentUser.uid;
  panel.dataset.viewingUid = targetUid; // αποθήκευση UID που βλέπουμε

  const snap = await get(ref(db, "users/" + targetUid));
  const data = snap.val();

  if (!data) {
    console.warn("⚠️ No user data found for", targetUid);
    return;
  }

  // ➕ Update UI με βάση το user που βλέπεις
  document.getElementById("profileName").textContent = data.displayName || "Unknown";
  document.getElementById("profileAvatar").src = data.photoURL || "https://i.pravatar.cc/150";
  document.getElementById("profileRole").textContent = data.role || "user";
  document.getElementById("profileCoins").textContent = data.coins ?? 0;
}


// ===================== VIEW PROFILE (CONTEXT MENU) =====================
const viewProfileBtn = document.getElementById("viewProfile");
if (viewProfileBtn) {
  viewProfileBtn.addEventListener("click", () => {
    if (!contextTargetUid) return alert("⚠️ No user selected!");
    openProfilePanel(contextTargetUid);
    userContextMenu.classList.add("hidden");
  });
}



// ===================== SYSTEM PANEL =====================
const systemBtn = document.getElementById("systemBtn");
const systemPanel = document.getElementById("systemPanel");
const closeSystemBtn = document.getElementById("closeSystemBtn");
const systemLogsDiv = document.getElementById("systemLogs");

// Εμφάνιση κουμπιού μόνο για MysteryMan
onAuthStateChanged(auth, (user) => {
  if (user && user.displayName === "MysteryMan") {
    systemBtn.classList.remove("hidden");
  } else {
    systemBtn.classList.add("hidden");
  }
});

// Άνοιγμα / κλείσιμο
if (systemBtn && systemPanel && closeSystemBtn) {
systemBtn.addEventListener("click", () => {
  console.log("🟢 System clicked");
  systemPanel.classList.remove("hidden"); // ✅ ξεκλειδώνει το panel
  systemPanel.classList.add("open");      // ✅ ενεργοποιεί το slide
  loadSystemLogs();
});

closeSystemBtn.addEventListener("click", () => {
  systemPanel.classList.remove("open");
  systemPanel.classList.add("hidden");    // ✅ το ξανακρύβει
});
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") systemPanel.classList.remove("open");
  });
}

// Φόρτωση logs
function loadSystemLogs() {
  const logsRef = ref(db, "adminLogs");
  onValue(logsRef, (snap) => {
    systemLogsDiv.innerHTML = "";
    if (!snap.exists()) {
      systemLogsDiv.innerHTML = "<p class='placeholder'>Κανένα log ακόμα.</p>";
      return;
    }

    // Μετατροπή σε array και ταξινόμηση (νεότερα πρώτα)
    const logs = Object.values(snap.val()).sort((a, b) => b.time - a.time);

    logs.forEach((log) => {
      const time = new Date(log.time);
      const dateStr = time.toLocaleDateString();
      const hourStr = time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      // 🧩 icon by action
      let icon = "📝";
      if (log.action === "deleteMessage") icon = "🗑️";
      else if (log.action === "clearChat") icon = "🧹";
      else if (log.action === "changeRole") icon = "⭐";
      else if (log.action === "kick") icon = "👢";
      else if (log.action === "ban") icon = "⛔";

      const p = document.createElement("p");
      let details = "";

if (log.action === "changeRole") {
  details = `${log.targetUser ? `<i>(${log.targetUser})</i>` : ""} 
    <span style="color:#aaa">(${log.oldRole} → ${log.newRole})</span>`;
} else {
  details = `${log.targetUser ? `<i>(${log.targetUser})</i>` : ""}`;
}

p.innerHTML = `${icon} <b>${log.admin}</b> → ${log.action} ${details}
  <span style="color:#888">in ${log.room || "?"}</span> 
  <span style="color:#555">[${dateStr} ${hourStr}]</span>`;

      systemLogsDiv.appendChild(p);
      // ➕ Αν υπάρχει reason, δείξε το
if (log.reason) {
  const reasonP = document.createElement("p");
  reasonP.style.color = "#999";
  reasonP.style.fontSize = "13px";
  reasonP.style.marginLeft = "25px";
  reasonP.textContent = `📝 Reason: ${log.reason}`;
  systemLogsDiv.appendChild(reasonP);
}

    });
  });
}
// === CLEAR LOGS BUTTON ===
const clearLogsBtn = document.getElementById("clearLogsBtn");
if (clearLogsBtn) {
  clearLogsBtn.addEventListener("click", async () => {
    const confirmClear = confirm("🧹 Θες σίγουρα να καθαρίσεις όλα τα logs;");
    if (!confirmClear) return;

    try {
      await remove(ref(db, "adminLogs"));
      systemLogsDiv.innerHTML = "<p class='placeholder'>Κανένα log ακόμα.</p>";
      console.log("✅ Admin logs cleared.");
    } catch (err) {
      console.error("❌ Clear logs failed:", err);
    }
  });
}
// ===================== COPY UID =====================
const copyUidBtn = document.getElementById("copyUid");

if (copyUidBtn) {
  copyUidBtn.addEventListener("click", async () => {
    if (!contextTargetUid) {
      alert("⚠️ No user selected!");
      return;
    }

    try {
      await navigator.clipboard.writeText(contextTargetUid);
      alert("📋 UID copied:\n" + contextTargetUid);
      console.log("✅ Copied UID:", contextTargetUid);
    } catch (err) {
      console.error("❌ Failed to copy UID:", err);
      alert("❌ Failed to copy UID");
    }

    // Κλείσε το μενού μετά την ενέργεια
    userContextMenu.classList.add("hidden");
  });
}

// ===================== BANNED USERS PANEL =====================
const bannedBtn = document.getElementById("bannedBtn");
const bannedPanel = document.getElementById("bannedPanel");
const closeBannedBtn = document.getElementById("closeBannedBtn");

// Εμφάνιση κουμπιού μόνο για MysteryMan ή admins
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    bannedBtn.classList.add("hidden");
    return;
  }

  try {
    const userSnap = await get(ref(db, "users/" + user.uid));
    const userData = userSnap.val();

    if (userData?.role === "admin" || user.displayName === "MysteryMan") {
      bannedBtn.classList.remove("hidden");
    } else {
      bannedBtn.classList.add("hidden");
    }
  } catch (err) {
    console.error("Error checking role:", err);
    bannedBtn.classList.add("hidden");
  }
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    get(ref(db, "users/" + user.uid)).then((snap) => {
      const data = snap.val();
      if (data?.role === "admin" || user.displayName === "MysteryMan") {
        bannedBtn.classList.remove("hidden");
      } else {
        bannedBtn.classList.add("hidden");
      }
    });
  }
});

// Άνοιγμα panel
if (bannedBtn) {
  bannedBtn.addEventListener("click", () => {
  bannedPanel.classList.remove("hidden"); // ✅ ξεκλείδωσε
  bannedPanel.classList.add("open");
});

}

// Κλείσιμο panel
if (closeBannedBtn) {
 closeBannedBtn.addEventListener("click", () => {
  bannedPanel.classList.remove("open");
  bannedPanel.classList.add("hidden"); // ✅ ξανακρύψε
});

}
// ===================== LOAD BANNED USERS =====================

const bannedListDiv = document.getElementById("bannedList");

function loadBannedUsers() {
  const bannedRef = ref(db, "bannedUsers");

  onValue(bannedRef, (snap) => {
    const data = snap.val();
    bannedListDiv.innerHTML = "";

    if (!data) {
      bannedListDiv.innerHTML =
        `<p class="placeholder">🚫 Κανένας χρήστης δεν είναι ban αυτή τη στιγμή.</p>`;
      return;
    }

    // Ταξινόμηση από νεότερο → παλιότερο
    const entries = Object.entries(data).sort((a, b) => b[1].time - a[1].time);

    entries.forEach(([uid, info]) => {
      const date = new Date(info.time);
      const dateStr = date.toLocaleDateString("el-GR");
      const hourStr = date.toLocaleTimeString("el-GR", { hour: "2-digit", minute: "2-digit" });

      const userDiv = document.createElement("div");
      userDiv.className = "banned-entry";
      userDiv.innerHTML = `
        <p>
          🧍‍♂️ <b>${info.displayName}</b>
          <span style="color:#aaa">— banned by ${info.bannedBy}</span><br>
          <span style="color:#888">in ${info.room || "unknown"}</span> |
<span style="color:#666">${dateStr} ${hourStr}</span><br>
<span style="color:#aaa">📝 ${info.reason || "χωρίς λόγο"}</span>

        </p>
        <button class="unban-btn" data-uid="${uid}">✅ Unban</button>
      `;

      bannedListDiv.appendChild(userDiv);
    });

    // Συνδέουμε τα κουμπιά unban
    document.querySelectorAll(".unban-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const targetUid = btn.dataset.uid;
        const confirmUnban = confirm("Θες να κάνεις UNBAN αυτόν τον χρήστη;");
        if (!confirmUnban) return;

        try {
          const currentUser = auth.currentUser;
          const bannedUserSnap = await get(ref(db, "bannedUsers/" + targetUid));
          const bannedUser = bannedUserSnap.val();

          // Διαγραφή από τη λίστα banned
          await remove(ref(db, "bannedUsers/" + targetUid));

          // Log entry
          const logRef = push(ref(db, "adminLogs"));
          await set(logRef, {
            action: "unban",
            admin: currentUser.displayName || "Unknown",
            targetUser: bannedUser?.displayName || "Unknown",
            time: Date.now()
          });

          alert(`✅ Ο χρήστης ${bannedUser?.displayName || "user"} έγινε UNBAN!`);
        } catch (err) {
          console.error("❌ Unban failed:", err);
        }
      });
    });
  });
}

// Κάθε φορά που ανοίγει το panel, κάνε load τη λίστα
if (bannedBtn) {
  bannedBtn.addEventListener("click", () => {
    bannedPanel.classList.add("open");
    loadBannedUsers();
  });
}


// ===================== YOUTUBE PANEL CONTROLS =====================
const closeYoutubeBtn = document.getElementById("closeYoutubeBtn");

if (closeYoutubeBtn) {
  closeYoutubeBtn.addEventListener("click", () => {
    // ✅ Μόνο κλείσιμο panel — ΔΕΝ σβήνουμε το iframe πλέον
    youtubePanel.classList.add("hidden");
  });
}



// ===================== DRAGGABLE YOUTUBE PANEL (IN-APP LIMITS) =====================
let isDragging = false;
let offsetX, offsetY;

const dragHeader = document.querySelector(".yt-drag-header");
const youtubePanel = document.getElementById("youtubePanel");
const appContainer = document.getElementById("app");

if (dragHeader && youtubePanel && appContainer) {
  dragHeader.addEventListener("mousedown", (e) => {
    isDragging = true;
    const rect = youtubePanel.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    dragHeader.style.cursor = "grabbing";
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;

    const appRect = appContainer.getBoundingClientRect();
    const panelRect = youtubePanel.getBoundingClientRect();

    let newLeft = e.clientX - offsetX - appRect.left;
    let newTop = e.clientY - offsetY - appRect.top;

    // ➡️ Περιορισμός εντός Convo
    newLeft = Math.max(0, Math.min(newLeft, appRect.width - panelRect.width));
    newTop = Math.max(0, Math.min(newTop, appRect.height - panelRect.height));

    youtubePanel.style.left = `${newLeft}px`;
    youtubePanel.style.top = `${newTop}px`;
    youtubePanel.style.transform = "none";
  });

  document.addEventListener("mouseup", () => {
    isDragging = false;
    dragHeader.style.cursor = "grab";
  });
}

// ===================== ADMIN CONTEXT MENU =====================
const contextMenu = document.getElementById("contextMenu");
const deleteBtn = document.getElementById("deleteMessageBtn");
const clearChatBtn = document.getElementById("clearChatBtn");

if (clearChatBtn) {
  clearChatBtn.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) return;

    // ✅ Έλεγχος ρόλου από τη βάση (όχι μόνο MysteryMan)
    const userSnap = await get(ref(db, "users/" + user.uid));
    const userData = userSnap.val();
    const role = userData?.role || "user";

    if (role !== "admin") {
      alert("⚠️ Μόνο admin μπορεί να καθαρίσει το chat!");
      return;
    }

    if (!currentRoom) {
      alert("❗ Δεν έχει επιλεγεί room!");
      return;
    }

    const confirmClear = confirm(`🧹 Θες σίγουρα να καθαρίσεις το room "${currentRoom}" ?`);
    if (!confirmClear) return;

   try {
  await remove(ref(db, "messages/" + currentRoom));
  console.log("✅ Chat cleared:", currentRoom);
     // 🧾 === Log entry στο adminLogs ===
const logRef = push(ref(db, "adminLogs"));
await set(logRef, {
  action: "clearChat",
  admin: user.displayName || "Unknown",
  room: currentRoom,
  time: Date.now()
});

     

  // 💬 Καθάρισε άμεσα το UI
  document.getElementById("messages").innerHTML = "";
} catch (err) {
  console.error("❌ Clear chat failed:", err);
}


    contextMenu.classList.add("hidden");
  });
}

let targetMessageId = null; // αποθηκεύουμε ποιο μήνυμα έγινε δεξί κλικ

// Δεξί κλικ πάνω σε μήνυμα
document.getElementById("messages").addEventListener("contextmenu", (e) => {
  e.preventDefault();

  const messageDiv = e.target.closest(".message");
  if (!messageDiv) return;

  const currentUser = auth.currentUser;
  if (!currentUser) return;

  // ✅ Έλεγχος στο DB αν είναι admin
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
      // 🔹 Πρώτα πάρε το message element για log info
      const deletedMsg = document.querySelector(`.message[data-id="${targetMessageId}"]`);

      await remove(ref(db, "messages/" + currentRoom + "/" + targetMessageId));
      console.log("✅ Message deleted:", targetMessageId);

      // 🧾 === Log entry στο adminLogs ===
      const currentUser = auth.currentUser;
      if (currentUser) {
        const logRef = push(ref(db, "adminLogs"));
        // Πάρε το room από το μήνυμα αν υπάρχει
const msgRoom =
  deletedMsg?.closest("[data-room]")?.getAttribute("data-room") || currentRoom;

await set(logRef, {
  action: "deleteMessage",
  admin: currentUser.displayName || "Unknown",
  targetUser: deletedMsg?.querySelector(".message-user")?.textContent || "Unknown",
  room: msgRoom,  // 👈 Πάντα σωστό δωμάτιο τώρα
  time: Date.now()
});

      }

      // 💬 Αφαίρεσε άμεσα το bubble από το UI
      if (deletedMsg) deletedMsg.remove();

    } catch (err) {
      console.error("❌ Delete failed:", err);
    }

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
    }, 2750);
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

  if (!mediaPanel.classList.contains("hidden")) {
    showEmojiTrail(mediaPanel); // 🎉 Trigger effect όταν ανοίγει
  }
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
// ===================== EMOJI TRAIL EFFECT =====================
function showEmojiTrail(panel) {
  const emojis = ["😂", "🔥", "💫", "❤️", "😎", "✨", "🎉", "🫶"];
  const count = 3 + Math.floor(Math.random() * 3); // 3–5 emojis
  const rect = panel.getBoundingClientRect();

  for (let i = 0; i < count; i++) {
    const span = document.createElement("span");
    span.className = "emoji-trail";
    span.textContent = emojis[Math.floor(Math.random() * emojis.length)];

    const offsetX = Math.random() * rect.width - rect.width / 2;
    const offsetY = Math.random() * 30 - 10;

    span.style.left = `${rect.left + rect.width / 2 + offsetX}px`;
    span.style.top = `${rect.top - 20 + offsetY + window.scrollY}px`;

    document.body.appendChild(span);
    setTimeout(() => span.remove(), 600);
  }
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
  onValue(ref(db, "mutes"), (mutesSnap) => {
  

  const users = usersSnap.val() || {};
  const mutes = mutesSnap.val() || {};
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

    const isMuted = !!mutes[u.uid];

if (role === "admin") {
  admins.push({ ...u, role, muted: isMuted });
} else if (role === "vip") {
  vips.push({ ...u, role, muted: isMuted });
} else if (role === "guest") {
  guests.push({ ...u, role, muted: isMuted });
} else {
  normal.push({ ...u, role, muted: isMuted });
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
        // 🔇 Αν ο χρήστης είναι muted
if (u.muted) {
  const muteIcon = document.createElement("span");
  muteIcon.textContent = "🔇";
  muteIcon.className = "role-icon mute-icon";
    muteIcon.title = "Muted";   // 👈 Tooltip σε hover
  nameSpan.appendChild(muteIcon);
}


        li.appendChild(avatarDiv);
        li.appendChild(nameSpan);
        
        
        // Δεξί κλικ (context menu) μόνο για admin
li.addEventListener("contextmenu", async (e) => {
  e.preventDefault();

  if (!auth.currentUser) return;

  // ➜ Δες το role του current user από το DB
  const snap = await get(ref(db, "users/" + auth.currentUser.uid));
  const currentUserData = snap.val();
  if (!currentUserData || currentUserData.role !== "admin") return;

  contextTargetUid = u.uid;

  // Υπολογισμός θέσης (ώστε να μένει εντός οθόνης)
  const menuWidth = userContextMenu.offsetWidth || 180;
  const menuHeight = userContextMenu.offsetHeight || 150;
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

  }); // 👈 κλείσιμο του onValue(mutes)
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

    // 🔒 Μπλοκάρουμε self-demote
    if (contextTargetUid === auth.currentUser.uid && newRole !== "admin") {
      alert("⚠️ Δεν μπορείς να αλλάξεις το δικό σου role!");
      return;
    }

// Πάρε τον τρέχοντα ρόλο του target user
const targetSnap = await get(ref(db, "users/" + contextTargetUid));
const targetData = targetSnap.val();
const oldRole = targetData?.role || "user";

// ❌ Αν ο στόχος είναι ο MysteryMan → μπλοκάρουμε
if (targetData && targetData.displayName === "MysteryMan") {
  alert("⚠️ Δεν μπορείς να πειράξεις τον MysteryMan!");
  return;
}

// Κάνε update τον νέο ρόλο
await update(ref(db, "users/" + contextTargetUid), {
  role: newRole
});

// 🧾 === Log entry στο adminLogs ===
const currentUser = auth.currentUser;
if (currentUser) {
  const logRef = push(ref(db, "adminLogs"));
  await set(logRef, {
  action: "changeRole",
  admin: currentUser.displayName || "Unknown",
  targetUser: targetData?.displayName || "Unknown",
  oldRole: oldRole,
  newRole: newRole,
  room: currentRoom || "unknown",  // 👈 προσθήκη δωματίου
  time: Date.now()
});
}

console.log("✅ Role updated:", contextTargetUid, "→", newRole);

// Κλείσε το modal μετά την αλλαγή
roleModal.classList.add("hidden");
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
// ===================== KICK USER =====================
const kickUserBtn = document.getElementById("kickUser");
if (kickUserBtn) {
  kickUserBtn.addEventListener("click", async () => {
    if (!contextTargetUid) return;

    const user = auth.currentUser;
    if (!user) return;

    const userSnap = await get(ref(db, "users/" + user.uid));
    const userData = userSnap.val();

    if (userData.role !== "admin") {
      alert("⚠️ Μόνο admin μπορεί να κάνει kick!");
      return;
    }

    const targetSnap = await get(ref(db, "users/" + contextTargetUid));
    const targetData = targetSnap.val();

    if (targetData?.displayName === "MysteryMan") {
      alert("🚫 Δεν μπορείς να κάνεις kick τον MysteryMan!");
      return;
    }

    const confirmKick = confirm(`👢 Θες σίγουρα να κάνεις kick τον ${targetData?.displayName || "user"};`);
    if (!confirmKick) return;
    // ➕ Ζήτα λόγο
const reason = prompt("Πληκτρολόγησε λόγο για το Kick (π.χ. spam, ύβρεις, διαφήμιση):");
if (!reason) {
  alert("⚠️ Ακύρωση Kick — δεν δόθηκε λόγος.");
  return;
}


    try {
      // 🔹 Kick = σβήνουμε τον χρήστη από το node users
      await remove(ref(db, "users/" + contextTargetUid));
      console.log("✅ User kicked:", targetData?.displayName || contextTargetUid);

      // 🧾 === Log entry στο adminLogs ===
      const logRef = push(ref(db, "adminLogs"));
      await set(logRef, {
        action: "kick",
        admin: user.displayName || "Unknown",
        targetUser: targetData?.displayName || "Unknown",
        room: currentRoom || "unknown",
          reason: reason, // 👈 εδώ
        time: Date.now()
      });

      // 💬 Εμφάνιση προσωρινού alert ή μήνυμα
      alert(`👢 Ο χρήστης ${targetData?.displayName || "user"} αποβλήθηκε από το chat!`);

    } catch (err) {
      console.error("❌ Kick failed:", err);
    }

    userContextMenu.classList.add("hidden");
  });
}
// ===================== BAN USER =====================
const banUserBtn = document.getElementById("banUser");
if (banUserBtn) {
  banUserBtn.addEventListener("click", async () => {
    if (!contextTargetUid) return;

    const currentUser = auth.currentUser;
    if (!currentUser) return;

    // Πάρε στοιχεία του admin
    const adminSnap = await get(ref(db, "users/" + currentUser.uid));
    const adminData = adminSnap.val();
    if (adminData.role !== "admin" && currentUser.displayName !== "MysteryMan") {
      alert("⚠️ Μόνο admin μπορεί να κάνει ban!");
      return;
    }

    // Πάρε στοιχεία του χρήστη που θα γίνει ban
    const targetSnap = await get(ref(db, "users/" + contextTargetUid));
    const targetData = targetSnap.val();

    // Προστασία MysteryMan
    if (targetData?.displayName === "MysteryMan") {
      alert("🚫 Δεν μπορείς να κάνεις ban τον MysteryMan!");
      return;
    }

    // Επιβεβαίωση ban
    const confirmBan = confirm(`⛔ Θες σίγουρα να κάνεις ban τον ${targetData?.displayName || "user"};`);
    if (!confirmBan) return;
    // ➕ Ζήτα λόγο για το Ban
const reason = prompt("Πληκτρολόγησε λόγο για το Ban (π.χ. spam links, τοξική συμπεριφορά, διαφήμιση):");
if (!reason) {
  alert("⚠️ Ακύρωση Ban — δεν δόθηκε λόγος.");
  return;
}


    try {
      // 🧱 Αποθήκευση banned user στη βάση
      await set(ref(db, "bannedUsers/" + contextTargetUid), {
        uid: contextTargetUid,
        displayName: targetData?.displayName || "Unknown",
        email: targetData?.email || "",
        bannedBy: currentUser.displayName || "Unknown",
        room: currentRoom || "unknown",
          reason: reason, // 👈 εδώ
        time: Date.now()
      });

      // 🧾 Log στο adminLogs
      const logRef = push(ref(db, "adminLogs"));
      await set(logRef, {
        action: "ban",
        admin: currentUser.displayName || "Unknown",
        targetUser: targetData?.displayName || "Unknown",
        room: currentRoom || "unknown",
          reason: reason, // 👈 εδώ
        time: Date.now()
      });

      // 💬 Εμφάνιση alert
      alert(`⛔ Ο χρήστης ${targetData?.displayName || "user"} αποκλείστηκε από το chat!`);

      // Προαιρετικά: αφαίρεση από users node
      await remove(ref(db, "users/" + contextTargetUid));

    } catch (err) {
      console.error("❌ Ban failed:", err);
    }

    userContextMenu.classList.add("hidden");
  });
}

// ===================== USER CONTEXT MENU =====================
const muteUserBtn = document.getElementById("muteUser");
const unmuteUserBtn = document.getElementById("unmuteUser");

// Mute
if (muteUserBtn) {
  muteUserBtn.addEventListener("click", async () => {
    if (!contextTargetUid) return;
// ❌ Μην αφήνεις να κάνεις mute τον εαυτό σου
if (contextTargetUid === auth.currentUser.uid) {
  alert("⚠️ Δεν μπορείς να κάνεις mute τον εαυτό σου!");
  return;
}

// ❌ Μην αφήνεις να κάνεις mute admin
const targetSnap = await get(ref(db, "users/" + contextTargetUid));
const targetData = targetSnap.val();
if (targetData && targetData.role === "admin") {
  alert("⚠️ Δεν μπορείς να κάνεις mute admin!");
  return;
}
// ❌ Αν ο στόχος είναι ο MysteryMan → μπλοκάρουμε
if (targetData && targetData.displayName === "MysteryMan") {
  alert("⚠️ Δεν μπορείς να πειράξεις τον MysteryMan!");
  return;
}

    try {
      await set(ref(db, "mutes/" + contextTargetUid), true);
      console.log("✅ User muted:", contextTargetUid);
    } catch (err) {
      console.error("❌ Error muting user:", err);
    }

    userContextMenu.classList.add("hidden");
  });
}

// Unmute
if (unmuteUserBtn) {
  unmuteUserBtn.addEventListener("click", async () => {
    if (!contextTargetUid) return;

    // ❌ Μην αφήνεις να κάνεις unmute τον εαυτό σου
    if (contextTargetUid === auth.currentUser.uid) {
      alert("⚠️ Δεν μπορείς να κάνεις unmute τον εαυτό σου!");
      return;
    }

    // ❌ Μην αφήνεις να κάνεις unmute admin
    const targetSnap = await get(ref(db, "users/" + contextTargetUid));
    const targetData = targetSnap.val();
    if (targetData && targetData.role === "admin") {
      alert("⚠️ Δεν μπορείς να κάνεις unmute admin!");
      return;
    }
// ❌ Αν ο στόχος είναι ο MysteryMan → μπλοκάρουμε
if (targetData && targetData.displayName === "MysteryMan") {
  alert("⚠️ Δεν μπορείς να πειράξεις τον MysteryMan!");
  return;
}

    try {
      await remove(ref(db, "mutes/" + contextTargetUid));
      console.log("✅ User unmuted:", contextTargetUid);
    } catch (err) {
      console.error("❌ Error unmuting user:", err);
    }

    userContextMenu.classList.add("hidden");
  });
}
