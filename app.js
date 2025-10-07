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


// π Firebase Config Ξ±ΟΟ ΟΞΏ Convo2 project
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
    // β Logged in
    authView.classList.add("hidden");
    appView.classList.remove("hidden");

    // === Extra: Presence + Rooms + Users + Messages ===
    setupPresence(user);
    renderRooms();
    renderUserList();
    switchRoom("general");

    // === Coins ===
    setupCoinsSync(user.uid);
setupAddCoinsButton(user);


  } else {
    // β Not logged in
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

    // π» Ξ€ΞΉ Ξ½Ξ± Ξ³Ξ―Ξ½Ξ΅ΞΉ Ξ±Ξ½ Ξ±ΟΞΏΟΟΞ½Ξ΄Ξ΅ΞΈΞ΅Ξ― (offline)
    onDisconnect(userRef).update({
      online: false,
      lastSeen: Date.now()
    });

    // πΉ ΞΞΉΞ¬Ξ²Ξ±ΟΞ΅ ΟΟΟΟΞ± ΟΞΉ ΟΟΞ¬ΟΟΞ΅ΞΉ Ξ�Ξ΄Ξ·
    get(userRef).then(userSnap => {
      const existing = userSnap.val() || {};

      // === Role Logic ===
      let role = existing.role || "user";
      if (user.isAnonymous) role = "guest";
      if (user.displayName === "MysteryMan") role = "admin"; // β auto-lock admin

      // === ΞΞ½Ξ·ΞΌΞ­ΟΟΟΞ· ΟΟΞΏΞΉΟΞ΅Ξ―ΟΞ½ ΟΟΟΞ―Ο overwrite ΟΞΏΟ role ===
      update(userRef, {
        uid: user.uid,
        displayName: user.displayName || "User" + Math.floor(Math.random() * 10000),
        photoURL: user.photoURL || null,
        role: role,
        online: true,
        coins: existing.coins ?? 0 // π auto-create coins field
      })
      .then(() => {
        console.log("π‘ Presence sync:", user.displayName, "| role:", role);
      })
      .catch(err => {
        console.error("β Presence role sync failed:", err);
      });
    }); // π ΞΊΞ»Ξ΅Ξ―Ξ½Ξ΅ΞΉ ΟΞΏ get(userRef).then(...)
  }); // π ΞΊΞ»Ξ΅Ξ―Ξ½Ξ΅ΞΉ ΟΞΏ onValue(...)
} // π ΞΊΞ»Ξ΅Ξ―Ξ½Ξ΅ΞΉ Ξ· function setupPresence

// ===================== COINS SYNC (LIVE) =====================
let coinsUnsubscribe = null; // ΞΊΟΞ±ΟΞ¬ΞΌΞ΅ ΟΞΏΞ½ ΟΟΞΏΞ·Ξ³ΞΏΟΞΌΞ΅Ξ½ΞΏ listener

function setupCoinsSync(uid) {
  if (!uid) return;

  const coinsRef = ref(db, "users/" + uid + "/coins");
  const coinsEl = document.getElementById("profileCoins");
  if (!coinsEl) return;

  // ΞΞ½ ΟΟΞ¬ΟΟΞ΅ΞΉ ΟΟΞΏΞ·Ξ³ΞΏΟΞΌΞ΅Ξ½ΞΏΟ listener, ΟΞΏΞ½ Ξ±ΟΞΏΟΟΞ½Ξ΄Ξ­ΞΏΟΞΌΞ΅
  if (coinsUnsubscribe) coinsUnsubscribe();

  // ΞΞ·ΞΌΞΉΞΏΟΟΞ³ΞΏΟΞΌΞ΅ Ξ½Ξ­ΞΏ listener
  const unsubscribe = onValue(coinsRef, (snap) => {
    const val = snap.exists() ? snap.val() : 0;
    coinsEl.textContent = val;
    console.log("π Coins sync update:", uid, val);
  });

  coinsUnsubscribe = unsubscribe;
}


// ===================== ADMIN ADD COINS BUTTON (PROFILE PANEL) =====================
function setupAddCoinsButton(user) {
  const btn = document.getElementById("addCoinsBtn");
  if (!btn) return;

  // π ΞΞΌΟΞ±Ξ½Ξ―ΞΆΞ΅ΟΞ±ΞΉ ΞΌΟΞ½ΞΏ Ξ±Ξ½ Ξ΅Ξ―ΟΞ±ΞΉ ΞΏ MysteryMan
  if (user.displayName === "MysteryMan") {
    btn.classList.remove("hidden");
  } else {
    btn.classList.add("hidden");
    return;
  }

  // π ΞΞ±ΞΈΞ¬ΟΞΉΟΞ΅ ΟΞ±Ξ»ΞΉΟ listener
  const newBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(newBtn, btn);

  // β ΞΞ­ΞΏΟ listener
  newBtn.addEventListener("click", async () => {
    const panel = document.getElementById("profilePanel");
    const targetUid = panel?.dataset.viewingUid || user.uid;

    const amount = parseInt(
      prompt("π Ξ ΟΟΞ± coins Ξ½Ξ± ΟΟΞΏΟΞΈΞ­ΟΞ΅ΞΉΟ;", "100"),
      10
    );
    if (isNaN(amount) || amount <= 0) return;

    const targetRef = ref(db, "users/" + targetUid + "/coins");
    const snap = await get(targetRef);
    const currentCoins = snap.exists() ? snap.val() : 0;

    await set(targetRef, currentCoins + amount);

    // ΞΞ�Ξ½ΟΞΌΞ± Ξ΅ΟΞΉΟΟΟΞ―Ξ±Ο
    if (targetUid === user.uid) {
      alert(`β Ξ ΟΟΟΞΈΞ΅ΟΞ΅Ο ${amount} coins ΟΟΞΏΞ½ Ξ΅Ξ±ΟΟΟ ΟΞΏΟ!`);
    } else {
      alert(`β Ξ ΟΟΟΞΈΞ΅ΟΞ΅Ο ${amount} coins ΟΟΞΏΞ½ ΟΟΞ�ΟΟΞ·!`);
    }
  });
}

// ===================== ADMIN ADD COINS TO USER =====================
document.addEventListener("DOMContentLoaded", () => {
  let addCoinsUserBtn = document.getElementById("addCoinsUser");

  if (addCoinsUserBtn) {
    // ΞΞ±ΞΈΞ¬ΟΞΉΟΞ΅ ΟΟΞΏΞ·Ξ³ΞΏΟΞΌΞ΅Ξ½ΞΏΟΟ listeners
    const newBtn = addCoinsUserBtn.cloneNode(true);
    addCoinsUserBtn.parentNode.replaceChild(newBtn, addCoinsUserBtn);
    addCoinsUserBtn = newBtn;

    addCoinsUserBtn.addEventListener("click", async () => {
      if (!contextTargetUid) {
        alert("β οΈ No user selected!");
        return;
      }

      const currentUser = auth.currentUser;
      if (!currentUser || currentUser.displayName !== "MysteryMan") {
        alert("β ΞΟΞ½ΞΏ ΞΏ MysteryMan ΞΌΟΞΏΟΞ΅Ξ― Ξ½Ξ± Ξ΄ΟΟΞ΅ΞΉ coins!");
        userContextMenu.classList.add("hidden");
        return;
      }

      const addAmount = parseInt(
        prompt("π Ξ ΟΟΞ± coins Ξ½Ξ± ΟΟΞΏΟΞΈΞ­ΟΟ ΟΞ΅ Ξ±ΟΟΟΞ½ ΟΞΏΞ½ ΟΟΞ�ΟΟΞ·;", "50"),
        10
      );
      if (isNaN(addAmount) || addAmount <= 0) {
        alert("β ΞΞΊΟΟΞΏ ΟΞΏΟΟ!");
        userContextMenu.classList.add("hidden");
        return;
      }

      try {
        const userRef = ref(db, "users/" + contextTargetUid);
        const snap = await get(userRef);
        const userData = snap.val() || {};
        const currentCoins = userData.coins || 0;

        await update(userRef, {
          coins: currentCoins + addAmount
        });

        console.log(`π Admin added ${addAmount} coins to UID: ${contextTargetUid}`);
        alert(`β Ξ ΟΞΏΟΟΞ­ΞΈΞ·ΞΊΞ±Ξ½ ${addAmount} coins!`);

        const logRef = push(ref(db, "adminLogs"));
        await set(logRef, {
          action: "Add Coins",
          targetUid: contextTargetUid,
          admin: currentUser.displayName,
          amount: addAmount,
          time: Date.now(),
        });

        const coinsEl = document.getElementById("profileCoins");
        if (coinsEl && coinsEl.textContent) {
          const shown = parseInt(coinsEl.textContent, 10) || 0;
          coinsEl.textContent = shown + addAmount;
        }

      } catch (err) {
        console.error("β Add coins to user failed:", err);
        alert("β ΞΟΞΏΟΟΟΞ―Ξ± ΟΟΞΏΟΞΈΞ�ΞΊΞ·Ο coins.");
      }

      userContextMenu.classList.add("hidden");
    });
  }
});
// ===================== ROOMS =====================
const defaultRooms = ["general", "random"];

async function renderRooms() {
  const roomsList = document.getElementById("roomsList");
  if (!roomsList) return;

  roomsList.innerHTML = "";

  // Ξ£ΞΉΞ³ΞΏΟΟΞ΅ΟΟΞΌΞ±ΟΟΞ΅ ΟΟΞΉ ΟΟΞ¬ΟΟΞΏΟΞ½ ΟΞ± default rooms
  await Promise.all(defaultRooms.map(async (roomName) => {
    const snap = await get(child(ref(db), `rooms/${roomName}`));
    if (!snap.exists()) {
      await set(ref(db, `rooms/${roomName}`), {
        name: roomName,
        createdAt: Date.now()
      });
    }
  }));

  // β ΞΞ±ΞΈΞ±ΟΞ―ΞΆΞΏΟΞΌΞ΅ ΟΟΟΟΞ½ ΟΞ±Ξ»ΞΉΞΏΟΟ listeners ΟΟΞΉΞ½ Ξ²Ξ¬Ξ»ΞΏΟΞΌΞ΅ ΞΊΞ±ΞΉΞ½ΞΏΟΟΞ³ΞΉΞΏ
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

// ΞΞ­ΞΏ room button
const newRoomBtn = document.getElementById("newRoomBtn");
if (newRoomBtn) {
  newRoomBtn.addEventListener("click", async () => {
    const name = prompt("Enter room name:");
    if (!name) return;

    const roomRef = ref(db, "rooms/" + name);
    const snap = await get(roomRef);
    if (snap.exists()) {
      alert("β οΈ Ξ€ΞΏ room ΟΟΞ¬ΟΟΞ΅ΞΉ Ξ�Ξ΄Ξ·!");
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

// π Indicator reference (ΞΊΟΞ±ΟΞ¬ΞΌΞ΅ ΟΞΏ element Ξ³ΞΉΞ± ΞΌΞ΅Ξ»Ξ»ΞΏΞ½ΟΞΉΞΊΞ� ΟΟΞ�ΟΞ·)
const newMessagesIndicator = document.getElementById("newMessagesIndicator");

// ΞΞ¬Ξ½Ξ΅ ΟΞΏ clickable -> ΟΞ¬Ξ΅ΞΉ ΟΟΞΏ ΟΞ­Ξ»ΞΏΟ (ΞΈΞ± Ξ΄ΞΏΟΞ»Ξ­ΟΞ΅ΞΉ ΞΌΟΞ½ΞΏ manual)
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
  watchTyping(room); // π Ξ΅Ξ΄Ο ΞΌΟΞ±Ξ―Ξ½Ξ΅ΞΉ Ξ· ΟΟΞ½Ξ΄Ξ΅ΟΞ·
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
  // Regex ΟΞΏΟ ΟΞΉΞ¬Ξ½Ξ΅ΞΉ emoji (ΟΞΉΞΏ Ξ±ΟΞ»Ο ΞΊΞ±ΞΉ safe)
  const emojiRegex = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu;
  const matches = text.match(emojiRegex);

  if (!matches) return false;

  // Trim Ξ³ΞΉΞ± Ξ½Ξ± Ξ²Ξ³Ξ¬Ξ»ΞΏΟΞΌΞ΅ ΟΟΟΟΞ½ ΞΊΞ΅Ξ½Ξ¬
  const stripped = text.trim();

  // ΞΞ»Ξ­Ξ³ΟΞΏΟΞΌΞ΅ ΟΟΞΉ ΟΞ»ΞΏ ΟΞΏ string Ξ΅Ξ―Ξ½Ξ±ΞΉ ΞΌΟΞ½ΞΏ emoji
  return matches.join('') === stripped;
}


// ===================== RENDER MESSAGES (Optimized) =====================
function renderMessages(room) {
  const messagesRef = ref(db, "messages/" + room);
  const messagesDiv = document.getElementById("messages");
  if (!messagesDiv) return;

  // ΞΞ±ΞΈΞ±ΟΞ―ΞΆΞ΅ΞΉ ΞΌΟΞ½ΞΏ ΞΞΞ ΟΞΏΟΞ¬ ΟΟΞ·Ξ½ Ξ±Ξ»Ξ»Ξ±Ξ³Ξ� room
  messagesDiv.innerHTML = "";
  off(messagesRef);

  onValue(messagesRef, (snap) => {
    const existingIds = new Set(
      Array.from(messagesDiv.querySelectorAll(".message")).map(el => el.dataset.id)
    );

    snap.forEach(childSnap => {
      const msgId = childSnap.key;
      const msg = childSnap.val();
      if (existingIds.has(msgId)) return; // β ΞΞ·Ξ½ ΞΎΞ±Ξ½Ξ±ΟΟΞΏΟΞΈΞ­ΟΞ΅ΞΉΟ ΟΟΞ¬ΟΟΞΏΞ½ ΞΌΞ�Ξ½ΟΞΌΞ±

      // === Container ===
      const messageDiv = document.createElement("div");
      messageDiv.className = "message";
      messageDiv.dataset.id = msgId;

      // ΞΞ½ Ξ΅Ξ―Ξ½Ξ±ΞΉ ΟΞΏ Ξ΄ΞΉΞΊΟ ΞΌΞΏΟ uid -> Ξ²Ξ¬Ξ»Ξ΅ class "mine"
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

      // Username (ΟΞ¬Ξ½Ο Ξ±ΟΟ ΟΞΏ bubble)
      const userDiv = document.createElement("div");
      userDiv.className = "message-user";
      userDiv.textContent = msg.user || "Anon";
      contentDiv.appendChild(userDiv);

      // === Bubble ===
      if (msg.text) {
        const bubbleDiv = document.createElement("div");
        bubbleDiv.className = "message-bubble";

        // ΞΟΞ±ΞΌΞΌΞ� 1: Text
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
          line1.textContent = ""; // β ΞΞ·Ξ½ Ξ΄Ξ΅Ξ―ΞΎΞ΅ΞΉΟ URL
        } else {
          // β ΞΞ±Ξ½ΞΏΞ½ΞΉΞΊΞ¬ ΞΌΞ·Ξ½ΟΞΌΞ±ΟΞ±
          line1.textContent = msg.text;

          // β Emoji-only check
          if (isEmojiOnly(msg.text)) {
            const emojiCount = msg.text.match(/\p{Extended_Pictographic}/gu).length;
            bubbleDiv.classList.add("emoji-only");
            if (emojiCount <= 2) {
              bubbleDiv.classList.add("big");
            }
          }
        }

        // ΞΟΞ±ΞΌΞΌΞ� 2: Date + Time
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

    // β Scroll ΞΌΟΞ½ΞΏ Ξ±Ξ½ Ξ΅Ξ―ΟΞ±ΞΉ Ξ�Ξ΄Ξ· ΞΊΞ¬ΟΟ
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

    // π Check mute
    const muteSnap = await get(ref(db, "mutes/" + user.uid));
    if (muteSnap.exists()) {
      alert("β οΈ ΞΞ―ΟΞ±ΞΉ muted ΞΊΞ±ΞΉ Ξ΄Ξ΅Ξ½ ΞΌΟΞΏΟΞ΅Ξ―Ο Ξ½Ξ± ΟΟΞ΅Ξ―Ξ»Ξ΅ΞΉΟ ΞΌΞ·Ξ½ΟΞΌΞ±ΟΞ±.");
      return;
    }

    // ΞΞ½ Ξ΄Ξ΅Ξ½ Ξ΅Ξ―Ξ½Ξ±ΞΉ muted β ΟΟΞ­Ξ»Ξ½Ξ΅ΞΉ ΞΊΞ±Ξ½ΞΏΞ½ΞΉΞΊΞ¬
    await push(ref(db, "messages/" + currentRoom), {
      uid: user?.uid,
      user: user?.displayName || "Guest",
      text,
      createdAt: serverTimestamp()
    });

    // π ΞΞ»Ξ΅Ξ―ΟΞ΅ ΟΞΏ emoji panel ΞΞΞΞ ΞΌΞ΅ΟΞ¬ ΟΞ·Ξ½ Ξ±ΟΞΏΟΟΞΏΞ»Ξ�
    closeEmojiPanel();

    input.value = "";
    input.style.height = "40px"; // π reset ΟΟΞΏ default ΟΟΞΏΟ
    input.focus();
  });
}
// ===================== TOGGLE YOUTUBE BUTTON =====================
const toggleYoutubeBtn = document.getElementById("toggleYoutubeBtn");

if (toggleYoutubeBtn) {
  toggleYoutubeBtn.addEventListener("click", () => {
    youtubePanel.classList.toggle("hidden");

    if (youtubePanel.classList.contains("hidden")) {
      toggleYoutubeBtn.textContent = "YouTube";   // ΟΟΞ±Ξ½ Ξ΅Ξ―Ξ½Ξ±ΞΉ ΞΊΞ»Ξ΅ΞΉΟΟΟ
    } else {
      toggleYoutubeBtn.textContent = "Hide YouTube"; // ΟΟΞ±Ξ½ Ξ΅Ξ―Ξ½Ξ±ΞΉ Ξ±Ξ½ΞΏΞΉΟΟΟ
    }
  });
}
// ===================== PROFILE PANEL =====================
const profileBtn = document.getElementById("headerUser");
const profilePanel = document.getElementById("profilePanel");
const closeProfileBtn = document.getElementById("closeProfileBtn");

// ΞΞ½ΞΏΞΉΞ³ΞΌΞ± panel (ΟΞ¬Ξ½ΟΞ± ΟΞΏ Ξ΄ΞΉΞΊΟ ΟΞΏΟ ΟΟΞΏΟΞ―Ξ»)
if (profileBtn && profilePanel) {
  profileBtn.addEventListener("click", () => {
    openProfilePanel(auth.currentUser.uid);
  });
}

// ΞΞ»Ξ΅Ξ―ΟΞΉΞΌΞΏ panel + ΞΊΞ±ΞΈΞ¬ΟΞΉΟΞΌΞ± listener
if (closeProfileBtn) {
  closeProfileBtn.addEventListener("click", () => {
    profilePanel.classList.remove("show");
    profilePanel.classList.add("hidden");

    // π§Ή ΞΞ±ΞΈΞ¬ΟΞΉΟΞΌΞ± coins listener ΟΟΞ±Ξ½ ΞΊΞ»Ξ΅Ξ―Ξ½Ξ΅ΞΉ ΟΞΏ Profile Panel
    if (typeof coinsUnsubscribe === "function") {
      coinsUnsubscribe();
      coinsUnsubscribe = null;
      console.log("π§Ή Coins listener unsubscribed");
    }
  });
}

// ΞΞ»Ξ΅Ξ―ΟΞΉΞΌΞΏ ΞΌΞ΅ Esc
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    profilePanel.classList.remove("show");
    profilePanel.classList.add("hidden");
  }
});

// Tabs Ξ»Ξ΅ΞΉΟΞΏΟΟΞ³Ξ―Ξ±
const tabButtons = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    tabButtons.forEach((b) => b.classList.remove("active"));
    tabContents.forEach((c) => c.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("tab-" + btn.dataset.tab).classList.add("active");
  });
});

// β ΞΟΞ±Ξ½Ξ±ΟΞΏΟΞ¬ listener Ξ³ΞΉΞ± ΟΞΏ Add Coins ΞΊΞΏΟΞΌΟΞ― (Ξ±Ξ½ ΟΟΞ¬ΟΟΞ΅ΞΉ)
document.addEventListener("click", () => {
  const btn = document.getElementById("addCoinsUser");
  if (btn && !btn.dataset.listenerAdded) {
    btn.dataset.listenerAdded = "true";

    btn.addEventListener("click", async () => {
      if (!contextTargetUid) {
        alert("β οΈ No user selected!");
        return;
      }

      const currentUser = auth.currentUser;
      if (!currentUser || currentUser.displayName !== "MysteryMan") {
        alert("β ΞΟΞ½ΞΏ ΞΏ MysteryMan ΞΌΟΞΏΟΞ΅Ξ― Ξ½Ξ± Ξ΄ΟΟΞ΅ΞΉ coins!");
        userContextMenu.classList.add("hidden");
        return;
      }

      const addAmount = parseInt(
        prompt("π Ξ ΟΟΞ± coins Ξ½Ξ± ΟΟΞΏΟΞΈΞ­ΟΟ ΟΞ΅ Ξ±ΟΟΟΞ½ ΟΞΏΞ½ ΟΟΞ�ΟΟΞ·;", "50"),
        10
      );
      if (isNaN(addAmount) || addAmount <= 0) return;

      const targetRef = ref(db, "users/" + contextTargetUid + "/coins");
      const snap = await get(targetRef);
      const currentCoins = snap.exists() ? snap.val() : 0;

      await set(targetRef, currentCoins + addAmount);
      alert(`β Ξ ΟΞΏΟΟΞ­ΞΈΞ·ΞΊΞ±Ξ½ ${addAmount} coins!`);
      userContextMenu.classList.add("hidden");
    });
  }
});



// ===================== PROFILE PANEL (LOAD USER INFO) =====================
async function openProfilePanel(uid = null) {
  const panel = document.getElementById("profilePanel");
  if (!panel) return;

  panel.classList.remove("hidden");
  panel.classList.add("show");

  const targetUid = uid || auth.currentUser.uid;
  // π ΞΟΞΏΞΈΞ·ΞΊΞ΅ΟΞΏΟΞΌΞ΅ ΟΞΏΞΉΞΏ ΟΟΞΏΟΞ―Ξ» Ξ²Ξ»Ξ­ΟΞΏΟΞΌΞ΅ Ξ±ΟΟΞ� ΟΞ· ΟΟΞΉΞ³ΞΌΞ�
if (panel) {
  panel.dataset.viewingUid = targetUid;
}

  const snap = await get(ref(db, "users/" + targetUid));
  const data = snap.val();

  if (!data) {
    console.warn("β οΈ No user data found for", targetUid);
    return;
  }

  // === Update UI ===
  document.getElementById("profileName").textContent = data.displayName || "Unknown";
  document.getElementById("profileAvatar").src = data.photoURL || "https://i.pravatar.cc/150";
  document.getElementById("profileRole").textContent = data.role || "user";
  document.getElementById("profileCoins").textContent = data.coins ?? 0;


  // === Live coins sync Ξ³ΞΉΞ± ΟΞΏΞ½ ΟΟΞ�ΟΟΞ· ΟΞΏΟ Ξ²Ξ»Ξ­ΟΞΏΟΞΌΞ΅ ===
  setupCoinsSync(targetUid);
}

// ===================== VIEW PROFILE (CONTEXT MENU) =====================
const viewProfileBtn = document.getElementById("viewProfile");
if (viewProfileBtn) {
  viewProfileBtn.addEventListener("click", () => {
  if (!contextTargetUid) return alert("β οΈ No user selected!");
  openProfilePanel(contextTargetUid); // π Ξ΄Ξ΅Ξ―ΟΞ½Ξ΅ΞΉ ΟΞΏ profile ΟΞΏΟ Ξ¬Ξ»Ξ»ΞΏΟ
  userContextMenu.classList.add("hidden");
});

}



// ===================== SYSTEM PANEL =====================
const systemBtn = document.getElementById("systemBtn");
const systemPanel = document.getElementById("systemPanel");
const closeSystemBtn = document.getElementById("closeSystemBtn");
const systemLogsDiv = document.getElementById("systemLogs");

// ΞΞΌΟΞ¬Ξ½ΞΉΟΞ· ΞΊΞΏΟΞΌΟΞΉΞΏΟ ΞΌΟΞ½ΞΏ Ξ³ΞΉΞ± MysteryMan
onAuthStateChanged(auth, (user) => {
  if (user && user.displayName === "MysteryMan") {
    systemBtn.classList.remove("hidden");
  } else {
    systemBtn.classList.add("hidden");
  }
});

// ΞΞ½ΞΏΞΉΞ³ΞΌΞ± / ΞΊΞ»Ξ΅Ξ―ΟΞΉΞΌΞΏ
if (systemBtn && systemPanel && closeSystemBtn) {
systemBtn.addEventListener("click", () => {
  console.log("π’ System clicked");
  systemPanel.classList.remove("hidden"); // β ΞΎΞ΅ΞΊΞ»Ξ΅ΞΉΞ΄ΟΞ½Ξ΅ΞΉ ΟΞΏ panel
  systemPanel.classList.add("open");      // β Ξ΅Ξ½Ξ΅ΟΞ³ΞΏΟΞΏΞΉΞ΅Ξ― ΟΞΏ slide
  loadSystemLogs();
});

closeSystemBtn.addEventListener("click", () => {
  systemPanel.classList.remove("open");
  systemPanel.classList.add("hidden");    // β ΟΞΏ ΞΎΞ±Ξ½Ξ±ΞΊΟΟΞ²Ξ΅ΞΉ
});
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") systemPanel.classList.remove("open");
  });
}

// Ξ¦ΟΟΟΟΟΞ· logs
function loadSystemLogs() {
  const logsRef = ref(db, "adminLogs");
  onValue(logsRef, (snap) => {
    systemLogsDiv.innerHTML = "";
    if (!snap.exists()) {
      systemLogsDiv.innerHTML = "<p class='placeholder'>ΞΞ±Ξ½Ξ­Ξ½Ξ± log Ξ±ΞΊΟΞΌΞ±.</p>";
      return;
    }

    // ΞΞ΅ΟΞ±ΟΟΞΏΟΞ� ΟΞ΅ array ΞΊΞ±ΞΉ ΟΞ±ΞΎΞΉΞ½ΟΞΌΞ·ΟΞ· (Ξ½Ξ΅ΟΟΞ΅ΟΞ± ΟΟΟΟΞ±)
    const logs = Object.values(snap.val()).sort((a, b) => b.time - a.time);

    logs.forEach((log) => {
      const time = new Date(log.time);
      const dateStr = time.toLocaleDateString();
      const hourStr = time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      // π§© icon by action
      let icon = "π";
      if (log.action === "deleteMessage") icon = "ποΈ";
      else if (log.action === "clearChat") icon = "π§Ή";
      else if (log.action === "changeRole") icon = "β­";
      else if (log.action === "kick") icon = "π’";
      else if (log.action === "ban") icon = "β";

      const p = document.createElement("p");
      let details = "";

if (log.action === "changeRole") {
  details = `${log.targetUser ? `<i>(${log.targetUser})</i>` : ""} 
    <span style="color:#aaa">(${log.oldRole} β ${log.newRole})</span>`;
} else {
  details = `${log.targetUser ? `<i>(${log.targetUser})</i>` : ""}`;
}

p.innerHTML = `${icon} <b>${log.admin}</b> β ${log.action} ${details}
  <span style="color:#888">in ${log.room || "?"}</span> 
  <span style="color:#555">[${dateStr} ${hourStr}]</span>`;

      systemLogsDiv.appendChild(p);
      // β ΞΞ½ ΟΟΞ¬ΟΟΞ΅ΞΉ reason, Ξ΄Ξ΅Ξ―ΞΎΞ΅ ΟΞΏ
if (log.reason) {
  const reasonP = document.createElement("p");
  reasonP.style.color = "#999";
  reasonP.style.fontSize = "13px";
  reasonP.style.marginLeft = "25px";
  reasonP.textContent = `π Reason: ${log.reason}`;
  systemLogsDiv.appendChild(reasonP);
}

    });
  });
}
// === CLEAR LOGS BUTTON ===
const clearLogsBtn = document.getElementById("clearLogsBtn");
if (clearLogsBtn) {
  clearLogsBtn.addEventListener("click", async () => {
    const confirmClear = confirm("π§Ή ΞΞ΅Ο ΟΞ―Ξ³ΞΏΟΟΞ± Ξ½Ξ± ΞΊΞ±ΞΈΞ±ΟΞ―ΟΞ΅ΞΉΟ ΟΞ»Ξ± ΟΞ± logs;");
    if (!confirmClear) return;

    try {
      await remove(ref(db, "adminLogs"));
      systemLogsDiv.innerHTML = "<p class='placeholder'>ΞΞ±Ξ½Ξ­Ξ½Ξ± log Ξ±ΞΊΟΞΌΞ±.</p>";
      console.log("β Admin logs cleared.");
    } catch (err) {
      console.error("β Clear logs failed:", err);
    }
  });
}
// ===================== COPY UID =====================
const copyUidBtn = document.getElementById("copyUid");

if (copyUidBtn) {
  copyUidBtn.addEventListener("click", async () => {
    if (!contextTargetUid) {
      alert("β οΈ No user selected!");
      return;
    }

    try {
      await navigator.clipboard.writeText(contextTargetUid);
      alert("π UID copied:\n" + contextTargetUid);
      console.log("β Copied UID:", contextTargetUid);
    } catch (err) {
      console.error("β Failed to copy UID:", err);
      alert("β Failed to copy UID");
    }

    // ΞΞ»Ξ΅Ξ―ΟΞ΅ ΟΞΏ ΞΌΞ΅Ξ½ΞΏΟ ΞΌΞ΅ΟΞ¬ ΟΞ·Ξ½ Ξ΅Ξ½Ξ­ΟΞ³Ξ΅ΞΉΞ±
    userContextMenu.classList.add("hidden");
  });
}

// ===================== BANNED USERS PANEL =====================
const bannedBtn = document.getElementById("bannedBtn");
const bannedPanel = document.getElementById("bannedPanel");
const closeBannedBtn = document.getElementById("closeBannedBtn");

// ΞΞΌΟΞ¬Ξ½ΞΉΟΞ· ΞΊΞΏΟΞΌΟΞΉΞΏΟ ΞΌΟΞ½ΞΏ Ξ³ΞΉΞ± MysteryMan Ξ� admins
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

// ΞΞ½ΞΏΞΉΞ³ΞΌΞ± panel
if (bannedBtn) {
  bannedBtn.addEventListener("click", () => {
  bannedPanel.classList.remove("hidden"); // β ΞΎΞ΅ΞΊΞ»Ξ΅Ξ―Ξ΄ΟΟΞ΅
  bannedPanel.classList.add("open");
});

}

// ΞΞ»Ξ΅Ξ―ΟΞΉΞΌΞΏ panel
if (closeBannedBtn) {
 closeBannedBtn.addEventListener("click", () => {
  bannedPanel.classList.remove("open");
  bannedPanel.classList.add("hidden"); // β ΞΎΞ±Ξ½Ξ±ΞΊΟΟΟΞ΅
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
        `<p class="placeholder">π« ΞΞ±Ξ½Ξ­Ξ½Ξ±Ο ΟΟΞ�ΟΟΞ·Ο Ξ΄Ξ΅Ξ½ Ξ΅Ξ―Ξ½Ξ±ΞΉ ban Ξ±ΟΟΞ� ΟΞ· ΟΟΞΉΞ³ΞΌΞ�.</p>`;
      return;
    }

    // Ξ€Ξ±ΞΎΞΉΞ½ΟΞΌΞ·ΟΞ· Ξ±ΟΟ Ξ½Ξ΅ΟΟΞ΅ΟΞΏ β ΟΞ±Ξ»ΞΉΟΟΞ΅ΟΞΏ
    const entries = Object.entries(data).sort((a, b) => b[1].time - a[1].time);

    entries.forEach(([uid, info]) => {
      const date = new Date(info.time);
      const dateStr = date.toLocaleDateString("el-GR");
      const hourStr = date.toLocaleTimeString("el-GR", { hour: "2-digit", minute: "2-digit" });

      const userDiv = document.createElement("div");
      userDiv.className = "banned-entry";
      userDiv.innerHTML = `
        <p>
          π§ββοΈ <b>${info.displayName}</b>
          <span style="color:#aaa">β banned by ${info.bannedBy}</span><br>
          <span style="color:#888">in ${info.room || "unknown"}</span> |
<span style="color:#666">${dateStr} ${hourStr}</span><br>
<span style="color:#aaa">π ${info.reason || "ΟΟΟΞ―Ο Ξ»ΟΞ³ΞΏ"}</span>

        </p>
        <button class="unban-btn" data-uid="${uid}">β Unban</button>
      `;

      bannedListDiv.appendChild(userDiv);
    });

    // Ξ£ΟΞ½Ξ΄Ξ­ΞΏΟΞΌΞ΅ ΟΞ± ΞΊΞΏΟΞΌΟΞΉΞ¬ unban
    document.querySelectorAll(".unban-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const targetUid = btn.dataset.uid;
        const confirmUnban = confirm("ΞΞ΅Ο Ξ½Ξ± ΞΊΞ¬Ξ½Ξ΅ΞΉΟ UNBAN Ξ±ΟΟΟΞ½ ΟΞΏΞ½ ΟΟΞ�ΟΟΞ·;");
        if (!confirmUnban) return;

        try {
          const currentUser = auth.currentUser;
          const bannedUserSnap = await get(ref(db, "bannedUsers/" + targetUid));
          const bannedUser = bannedUserSnap.val();

          // ΞΞΉΞ±Ξ³ΟΞ±ΟΞ� Ξ±ΟΟ ΟΞ· Ξ»Ξ―ΟΟΞ± banned
          await remove(ref(db, "bannedUsers/" + targetUid));

          // Log entry
          const logRef = push(ref(db, "adminLogs"));
          await set(logRef, {
            action: "unban",
            admin: currentUser.displayName || "Unknown",
            targetUser: bannedUser?.displayName || "Unknown",
            time: Date.now()
          });

          alert(`β Ξ ΟΟΞ�ΟΟΞ·Ο ${bannedUser?.displayName || "user"} Ξ­Ξ³ΞΉΞ½Ξ΅ UNBAN!`);
        } catch (err) {
          console.error("β Unban failed:", err);
        }
      });
    });
  });
}

// ΞΞ¬ΞΈΞ΅ ΟΞΏΟΞ¬ ΟΞΏΟ Ξ±Ξ½ΞΏΞ―Ξ³Ξ΅ΞΉ ΟΞΏ panel, ΞΊΞ¬Ξ½Ξ΅ load ΟΞ· Ξ»Ξ―ΟΟΞ±
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
    // β ΞΟΞ½ΞΏ ΞΊΞ»Ξ΅Ξ―ΟΞΉΞΌΞΏ panel β ΞΞΞ ΟΞ²Ξ�Ξ½ΞΏΟΞΌΞ΅ ΟΞΏ iframe ΟΞ»Ξ­ΞΏΞ½
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

    // β‘οΈ Ξ Ξ΅ΟΞΉΞΏΟΞΉΟΞΌΟΟ Ξ΅Ξ½ΟΟΟ Convo
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

    // β ΞΞ»Ξ΅Ξ³ΟΞΏΟ ΟΟΞ»ΞΏΟ Ξ±ΟΟ ΟΞ· Ξ²Ξ¬ΟΞ· (ΟΟΞΉ ΞΌΟΞ½ΞΏ MysteryMan)
    const userSnap = await get(ref(db, "users/" + user.uid));
    const userData = userSnap.val();
    const role = userData?.role || "user";

    if (role !== "admin") {
      alert("β οΈ ΞΟΞ½ΞΏ admin ΞΌΟΞΏΟΞ΅Ξ― Ξ½Ξ± ΞΊΞ±ΞΈΞ±ΟΞ―ΟΞ΅ΞΉ ΟΞΏ chat!");
      return;
    }

    if (!currentRoom) {
      alert("β ΞΞ΅Ξ½ Ξ­ΟΞ΅ΞΉ Ξ΅ΟΞΉΞ»Ξ΅Ξ³Ξ΅Ξ― room!");
      return;
    }

    const confirmClear = confirm(`π§Ή ΞΞ΅Ο ΟΞ―Ξ³ΞΏΟΟΞ± Ξ½Ξ± ΞΊΞ±ΞΈΞ±ΟΞ―ΟΞ΅ΞΉΟ ΟΞΏ room "${currentRoom}" ?`);
    if (!confirmClear) return;

   try {
  await remove(ref(db, "messages/" + currentRoom));
  console.log("β Chat cleared:", currentRoom);
     // π§Ύ === Log entry ΟΟΞΏ adminLogs ===
const logRef = push(ref(db, "adminLogs"));
await set(logRef, {
  action: "clearChat",
  admin: user.displayName || "Unknown",
  room: currentRoom,
  time: Date.now()
});

     

  // π¬ ΞΞ±ΞΈΞ¬ΟΞΉΟΞ΅ Ξ¬ΞΌΞ΅ΟΞ± ΟΞΏ UI
  document.getElementById("messages").innerHTML = "";
} catch (err) {
  console.error("β Clear chat failed:", err);
}


    contextMenu.classList.add("hidden");
  });
}

let targetMessageId = null; // Ξ±ΟΞΏΞΈΞ·ΞΊΞ΅ΟΞΏΟΞΌΞ΅ ΟΞΏΞΉΞΏ ΞΌΞ�Ξ½ΟΞΌΞ± Ξ­Ξ³ΞΉΞ½Ξ΅ Ξ΄Ξ΅ΞΎΞ― ΞΊΞ»ΞΉΞΊ

// ΞΞ΅ΞΎΞ― ΞΊΞ»ΞΉΞΊ ΟΞ¬Ξ½Ο ΟΞ΅ ΞΌΞ�Ξ½ΟΞΌΞ±
document.getElementById("messages").addEventListener("contextmenu", (e) => {
  e.preventDefault();

  const messageDiv = e.target.closest(".message");
  if (!messageDiv) return;

  const currentUser = auth.currentUser;
  if (!currentUser) return;

  // β ΞΞ»Ξ΅Ξ³ΟΞΏΟ ΟΟΞΏ DB Ξ±Ξ½ Ξ΅Ξ―Ξ½Ξ±ΞΉ admin
  const userRef = ref(db, "users/" + currentUser.uid);
  get(userRef).then((snap) => {
    const u = snap.val();
    if (!u || u.role !== "admin") return;

    targetMessageId = messageDiv.dataset.id;

    // Ξ€ΞΏΟΞΏΞΈΞ­ΟΞ·ΟΞ· ΟΞΏΟ menu ΟΟΞ· ΞΈΞ­ΟΞ· ΟΞΏΟ ΞΊΞ»ΞΉΞΊ
    contextMenu.style.top = e.pageY + "px";
    contextMenu.style.left = e.pageX + "px";
    contextMenu.classList.remove("hidden");
  });
});

// ΞΞ»Ξ΅Ξ―ΟΞΉΞΌΞΏ ΞΌΞ΅ ΞΊΞ»ΞΉΞΊ Ξ­ΞΎΟ
document.addEventListener("click", () => {
  contextMenu.classList.add("hidden");
});

// ΞΞ»ΞΉΞΊ ΟΟΞΏ Delete
if (deleteBtn) {
  deleteBtn.addEventListener("click", async () => {
    if (!targetMessageId) return;

    try {
      // πΉ Ξ ΟΟΟΞ± ΟΞ¬ΟΞ΅ ΟΞΏ message element Ξ³ΞΉΞ± log info
      const deletedMsg = document.querySelector(`.message[data-id="${targetMessageId}"]`);

      await remove(ref(db, "messages/" + currentRoom + "/" + targetMessageId));
      console.log("β Message deleted:", targetMessageId);

      // π§Ύ === Log entry ΟΟΞΏ adminLogs ===
      const currentUser = auth.currentUser;
      if (currentUser) {
        const logRef = push(ref(db, "adminLogs"));
        // Ξ Ξ¬ΟΞ΅ ΟΞΏ room Ξ±ΟΟ ΟΞΏ ΞΌΞ�Ξ½ΟΞΌΞ± Ξ±Ξ½ ΟΟΞ¬ΟΟΞ΅ΞΉ
const msgRoom =
  deletedMsg?.closest("[data-room]")?.getAttribute("data-room") || currentRoom;

await set(logRef, {
  action: "deleteMessage",
  admin: currentUser.displayName || "Unknown",
  targetUser: deletedMsg?.querySelector(".message-user")?.textContent || "Unknown",
  room: msgRoom,  // π Ξ Ξ¬Ξ½ΟΞ± ΟΟΟΟΟ Ξ΄ΟΞΌΞ¬ΟΞΉΞΏ ΟΟΟΞ±
  time: Date.now()
});

      }

      // π¬ ΞΟΞ±Ξ―ΟΞ΅ΟΞ΅ Ξ¬ΞΌΞ΅ΟΞ± ΟΞΏ bubble Ξ±ΟΟ ΟΞΏ UI
      if (deletedMsg) deletedMsg.remove();

    } catch (err) {
      console.error("β Delete failed:", err);
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
      messageForm.requestSubmit(); // π ΟΟΞ­Ξ»Ξ½Ξ΅ΞΉ ΟΞΏ ΞΌΞ�Ξ½ΟΞΌΞ±
    }
    // Ξ±Ξ½ Ξ΅Ξ―Ξ½Ξ±ΞΉ Shift+Enter β Ξ±ΟΞ�Ξ½ΞΏΟΞΌΞ΅ ΟΞΏ default (Ξ½Ξ­Ξ± Ξ³ΟΞ±ΞΌΞΌΞ�)
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
    messageInput.style.height = messageInput.scrollHeight + "px"; // ΟΟΞΏΟΞ±ΟΞΌΞΏΞ³Ξ� ΟΟΞΏ ΟΞ΅ΟΞΉΞ΅ΟΟΞΌΞ΅Ξ½ΞΏ
  });
}


// ===================== SEND GIF MESSAGE =====================
function sendGifMessage(url) {
  const user = auth.currentUser;
  if (!user) return;

  push(ref(db, "messages/" + currentRoom), {
    uid: user.uid,
    user: user.displayName || "Guest",
    gif: url,  // π Ξ±ΟΞΏΞΈΞ·ΞΊΞ΅ΟΞΏΟΞΌΞ΅ ΟΞΏ URL ΟΞΏΟ GIF
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
    showEmojiTrail(mediaPanel); // π Trigger effect ΟΟΞ±Ξ½ Ξ±Ξ½ΞΏΞ―Ξ³Ξ΅ΞΉ
  }
});


  // ΞΞ»Ξ΅Ξ―ΟΞΉΞΌΞΏ ΞΌΞ΅ click Ξ­ΞΎΟ
  document.addEventListener("click", (e) => {
    if (!mediaPanel.contains(e.target) && e.target !== emojiBtn) {
      mediaPanel.classList.add("hidden");
    }
  });

  // ΞΞ»Ξ΅Ξ―ΟΞΉΞΌΞΏ ΞΌΞ΅ ESC
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
    input.value += span.textContent;  // π ΟΟΞΏΟΞΈΞ­ΟΞ΅ΞΉ ΟΞΏ emoji ΟΟΞΏ input
    input.focus();

    // ΞΞ»Ξ΅Ξ―ΟΞΉΞΌΞΏ panel ΞΌΞ΅ΟΞ¬ ΟΞΏ click

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

      // ΞΞ±ΞΈΞ±ΟΞ―ΞΆΞΏΟΞΌΞ΅ ΟΞ± ΟΟΞΏΞ·Ξ³ΞΏΟΞΌΞ΅Ξ½Ξ±
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

  // ΞΞ»Ξ΅Ξ―ΟΞ΅ ΟΞΏ media panel
  const mediaPanel = document.getElementById("mediaPanel");
  if (mediaPanel) mediaPanel.classList.add("hidden");
});

          gifResults.appendChild(img);
        });
      } catch (err) {
        console.error("GIF fetch error:", err);
        gifResults.innerHTML = "β Error loading GIFs";
      }
    }
  });
}
// ==== GIF TRENDING (default ΟΟΞ±Ξ½ Ξ±Ξ½ΞΏΞ―Ξ³Ξ΅ΞΉ ΟΞΏ tab) ====
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
    gifResults.innerHTML = "β Error loading GIFs";
  }
}

// Ξ¦ΟΟΟΟΟΞ΅ trending ΞΌΟΞ»ΞΉΟ Ξ±Ξ½ΞΏΞ―ΞΎΞ΅ΞΉ Ξ· ΟΞ΅Ξ»Ξ―Ξ΄Ξ±
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

      // ΞΞ±ΞΈΞ±ΟΞ―ΞΆΞΏΟΞΌΞ΅ ΟΞ± ΟΟΞΏΞ·Ξ³ΞΏΟΞΌΞ΅Ξ½Ξ±
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

            // ΞΞ»Ξ΅Ξ―ΟΞ΅ ΟΞΏ panel
            const mediaPanel = document.getElementById("mediaPanel");
            if (mediaPanel) mediaPanel.classList.add("hidden");

            // Focus ΟΟΞΏ input
            const input = document.getElementById("messageInput");
            if (input) input.focus();
          });
          stickerResults.appendChild(img);
        });
      } catch (err) {
        console.error("Sticker fetch error:", err);
        stickerResults.innerHTML = "β Error loading Stickers";
      }
    }
  });
}

// ==== STICKER TRENDING (default ΟΟΞ±Ξ½ Ξ±Ξ½ΞΏΞ―Ξ³Ξ΅ΞΉ ΟΞΏ tab) ====
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
    stickerResults.innerHTML = "β Error loading Stickers";
  }
}

// Ξ¦ΟΟΟΟΟΞ΅ trending stickers ΞΌΟΞ»ΞΉΟ Ξ±Ξ½ΞΏΞ―ΞΎΞ΅ΞΉ Ξ· ΟΞ΅Ξ»Ξ―Ξ΄Ξ±
loadTrendingStickers();

// ===== Ξ£ΟΞ½Ξ±ΟΟΞ·ΟΞ· Ξ³ΞΉΞ± Ξ±ΟΞΏΟΟΞΏΞ»Ξ� Sticker =====
function sendStickerMessage(url) {
  const user = auth.currentUser;
  if (!user) return;

  push(ref(db, "messages/" + currentRoom), {
    uid: user.uid,
    user: user.displayName || "Guest",
    sticker: url, // π Ξ±ΟΞΏΞΈΞ·ΞΊΞ΅ΟΞΏΟΞΌΞ΅ ΟΞΏ sticker URL
    createdAt: serverTimestamp()
  });
}
// ===================== EMOJI TRAIL EFFECT =====================
function showEmojiTrail(panel) {
  const emojis = ["π", "π₯", "π«", "β€οΈ", "π", "β¨", "π", "π«Ά"];
  const count = 3 + Math.floor(Math.random() * 3); // 3β5 emojis
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

    // π§Ή ΞΞ±ΞΈΞ±ΟΞ―ΞΆΞΏΟΞΌΞ΅ ΟΟΟΟΞ½ ΟΞ±Ξ»ΞΉΞΏΟΟ listeners
  off(ref(db, "users"));
  off(ref(db, "roles"));
  
  // ΞΞΊΞΏΟΞΌΞ΅ live Ξ³ΞΉΞ± users
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
      role = "admin"; // MysteryMan ΟΞ¬Ξ½ΟΞ± admin
    } else if (u.role) {
      role = u.role; // π ΟΟΟΞ± Ξ΄ΞΉΞ±Ξ²Ξ¬ΞΆΞΏΟΞΌΞ΅ Ξ±ΟΟ ΟΞΏ users/$uid/role
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


    // === Helper function Ξ³ΞΉΞ± category ===
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

        // ΞΞ½ΞΏΞΌΞ±
        const nameSpan = document.createElement("span");
        nameSpan.className = "user-name";
        nameSpan.textContent = escapeHTML(u.displayName || "Guest");

        // Icons
        if (u.role === "admin") {
          const shield = document.createElement("span");
          shield.textContent = "π‘οΈ";
          shield.className = "role-icon admin-icon";
          nameSpan.appendChild(shield);
        }
        if (u.role === "vip") {
          const star = document.createElement("span");
          star.textContent = "β­";
          star.className = "role-icon vip-icon";
          nameSpan.appendChild(star);
        }
        // π ΞΞ½ ΞΏ ΟΟΞ�ΟΟΞ·Ο Ξ΅Ξ―Ξ½Ξ±ΞΉ muted
if (u.muted) {
  const muteIcon = document.createElement("span");
  muteIcon.textContent = "π";
  muteIcon.className = "role-icon mute-icon";
    muteIcon.title = "Muted";   // π Tooltip ΟΞ΅ hover
  nameSpan.appendChild(muteIcon);
}


        li.appendChild(avatarDiv);
        li.appendChild(nameSpan);
        
        
        // ΞΞ΅ΞΎΞ― ΞΊΞ»ΞΉΞΊ (context menu) ΞΌΟΞ½ΞΏ Ξ³ΞΉΞ± admin
li.addEventListener("contextmenu", async (e) => {
  e.preventDefault();

  if (!auth.currentUser) return;

  // β ΞΞ΅Ο ΟΞΏ role ΟΞΏΟ current user Ξ±ΟΟ ΟΞΏ DB
  const snap = await get(ref(db, "users/" + auth.currentUser.uid));
  const currentUserData = snap.val();
  if (!currentUserData || currentUserData.role !== "admin") return;

  contextTargetUid = u.uid;

  // Ξ₯ΟΞΏΞ»ΞΏΞ³ΞΉΟΞΌΟΟ ΞΈΞ­ΟΞ·Ο (ΟΟΟΞ΅ Ξ½Ξ± ΞΌΞ­Ξ½Ξ΅ΞΉ Ξ΅Ξ½ΟΟΟ ΞΏΞΈΟΞ½Ξ·Ο)
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

// Render ΞΊΞ±ΟΞ·Ξ³ΞΏΟΞ―Ξ΅Ο
renderCategory("Admins", admins, "admin");
renderCategory("VIP", vips, "vip");
renderCategory("Users", normal, "user");
renderCategory("Guests", guests, "guest");

  }); // π ΞΊΞ»Ξ΅Ξ―ΟΞΉΞΌΞΏ ΟΞΏΟ onValue(mutes)
});   // π ΞΊΞ»Ξ΅Ξ―ΟΞΉΞΌΞΏ ΟΞΏΟ onValue(users)
}      // π ΞΊΞ»Ξ΅Ξ―ΟΞΉΞΌΞΏ ΟΞ·Ο function renderUserList


// ===================== USER CONTEXT MENU LOGIC =====================
const userContextMenu = document.getElementById("userContextMenu");
let contextTargetUid = null; // ΟΞΏΞΉΞΏΞ½ user ΞΊΞ¬Ξ½Ξ±ΞΌΞ΅ Ξ΄Ξ΅ΞΎΞ― ΞΊΞ»ΞΉΞΊ

// ΞΞ»ΞΉΞΊ Ξ­ΞΎΟ β ΞΊΞ»Ξ΅Ξ―ΟΞΉΞΌΞΏ
document.addEventListener("click", (e) => {
  if (!userContextMenu.contains(e.target)) {
    userContextMenu.classList.add("hidden");
  }
});

// Esc β ΞΊΞ»Ξ΅Ξ―ΟΞΉΞΌΞΏ
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    userContextMenu.classList.add("hidden");
  }
});

// ===================== ROLE MODAL LOGIC =====================
const roleModal = document.getElementById("roleModal");
const closeRole = document.getElementById("closeRole");
const roleButtons = document.querySelectorAll(".role-btn");

// ΞΞ½ΞΏΞΉΞ³ΞΌΞ± modal ΟΟΞ±Ξ½ ΟΞ±ΟΞ·ΞΈΞ΅Ξ― Change Role
document.getElementById("changeRole").addEventListener("click", () => {
  if (!contextTargetUid) return; // Ξ±Ξ½ Ξ΄Ξ΅Ξ½ Ξ­ΟΞΏΟΞΌΞ΅ user

  roleModal.classList.remove("hidden");       // Ξ΄Ξ΅Ξ―ΞΎΞ΅ ΟΞΏ modal
  userContextMenu.classList.add("hidden");    // ΞΊΞ»Ξ΅Ξ―ΟΞ΅ ΟΞΏ context menu
});
// ΞΟΞΉΞ»ΞΏΞ³Ξ� ΟΟΞ»ΞΏΟ Ξ±ΟΟ ΟΞ± ΞΊΞΏΟΞΌΟΞΉΞ¬
roleButtons.forEach(btn => {
  btn.addEventListener("click", async () => {
    const newRole = btn.dataset.role;

    if (!contextTargetUid) return;

    // π ΞΟΞ»ΞΏΞΊΞ¬ΟΞΏΟΞΌΞ΅ self-demote
    if (contextTargetUid === auth.currentUser.uid && newRole !== "admin") {
      alert("β οΈ ΞΞ΅Ξ½ ΞΌΟΞΏΟΞ΅Ξ―Ο Ξ½Ξ± Ξ±Ξ»Ξ»Ξ¬ΞΎΞ΅ΞΉΟ ΟΞΏ Ξ΄ΞΉΞΊΟ ΟΞΏΟ role!");
      return;
    }

// Ξ Ξ¬ΟΞ΅ ΟΞΏΞ½ ΟΟΞ­ΟΞΏΞ½ΟΞ± ΟΟΞ»ΞΏ ΟΞΏΟ target user
const targetSnap = await get(ref(db, "users/" + contextTargetUid));
const targetData = targetSnap.val();
const oldRole = targetData?.role || "user";

// β ΞΞ½ ΞΏ ΟΟΟΟΞΏΟ Ξ΅Ξ―Ξ½Ξ±ΞΉ ΞΏ MysteryMan β ΞΌΟΞ»ΞΏΞΊΞ¬ΟΞΏΟΞΌΞ΅
if (targetData && targetData.displayName === "MysteryMan") {
  alert("β οΈ ΞΞ΅Ξ½ ΞΌΟΞΏΟΞ΅Ξ―Ο Ξ½Ξ± ΟΞ΅ΞΉΟΞ¬ΞΎΞ΅ΞΉΟ ΟΞΏΞ½ MysteryMan!");
  return;
}

// ΞΞ¬Ξ½Ξ΅ update ΟΞΏΞ½ Ξ½Ξ­ΞΏ ΟΟΞ»ΞΏ
await update(ref(db, "users/" + contextTargetUid), {
  role: newRole
});

// π§Ύ === Log entry ΟΟΞΏ adminLogs ===
const currentUser = auth.currentUser;
if (currentUser) {
  const logRef = push(ref(db, "adminLogs"));
  await set(logRef, {
  action: "changeRole",
  admin: currentUser.displayName || "Unknown",
  targetUser: targetData?.displayName || "Unknown",
  oldRole: oldRole,
  newRole: newRole,
  room: currentRoom || "unknown",  // π ΟΟΞΏΟΞΈΞ�ΞΊΞ· Ξ΄ΟΞΌΞ±ΟΞ―ΞΏΟ
  time: Date.now()
});
}

console.log("β Role updated:", contextTargetUid, "β", newRole);

// ΞΞ»Ξ΅Ξ―ΟΞ΅ ΟΞΏ modal ΞΌΞ΅ΟΞ¬ ΟΞ·Ξ½ Ξ±Ξ»Ξ»Ξ±Ξ³Ξ�
roleModal.classList.add("hidden");
  });
});
// ΞΞ»Ξ΅Ξ―ΟΞΉΞΌΞΏ ΞΌΞ΅ β
closeRole.addEventListener("click", () => {
  roleModal.classList.add("hidden");
});

// ΞΞ»Ξ΅Ξ―ΟΞΉΞΌΞΏ ΞΌΞ΅ click Ξ­ΞΎΟ
roleModal.addEventListener("click", (e) => {
  if (e.target === roleModal) {
    roleModal.classList.add("hidden");
  }
});

// ΞΞ»Ξ΅Ξ―ΟΞΉΞΌΞΏ ΞΌΞ΅ Esc
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    roleModal.classList.add("hidden");
  }

// ===================== ADMIN ACTIONS: KICK / BAN / MUTE / UNMUTE =====================

// Helper Ξ³ΞΉΞ± log entries
async function logAdminAction(action, targetUid, targetUser, extra = {}) {
  const currentUser = auth.currentUser;
  if (!currentUser) return;

  const logRef = push(ref(db, "adminLogs"));
  await set(logRef, {
    action,
    admin: currentUser.displayName || "Unknown",
    targetUser: targetUser || "Unknown",
    targetUid,
    room: currentRoom || "unknown",
    time: Date.now(),
    ...extra
  });
}

// === MUTE USER ===
const muteUserBtn = document.getElementById("muteUser");
if (muteUserBtn) {
  muteUserBtn.addEventListener("click", async () => {
    if (!contextTargetUid) return alert("β οΈ No user selected!");
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const adminSnap = await get(ref(db, "users/" + currentUser.uid));
    const adminData = adminSnap.val() || {};
    if (adminData.role !== "admin" && currentUser.displayName !== "MysteryMan") {
      alert("β οΈ ΞΟΞ½ΞΏ admin ΞΌΟΞΏΟΞ΅Ξ― Ξ½Ξ± ΞΊΞ¬Ξ½Ξ΅ΞΉ mute!");
      return;
    }

    const targetSnap = await get(ref(db, "users/" + contextTargetUid));
    const targetData = targetSnap.val() || {};
    if (targetData.displayName === "MysteryMan") {
      alert("π« ΞΞ΅Ξ½ ΞΌΟΞΏΟΞ΅Ξ―Ο Ξ½Ξ± ΞΊΞ¬Ξ½Ξ΅ΞΉΟ mute ΟΞΏΞ½ MysteryMan!");
      return;
    }

    await set(ref(db, "mutes/" + contextTargetUid), {
      by: currentUser.displayName,
      time: Date.now()
    });

    await logAdminAction("mute", contextTargetUid, targetData.displayName);
    alert(`π Ξ ΟΟΞ�ΟΟΞ·Ο ${targetData.displayName || "user"} Ξ­Ξ³ΞΉΞ½Ξ΅ mute.`);
    userContextMenu.classList.add("hidden");
  });
}

// === UNMUTE USER ===
const unmuteUserBtn = document.getElementById("unmuteUser");
if (unmuteUserBtn) {
  unmuteUserBtn.addEventListener("click", async () => {
    if (!contextTargetUid) return alert("β οΈ No user selected!");

    await remove(ref(db, "mutes/" + contextTargetUid));

    await logAdminAction("unmute", contextTargetUid, "Unknown");
    alert("π Ξ ΟΟΞ�ΟΟΞ·Ο Ξ­Ξ³ΞΉΞ½Ξ΅ unmute.");
    userContextMenu.classList.add("hidden");
  });
}

// === KICK USER ===
const kickUserBtn = document.getElementById("kickUser");
if (kickUserBtn) {
  kickUserBtn.addEventListener("click", async () => {
    if (!contextTargetUid) return alert("β οΈ No user selected!");
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const userSnap = await get(ref(db, "users/" + currentUser.uid));
    const userData = userSnap.val() || {};
    if (userData.role !== "admin" && currentUser.displayName !== "MysteryMan") {
      alert("β οΈ ΞΟΞ½ΞΏ admin ΞΌΟΞΏΟΞ΅Ξ― Ξ½Ξ± ΞΊΞ¬Ξ½Ξ΅ΞΉ kick!");
      return;
    }

    const targetSnap = await get(ref(db, "users/" + contextTargetUid));
    const targetData = targetSnap.val() || {};
    if (targetData.displayName === "MysteryMan") {
      alert("π« ΞΞ΅Ξ½ ΞΌΟΞΏΟΞ΅Ξ―Ο Ξ½Ξ± ΞΊΞ¬Ξ½Ξ΅ΞΉΟ kick ΟΞΏΞ½ MysteryMan!");
      return;
    }

    const reason = prompt("π’ ΞΟΞ³ΞΏΟ Ξ³ΞΉΞ± ΟΞΏ kick;", "spam / ΟΟΞΏΟΞ²ΞΏΞ»Ξ�");
    if (!reason) return alert("β οΈ Kick Ξ±ΞΊΟΟΟΞΈΞ·ΞΊΞ΅ β Ξ΄Ξ΅Ξ½ Ξ΄ΟΞΈΞ·ΞΊΞ΅ Ξ»ΟΞ³ΞΏΟ.");

    await remove(ref(db, "users/" + contextTargetUid));

    await logAdminAction("kick", contextTargetUid, targetData.displayName, { reason });
    alert(`π’ Ξ ΟΟΞ�ΟΟΞ·Ο ${targetData.displayName || "user"} Ξ±ΟΞΏΞ²Ξ»Ξ�ΞΈΞ·ΞΊΞ΅!`);

    userContextMenu.classList.add("hidden");
  });
}

// === BAN USER ===
const banUserBtn = document.getElementById("banUser");
if (banUserBtn) {
  banUserBtn.addEventListener("click", async () => {
    if (!contextTargetUid) return alert("β οΈ No user selected!");
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const adminSnap = await get(ref(db, "users/" + currentUser.uid));
    const adminData = adminSnap.val() || {};
    if (adminData.role !== "admin" && currentUser.displayName !== "MysteryMan") {
      alert("β οΈ ΞΟΞ½ΞΏ admin ΞΌΟΞΏΟΞ΅Ξ― Ξ½Ξ± ΞΊΞ¬Ξ½Ξ΅ΞΉ ban!");
      return;
    }

    const targetSnap = await get(ref(db, "users/" + contextTargetUid));
    const targetData = targetSnap.val() || {};
    if (targetData.displayName === "MysteryMan") {
      alert("π« ΞΞ΅Ξ½ ΞΌΟΞΏΟΞ΅Ξ―Ο Ξ½Ξ± ΞΊΞ¬Ξ½Ξ΅ΞΉΟ ban ΟΞΏΞ½ MysteryMan!");
      return;
    }

    const reason = prompt("β ΞΟΞ³ΞΏΟ ban;", "spamming / toxic behavior");
    if (!reason) return alert("β οΈ Ban Ξ±ΞΊΟΟΟΞΈΞ·ΞΊΞ΅ β Ξ΄Ξ΅Ξ½ Ξ΄ΟΞΈΞ·ΞΊΞ΅ Ξ»ΟΞ³ΞΏΟ.");

    await set(ref(db, "bannedUsers/" + contextTargetUid), {
      uid: contextTargetUid,
      displayName: targetData.displayName || "Unknown",
      email: targetData.email || "",
      bannedBy: currentUser.displayName || "Unknown",
      reason,
      room: currentRoom || "unknown",
      time: Date.now()
    });

    await logAdminAction("ban", contextTargetUid, targetData.displayName, { reason });
    await remove(ref(db, "users/" + contextTargetUid));

    alert(`β Ξ ΟΟΞ�ΟΟΞ·Ο ${targetData.displayName || "user"} Ξ±ΟΞΏΞΊΞ»Ξ΅Ξ―ΟΟΞ·ΞΊΞ΅!`);
    userContextMenu.classList.add("hidden");
  });
}
