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


//  Firebase Config ± Ώ Convo2 project
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

    // ✳️ Small delay for stability
    setTimeout(() => switchRoom("general"), 200);

    // === Coins ===
    setupCoinsSync(user.uid);
    setupAddCoinsButton(user);
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

    // » €Ή ½± ³―½΅Ή ±½ ±Ώ½΄΅΅― (offline)
    onDisconnect(userRef).update({
      online: false,
      lastSeen: Date.now()
    });

    // Ή Ή¬²±΅ ± Ή ¬΅Ή �΄·
    get(userRef).then(userSnap => {
      const existing = userSnap.val() || {};

      // === Role Logic ===
      let role = existing.role || "user";
      if (user.isAnonymous) role = "guest";
      if (user.displayName === "MysteryMan") role = "admin"; //  auto-lock admin

      // === ½·Ό­· ΏΉ΅―½ ― overwrite Ώ role ===
      update(userRef, {
        uid: user.uid,
        displayName: user.displayName || "User" + Math.floor(Math.random() * 10000),
        photoURL: user.photoURL || null,
        role: role,
        online: true,
        coins: existing.coins ?? 0 //  auto-create coins field
      })
      .then(() => {
        console.log("‘ Presence sync:", user.displayName, "| role:", role);
      })
      .catch(err => {
        console.error(" Presence role sync failed:", err);
      });
    }); //  Ί»΅―½΅Ή Ώ get(userRef).then(...)
  }); //  Ί»΅―½΅Ή Ώ onValue(...)
} //  Ί»΅―½΅Ή · function setupPresence

// ===================== COINS SYNC (LIVE) =====================
let coinsUnsubscribe = null; // Ί±¬Ό΅ Ώ½ Ώ·³ΏΌ΅½Ώ listener

function setupCoinsSync(uid) {
  if (!uid) return;

  const coinsRef = ref(db, "users/" + uid + "/coins");
  const coinsEl = document.getElementById("profileCoins");
  if (!coinsEl) return;

  // ½ ¬΅Ή Ώ·³ΏΌ΅½Ώ listener, Ώ½ ±Ώ½΄­ΏΌ΅
  if (coinsUnsubscribe) coinsUnsubscribe();

  // ·ΌΉΏ³ΏΌ΅ ½­Ώ listener
  const unsubscribe = onValue(coinsRef, (snap) => {
    const val = snap.exists() ? snap.val() : 0;
    coinsEl.textContent = val;
    console.log(" Coins sync update:", uid, val);
  });

  coinsUnsubscribe = unsubscribe;
}


// ===================== ADMIN ADD COINS BUTTON (PROFILE PANEL) =====================
function setupAddCoinsButton(user) {
  const btn = document.getElementById("addCoinsBtn");
  if (!btn) return;

  //  Ό±½―Ά΅±Ή Ό½Ώ ±½ ΅―±Ή Ώ MysteryMan
  if (user.displayName === "MysteryMan") {
    btn.classList.remove("hidden");
  } else {
    btn.classList.add("hidden");
    return;
  }

  //  ±¬Ή΅ ±»Ή listener
  const newBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(newBtn, btn);

  //  ­Ώ listener
  newBtn.addEventListener("click", async () => {
    const panel = document.getElementById("profilePanel");
    const targetUid = panel?.dataset.viewingUid || user.uid;

    const amount = parseInt(
      prompt("  ± coins ½± Ώ­΅Ή;", "100"),
      10
    );
    if (isNaN(amount) || amount <= 0) return;

    const targetRef = ref(db, "users/" + targetUid + "/coins");
    const snap = await get(targetRef);
    const currentCoins = snap.exists() ? snap.val() : 0;

    await set(targetRef, currentCoins + amount);

    // �½Ό± ΅Ή―±
    if (targetUid === user.uid) {
      alert(`  ΅΅ ${amount} coins Ώ½ ΅± Ώ!`);
    } else {
      alert(`  ΅΅ ${amount} coins Ώ½ �·!`);
    }
  });
}

// ===================== ADMIN ADD COINS TO USER =====================
document.addEventListener("DOMContentLoaded", () => {
  let addCoinsUserBtn = document.getElementById("addCoinsUser");

  if (addCoinsUserBtn) {
    // ±¬Ή΅ Ώ·³ΏΌ΅½Ώ listeners
    const newBtn = addCoinsUserBtn.cloneNode(true);
    addCoinsUserBtn.parentNode.replaceChild(newBtn, addCoinsUserBtn);
    addCoinsUserBtn = newBtn;

    addCoinsUserBtn.addEventListener("click", async () => {
      if (!contextTargetUid) {
        alert("  No user selected!");
        return;
      }

      const currentUser = auth.currentUser;
      if (!currentUser || currentUser.displayName !== "MysteryMan") {
        alert(" ½Ώ Ώ MysteryMan ΌΏ΅― ½± ΄΅Ή coins!");
        userContextMenu.classList.add("hidden");
        return;
      }

      const addAmount = parseInt(
        prompt("  ± coins ½± Ώ­ ΅ ±½ Ώ½ �·;", "50"),
        10
      );
      if (isNaN(addAmount) || addAmount <= 0) {
        alert(" ΊΏ Ώ!");
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

        console.log(` Admin added ${addAmount} coins to UID: ${contextTargetUid}`);
        alert(`  Ώ­·Ί±½ ${addAmount} coins!`);

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
        console.error(" Add coins to user failed:", err);
        alert(" Ώ―± Ώ�Ί· coins.");
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

  // £Ή³Ώ΅Ό±΅ Ή ¬Ώ½ ± default rooms
  await Promise.all(defaultRooms.map(async (roomName) => {
    const snap = await get(child(ref(db), `rooms/${roomName}`));
    if (!snap.exists()) {
      await set(ref(db, `rooms/${roomName}`), {
        name: roomName,
        createdAt: Date.now()
      });
    }
  }));

  //  ±±―ΆΏΌ΅ ½ ±»ΉΏ listeners Ή½ ²¬»ΏΌ΅ Ί±Ή½Ώ³ΉΏ
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

// ­Ώ room button
const newRoomBtn = document.getElementById("newRoomBtn");
if (newRoomBtn) {
  newRoomBtn.addEventListener("click", async () => {
    const name = prompt("Enter room name:");
    if (!name) return;

    const roomRef = ref(db, "rooms/" + name);
    const snap = await get(roomRef);
    if (snap.exists()) {
      alert("  €Ώ room ¬΅Ή �΄·!");
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

//  Indicator reference (Ί±¬Ό΅ Ώ element ³Ή± Ό΅»»Ώ½ΉΊ� �·)
const newMessagesIndicator = document.getElementById("newMessagesIndicator");

// ¬½΅ Ώ clickable -> ¬΅Ή Ώ ­»Ώ (± ΄Ώ»­΅Ή Ό½Ώ manual)
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
  watchTyping(room); //  ΅΄ Ό±―½΅Ή · ½΄΅·
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
  // Regex Ώ Ή¬½΅Ή emoji (ΉΏ ±» Ί±Ή safe)
  const emojiRegex = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu;
  const matches = text.match(emojiRegex);

  if (!matches) return false;

  // Trim ³Ή± ½± ²³¬»ΏΌ΅ ½ Ί΅½¬
  const stripped = text.trim();

  // »­³ΏΌ΅ Ή »Ώ Ώ string ΅―½±Ή Ό½Ώ emoji
  return matches.join('') === stripped;
}


// ===================== RENDER MESSAGES (Optimized) =====================
function renderMessages(room) {
  const messagesRef = ref(db, "messages/" + room);
  const messagesDiv = document.getElementById("messages");
  if (!messagesDiv) return;

  // ±±―Ά΅Ή Ό½Ώ  Ώ¬ ·½ ±»»±³� room
  messagesDiv.innerHTML = "";
  off(messagesRef);

  onValue(messagesRef, (snap) => {
    const existingIds = new Set(
      Array.from(messagesDiv.querySelectorAll(".message")).map(el => el.dataset.id)
    );

    snap.forEach(childSnap => {
      const msgId = childSnap.key;
      const msg = childSnap.val();
      if (existingIds.has(msgId)) return; //  ·½ Ύ±½±Ώ­΅Ή ¬Ώ½ Ό�½Ό±

      // === Container ===
      const messageDiv = document.createElement("div");
      messageDiv.className = "message";
      messageDiv.dataset.id = msgId;

      // ½ ΅―½±Ή Ώ ΄ΉΊ ΌΏ uid -> ²¬»΅ class "mine"
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

      // Username (¬½ ± Ώ bubble)
      const userDiv = document.createElement("div");
      userDiv.className = "message-user";
      userDiv.textContent = msg.user || "Anon";
      contentDiv.appendChild(userDiv);

      // === Bubble ===
      if (msg.text) {
        const bubbleDiv = document.createElement("div");
        bubbleDiv.className = "message-bubble";

        // ±ΌΌ� 1: Text
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
          line1.textContent = ""; //  ·½ ΄΅―Ύ΅Ή URL
        } else {
          //  ±½Ώ½ΉΊ¬ Ό·½Ό±±
          line1.textContent = msg.text;

          //  Emoji-only check
          if (isEmojiOnly(msg.text)) {
            const emojiCount = msg.text.match(/\p{Extended_Pictographic}/gu).length;
            bubbleDiv.classList.add("emoji-only");
            if (emojiCount <= 2) {
              bubbleDiv.classList.add("big");
            }
          }
        }

        // ±ΌΌ� 2: Date + Time
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

    //  Scroll Ό½Ώ ±½ ΅―±Ή �΄· Ί¬
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

    //  Check mute
    const muteSnap = await get(ref(db, "mutes/" + user.uid));
    if (muteSnap.exists()) {
      alert("  ―±Ή muted Ί±Ή ΄΅½ ΌΏ΅― ½± ΅―»΅Ή Ό·½Ό±±.");
      return;
    }

    // ½ ΄΅½ ΅―½±Ή muted  ­»½΅Ή Ί±½Ώ½ΉΊ¬
    await push(ref(db, "messages/" + currentRoom), {
      uid: user?.uid,
      user: user?.displayName || "Guest",
      text,
      createdAt: serverTimestamp()
    });

    //  »΅―΅ Ώ emoji panel  Ό΅¬ ·½ ±ΏΏ»�
    closeEmojiPanel();

    input.value = "";
    input.style.height = "40px"; //  reset Ώ default Ώ
    input.focus();
  });
}
// ===================== TOGGLE YOUTUBE BUTTON =====================
const toggleYoutubeBtn = document.getElementById("toggleYoutubeBtn");

if (toggleYoutubeBtn) {
  toggleYoutubeBtn.addEventListener("click", () => {
    youtubePanel.classList.toggle("hidden");

    if (youtubePanel.classList.contains("hidden")) {
      toggleYoutubeBtn.textContent = "YouTube";   // ±½ ΅―½±Ή Ί»΅Ή
    } else {
      toggleYoutubeBtn.textContent = "Hide YouTube"; // ±½ ΅―½±Ή ±½ΏΉ
    }
  });
}
// ===================== PROFILE PANEL =====================
const profileBtn = document.getElementById("headerUser");
const profilePanel = document.getElementById("profilePanel");
const closeProfileBtn = document.getElementById("closeProfileBtn");

// ½ΏΉ³Ό± panel (¬½± Ώ ΄ΉΊ Ώ Ώ―»)
if (profileBtn && profilePanel) {
  profileBtn.addEventListener("click", () => {
    openProfilePanel(auth.currentUser.uid);
  });
}

// »΅―ΉΌΏ panel + Ί±¬ΉΌ± listener
if (closeProfileBtn) {
  closeProfileBtn.addEventListener("click", () => {
    profilePanel.classList.remove("show");
    profilePanel.classList.add("hidden");

    // Ή ±¬ΉΌ± coins listener ±½ Ί»΅―½΅Ή Ώ Profile Panel
    if (typeof coinsUnsubscribe === "function") {
      coinsUnsubscribe();
      coinsUnsubscribe = null;
      console.log("Ή Coins listener unsubscribed");
    }
  });
}

// »΅―ΉΌΏ Ό΅ Esc
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    profilePanel.classList.remove("show");
    profilePanel.classList.add("hidden");
  }
});

// Tabs »΅ΉΏ³―±
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

//  ±½±Ώ¬ listener ³Ή± Ώ Add Coins ΊΏΌ― (±½ ¬΅Ή)
document.addEventListener("click", () => {
  const btn = document.getElementById("addCoinsUser");
  if (btn && !btn.dataset.listenerAdded) {
    btn.dataset.listenerAdded = "true";

    btn.addEventListener("click", async () => {
      if (!contextTargetUid) {
        alert("  No user selected!");
        return;
      }

      const currentUser = auth.currentUser;
      if (!currentUser || currentUser.displayName !== "MysteryMan") {
        alert(" ½Ώ Ώ MysteryMan ΌΏ΅― ½± ΄΅Ή coins!");
        userContextMenu.classList.add("hidden");
        return;
      }

      const addAmount = parseInt(
        prompt("  ± coins ½± Ώ­ ΅ ±½ Ώ½ �·;", "50"),
        10
      );
      if (isNaN(addAmount) || addAmount <= 0) return;

      const targetRef = ref(db, "users/" + contextTargetUid + "/coins");
      const snap = await get(targetRef);
      const currentCoins = snap.exists() ? snap.val() : 0;

      await set(targetRef, currentCoins + addAmount);
      alert(`  Ώ­·Ί±½ ${addAmount} coins!`);
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
  //  Ώ·Ί΅ΏΌ΅ ΏΉΏ Ώ―» ²»­ΏΌ΅ ±� · Ή³Ό�
if (panel) {
  panel.dataset.viewingUid = targetUid;
}

  const snap = await get(ref(db, "users/" + targetUid));
  const data = snap.val();

  if (!data) {
    console.warn("  No user data found for", targetUid);
    return;
  }

  // === Update UI ===
  document.getElementById("profileName").textContent = data.displayName || "Unknown";
  document.getElementById("profileAvatar").src = data.photoURL || "https://i.pravatar.cc/150";
  document.getElementById("profileRole").textContent = data.role || "user";
  document.getElementById("profileCoins").textContent = data.coins ?? 0;


  // === Live coins sync ³Ή± Ώ½ �· Ώ ²»­ΏΌ΅ ===
  setupCoinsSync(targetUid);
}

// ===================== VIEW PROFILE (CONTEXT MENU) =====================
const viewProfileBtn = document.getElementById("viewProfile");
if (viewProfileBtn) {
  viewProfileBtn.addEventListener("click", () => {
  if (!contextTargetUid) return alert("  No user selected!");
  openProfilePanel(contextTargetUid); //  ΄΅―½΅Ή Ώ profile Ώ ¬»»Ώ
  userContextMenu.classList.add("hidden");
});

}



// ===================== SYSTEM PANEL =====================
const systemBtn = document.getElementById("systemBtn");
const systemPanel = document.getElementById("systemPanel");
const closeSystemBtn = document.getElementById("closeSystemBtn");
const systemLogsDiv = document.getElementById("systemLogs");

// Ό¬½Ή· ΊΏΌΉΏ Ό½Ώ ³Ή± MysteryMan
onAuthStateChanged(auth, (user) => {
  if (user && user.displayName === "MysteryMan") {
    systemBtn.classList.remove("hidden");
  } else {
    systemBtn.classList.add("hidden");
  }
});

// ½ΏΉ³Ό± / Ί»΅―ΉΌΏ
if (systemBtn && systemPanel && closeSystemBtn) {
systemBtn.addEventListener("click", () => {
  console.log("’ System clicked");
  systemPanel.classList.remove("hidden"); //  Ύ΅Ί»΅Ή΄½΅Ή Ώ panel
  systemPanel.classList.add("open");      //  ΅½΅³ΏΏΉ΅― Ώ slide
  loadSystemLogs();
});

closeSystemBtn.addEventListener("click", () => {
  systemPanel.classList.remove("open");
  systemPanel.classList.add("hidden");    //  Ώ Ύ±½±Ί²΅Ή
});
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") systemPanel.classList.remove("open");
  });
}

// ¦· logs
function loadSystemLogs() {
  const logsRef = ref(db, "adminLogs");
  onValue(logsRef, (snap) => {
    systemLogsDiv.innerHTML = "";
    if (!snap.exists()) {
      systemLogsDiv.innerHTML = "<p class='placeholder'>±½­½± log ±ΊΌ±.</p>";
      return;
    }

    // ΅±Ώ� ΅ array Ί±Ή ±ΎΉ½Ό·· (½΅΅± ±)
    const logs = Object.values(snap.val()).sort((a, b) => b.time - a.time);

    logs.forEach((log) => {
      const time = new Date(log.time);
      const dateStr = time.toLocaleDateString();
      const hourStr = time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      // © icon by action
      let icon = "";
      if (log.action === "deleteMessage") icon = "";
      else if (log.action === "clearChat") icon = "Ή";
      else if (log.action === "changeRole") icon = "­";
      else if (log.action === "kick") icon = "’";
      else if (log.action === "ban") icon = "";

      const p = document.createElement("p");
      let details = "";

if (log.action === "changeRole") {
  details = `${log.targetUser ? `<i>(${log.targetUser})</i>` : ""} 
    <span style="color:#aaa">(${log.oldRole}  ${log.newRole})</span>`;
} else {
  details = `${log.targetUser ? `<i>(${log.targetUser})</i>` : ""}`;
}

p.innerHTML = `${icon} <b>${log.admin}</b>  ${log.action} ${details}
  <span style="color:#888">in ${log.room || "?"}</span> 
  <span style="color:#555">[${dateStr} ${hourStr}]</span>`;

      systemLogsDiv.appendChild(p);
      //  ½ ¬΅Ή reason, ΄΅―Ύ΅ Ώ
if (log.reason) {
  const reasonP = document.createElement("p");
  reasonP.style.color = "#999";
  reasonP.style.fontSize = "13px";
  reasonP.style.marginLeft = "25px";
  reasonP.textContent = ` Reason: ${log.reason}`;
  systemLogsDiv.appendChild(reasonP);
}

    });
  });
}
// === CLEAR LOGS BUTTON ===
const clearLogsBtn = document.getElementById("clearLogsBtn");
if (clearLogsBtn) {
  clearLogsBtn.addEventListener("click", async () => {
    const confirmClear = confirm("Ή ΅ ―³Ώ± ½± Ί±±―΅Ή »± ± logs;");
    if (!confirmClear) return;

    try {
      await remove(ref(db, "adminLogs"));
      systemLogsDiv.innerHTML = "<p class='placeholder'>±½­½± log ±ΊΌ±.</p>";
      console.log(" Admin logs cleared.");
    } catch (err) {
      console.error(" Clear logs failed:", err);
    }
  });
}
// ===================== COPY UID =====================
const copyUidBtn = document.getElementById("copyUid");

if (copyUidBtn) {
  copyUidBtn.addEventListener("click", async () => {
    if (!contextTargetUid) {
      alert("  No user selected!");
      return;
    }

    try {
      await navigator.clipboard.writeText(contextTargetUid);
      alert(" UID copied:\n" + contextTargetUid);
      console.log(" Copied UID:", contextTargetUid);
    } catch (err) {
      console.error(" Failed to copy UID:", err);
      alert(" Failed to copy UID");
    }

    // »΅―΅ Ώ Ό΅½Ώ Ό΅¬ ·½ ΅½­³΅Ή±
    userContextMenu.classList.add("hidden");
  });
}

// ===================== BANNED USERS PANEL =====================
const bannedBtn = document.getElementById("bannedBtn");
const bannedPanel = document.getElementById("bannedPanel");
const closeBannedBtn = document.getElementById("closeBannedBtn");

// Ό¬½Ή· ΊΏΌΉΏ Ό½Ώ ³Ή± MysteryMan � admins
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

// ½ΏΉ³Ό± panel
if (bannedBtn) {
  bannedBtn.addEventListener("click", () => {
  bannedPanel.classList.remove("hidden"); //  Ύ΅Ί»΅―΄΅
  bannedPanel.classList.add("open");
});

}

// »΅―ΉΌΏ panel
if (closeBannedBtn) {
 closeBannedBtn.addEventListener("click", () => {
  bannedPanel.classList.remove("open");
  bannedPanel.classList.add("hidden"); //  Ύ±½±Ί΅
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
        `<p class="placeholder">« ±½­½± �· ΄΅½ ΅―½±Ή ban ±� · Ή³Ό�.</p>`;
      return;
    }

    // €±ΎΉ½Ό·· ± ½΅΅Ώ  ±»Ή΅Ώ
    const entries = Object.entries(data).sort((a, b) => b[1].time - a[1].time);

    entries.forEach(([uid, info]) => {
      const date = new Date(info.time);
      const dateStr = date.toLocaleDateString("el-GR");
      const hourStr = date.toLocaleTimeString("el-GR", { hour: "2-digit", minute: "2-digit" });

      const userDiv = document.createElement("div");
      userDiv.className = "banned-entry";
      userDiv.innerHTML = `
        <p>
           <b>${info.displayName}</b>
          <span style="color:#aaa"> banned by ${info.bannedBy}</span><br>
          <span style="color:#888">in ${info.room || "unknown"}</span> |
<span style="color:#666">${dateStr} ${hourStr}</span><br>
<span style="color:#aaa"> ${info.reason || "― »³Ώ"}</span>

        </p>
        <button class="unban-btn" data-uid="${uid}"> Unban</button>
      `;

      bannedListDiv.appendChild(userDiv);
    });

    // £½΄­ΏΌ΅ ± ΊΏΌΉ¬ unban
    document.querySelectorAll(".unban-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const targetUid = btn.dataset.uid;
        const confirmUnban = confirm("΅ ½± Ί¬½΅Ή UNBAN ±½ Ώ½ �·;");
        if (!confirmUnban) return;

        try {
          const currentUser = auth.currentUser;
          const bannedUserSnap = await get(ref(db, "bannedUsers/" + targetUid));
          const bannedUser = bannedUserSnap.val();

          // Ή±³±� ± · »―± banned
          await remove(ref(db, "bannedUsers/" + targetUid));

          // Log entry
          const logRef = push(ref(db, "adminLogs"));
          await set(logRef, {
            action: "unban",
            admin: currentUser.displayName || "Unknown",
            targetUser: bannedUser?.displayName || "Unknown",
            time: Date.now()
          });

          alert(`  �· ${bannedUser?.displayName || "user"} ­³Ή½΅ UNBAN!`);
        } catch (err) {
          console.error(" Unban failed:", err);
        }
      });
    });
  });
}

// ¬΅ Ώ¬ Ώ ±½Ώ―³΅Ή Ώ panel, Ί¬½΅ load · »―±
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
    //  ½Ώ Ί»΅―ΉΌΏ panel   ²�½ΏΌ΅ Ώ iframe »­Ώ½
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

    // ‘  ΅ΉΏΉΌ ΅½ Convo
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

    //  »΅³Ώ »Ώ ± · ²¬· (Ή Ό½Ώ MysteryMan)
    const userSnap = await get(ref(db, "users/" + user.uid));
    const userData = userSnap.val();
    const role = userData?.role || "user";

    if (role !== "admin") {
      alert("  ½Ώ admin ΌΏ΅― ½± Ί±±―΅Ή Ώ chat!");
      return;
    }

    if (!currentRoom) {
      alert(" ΅½ ­΅Ή ΅Ή»΅³΅― room!");
      return;
    }

    const confirmClear = confirm(`Ή ΅ ―³Ώ± ½± Ί±±―΅Ή Ώ room "${currentRoom}" ?`);
    if (!confirmClear) return;

   try {
  await remove(ref(db, "messages/" + currentRoom));
  console.log(" Chat cleared:", currentRoom);
     // Ύ === Log entry Ώ adminLogs ===
const logRef = push(ref(db, "adminLogs"));
await set(logRef, {
  action: "clearChat",
  admin: user.displayName || "Unknown",
  room: currentRoom,
  time: Date.now()
});

     

  // ¬ ±¬Ή΅ ¬Ό΅± Ώ UI
  document.getElementById("messages").innerHTML = "";
} catch (err) {
  console.error(" Clear chat failed:", err);
}


    contextMenu.classList.add("hidden");
  });
}

let targetMessageId = null; // ±Ώ·Ί΅ΏΌ΅ ΏΉΏ Ό�½Ό± ­³Ή½΅ ΄΅Ύ― Ί»ΉΊ

// ΅Ύ― Ί»ΉΊ ¬½ ΅ Ό�½Ό±
document.getElementById("messages").addEventListener("contextmenu", (e) => {
  e.preventDefault();

  const messageDiv = e.target.closest(".message");
  if (!messageDiv) return;

  const currentUser = auth.currentUser;
  if (!currentUser) return;

  //  »΅³Ώ Ώ DB ±½ ΅―½±Ή admin
  const userRef = ref(db, "users/" + currentUser.uid);
  get(userRef).then((snap) => {
    const u = snap.val();
    if (!u || u.role !== "admin") return;

    targetMessageId = messageDiv.dataset.id;

    // €ΏΏ­·· Ώ menu · ­· Ώ Ί»ΉΊ
    contextMenu.style.top = e.pageY + "px";
    contextMenu.style.left = e.pageX + "px";
    contextMenu.classList.remove("hidden");
  });
});

// »΅―ΉΌΏ Ό΅ Ί»ΉΊ ­Ύ
document.addEventListener("click", () => {
  contextMenu.classList.add("hidden");
});

// »ΉΊ Ώ Delete
if (deleteBtn) {
  deleteBtn.addEventListener("click", async () => {
    if (!targetMessageId) return;

    try {
      // Ή  ± ¬΅ Ώ message element ³Ή± log info
      const deletedMsg = document.querySelector(`.message[data-id="${targetMessageId}"]`);

      await remove(ref(db, "messages/" + currentRoom + "/" + targetMessageId));
      console.log(" Message deleted:", targetMessageId);

      // Ύ === Log entry Ώ adminLogs ===
      const currentUser = auth.currentUser;
      if (currentUser) {
        const logRef = push(ref(db, "adminLogs"));
        //  ¬΅ Ώ room ± Ώ Ό�½Ό± ±½ ¬΅Ή
const msgRoom =
  deletedMsg?.closest("[data-room]")?.getAttribute("data-room") || currentRoom;

await set(logRef, {
  action: "deleteMessage",
  admin: currentUser.displayName || "Unknown",
  targetUser: deletedMsg?.querySelector(".message-user")?.textContent || "Unknown",
  room: msgRoom,  //   ¬½±  ΄Ό¬ΉΏ ±
  time: Date.now()
});

      }

      // ¬ ±―΅΅ ¬Ό΅± Ώ bubble ± Ώ UI
      if (deletedMsg) deletedMsg.remove();

    } catch (err) {
      console.error(" Delete failed:", err);
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
      messageForm.requestSubmit(); //  ­»½΅Ή Ώ Ό�½Ό±
    }
    // ±½ ΅―½±Ή Shift+Enter  ±�½ΏΌ΅ Ώ default (½­± ³±ΌΌ�)
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
    messageInput.style.height = messageInput.scrollHeight + "px"; // Ώ±ΌΏ³� Ώ ΅Ή΅Ό΅½Ώ
  });
}


// ===================== SEND GIF MESSAGE =====================
function sendGifMessage(url) {
  const user = auth.currentUser;
  if (!user) return;

  push(ref(db, "messages/" + currentRoom), {
    uid: user.uid,
    user: user.displayName || "Guest",
    gif: url,  //  ±Ώ·Ί΅ΏΌ΅ Ώ URL Ώ GIF
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
    showEmojiTrail(mediaPanel); //  Trigger effect ±½ ±½Ώ―³΅Ή
  }
});


  // »΅―ΉΌΏ Ό΅ click ­Ύ
  document.addEventListener("click", (e) => {
    if (!mediaPanel.contains(e.target) && e.target !== emojiBtn) {
      mediaPanel.classList.add("hidden");
    }
  });

  // »΅―ΉΌΏ Ό΅ ESC
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
    input.value += span.textContent;  //  Ώ­΅Ή Ώ emoji Ώ input
    input.focus();

    // »΅―ΉΌΏ panel Ό΅¬ Ώ click

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

      // ±±―ΆΏΌ΅ ± Ώ·³ΏΌ΅½±
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

  // »΅―΅ Ώ media panel
  const mediaPanel = document.getElementById("mediaPanel");
  if (mediaPanel) mediaPanel.classList.add("hidden");
});

          gifResults.appendChild(img);
        });
      } catch (err) {
        console.error("GIF fetch error:", err);
        gifResults.innerHTML = " Error loading GIFs";
      }
    }
  });
}
// ==== GIF TRENDING (default ±½ ±½Ώ―³΅Ή Ώ tab) ====
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
    gifResults.innerHTML = " Error loading GIFs";
  }
}

// ¦΅ trending Ό»Ή ±½Ώ―Ύ΅Ή · ΅»―΄±
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

      // ±±―ΆΏΌ΅ ± Ώ·³ΏΌ΅½±
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

            // »΅―΅ Ώ panel
            const mediaPanel = document.getElementById("mediaPanel");
            if (mediaPanel) mediaPanel.classList.add("hidden");

            // Focus Ώ input
            const input = document.getElementById("messageInput");
            if (input) input.focus();
          });
          stickerResults.appendChild(img);
        });
      } catch (err) {
        console.error("Sticker fetch error:", err);
        stickerResults.innerHTML = " Error loading Stickers";
      }
    }
  });
}

// ==== STICKER TRENDING (default ±½ ±½Ώ―³΅Ή Ώ tab) ====
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
    stickerResults.innerHTML = " Error loading Stickers";
  }
}

// ¦΅ trending stickers Ό»Ή ±½Ώ―Ύ΅Ή · ΅»―΄±
loadTrendingStickers();

// ===== £½±·· ³Ή± ±ΏΏ»� Sticker =====
function sendStickerMessage(url) {
  const user = auth.currentUser;
  if (!user) return;

  push(ref(db, "messages/" + currentRoom), {
    uid: user.uid,
    user: user.displayName || "Guest",
    sticker: url, //  ±Ώ·Ί΅ΏΌ΅ Ώ sticker URL
    createdAt: serverTimestamp()
  });
}
// ===================== EMOJI TRAIL EFFECT =====================
function showEmojiTrail(panel) {
  const emojis = ["", "₯", "«", "€", "", "¨", "", "«Ά"];
  const count = 3 + Math.floor(Math.random() * 3); // 35 emojis
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

    // Ή ±±―ΆΏΌ΅ ½ ±»ΉΏ listeners
  off(ref(db, "users"));
  off(ref(db, "roles"));
  
  // ΊΏΌ΅ live ³Ή± users
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
      role = "admin"; // MysteryMan ¬½± admin
    } else if (u.role) {
      role = u.role; //  ± ΄Ή±²¬ΆΏΌ΅ ± Ώ users/$uid/role
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


    // === Helper function ³Ή± category ===
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

        // ½ΏΌ±
        const nameSpan = document.createElement("span");
        nameSpan.className = "user-name";
        nameSpan.textContent = escapeHTML(u.displayName || "Guest");

        // Icons
        if (u.role === "admin") {
          const shield = document.createElement("span");
          shield.textContent = "‘";
          shield.className = "role-icon admin-icon";
          nameSpan.appendChild(shield);
        }
        if (u.role === "vip") {
          const star = document.createElement("span");
          star.textContent = "­";
          star.className = "role-icon vip-icon";
          nameSpan.appendChild(star);
        }
        //  ½ Ώ �· ΅―½±Ή muted
if (u.muted) {
  const muteIcon = document.createElement("span");
  muteIcon.textContent = "";
  muteIcon.className = "role-icon mute-icon";
    muteIcon.title = "Muted";   //  Tooltip ΅ hover
  nameSpan.appendChild(muteIcon);
}


        li.appendChild(avatarDiv);
        li.appendChild(nameSpan);
        
        
        // ΅Ύ― Ί»ΉΊ (context menu) Ό½Ώ ³Ή± admin
li.addEventListener("contextmenu", async (e) => {
  e.preventDefault();

  if (!auth.currentUser) return;

  //  ΅ Ώ role Ώ current user ± Ώ DB
  const snap = await get(ref(db, "users/" + auth.currentUser.uid));
  const currentUserData = snap.val();
  if (!currentUserData || currentUserData.role !== "admin") return;

  contextTargetUid = u.uid;

  // ₯Ώ»Ώ³ΉΌ ­· (΅ ½± Ό­½΅Ή ΅½ Ώ½·)
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

// Render Ί±·³Ώ―΅
renderCategory("Admins", admins, "admin");
renderCategory("VIP", vips, "vip");
renderCategory("Users", normal, "user");
renderCategory("Guests", guests, "guest");

  }); //  Ί»΅―ΉΌΏ Ώ onValue(mutes)
});   //  Ί»΅―ΉΌΏ Ώ onValue(users)
}      //  Ί»΅―ΉΌΏ · function renderUserList


// ===================== USER CONTEXT MENU LOGIC =====================
const userContextMenu = document.getElementById("userContextMenu");
let contextTargetUid = null; // ΏΉΏ½ user Ί¬½±Ό΅ ΄΅Ύ― Ί»ΉΊ

// »ΉΊ ­Ύ  Ί»΅―ΉΌΏ
document.addEventListener("click", (e) => {
  if (!userContextMenu.contains(e.target)) {
    userContextMenu.classList.add("hidden");
  }
});

// Esc  Ί»΅―ΉΌΏ
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    userContextMenu.classList.add("hidden");
  }
});

// ===================== ROLE MODAL LOGIC =====================
const roleModal = document.getElementById("roleModal");
const closeRole = document.getElementById("closeRole");
const roleButtons = document.querySelectorAll(".role-btn");

// ½ΏΉ³Ό± modal ±½ ±·΅― Change Role
document.getElementById("changeRole").addEventListener("click", () => {
  if (!contextTargetUid) return; // ±½ ΄΅½ ­ΏΌ΅ user

  roleModal.classList.remove("hidden");       // ΄΅―Ύ΅ Ώ modal
  userContextMenu.classList.add("hidden");    // Ί»΅―΅ Ώ context menu
});
// Ή»Ώ³� »Ώ ± ± ΊΏΌΉ¬
roleButtons.forEach(btn => {
  btn.addEventListener("click", async () => {
    const newRole = btn.dataset.role;

    if (!contextTargetUid) return;

    //  »ΏΊ¬ΏΌ΅ self-demote
    if (contextTargetUid === auth.currentUser.uid && newRole !== "admin") {
      alert("  ΅½ ΌΏ΅― ½± ±»»¬Ύ΅Ή Ώ ΄ΉΊ Ώ role!");
      return;
    }

//  ¬΅ Ώ½ ­Ώ½± »Ώ Ώ target user
const targetSnap = await get(ref(db, "users/" + contextTargetUid));
const targetData = targetSnap.val();
const oldRole = targetData?.role || "user";

//  ½ Ώ Ώ ΅―½±Ή Ώ MysteryMan  Ό»ΏΊ¬ΏΌ΅
if (targetData && targetData.displayName === "MysteryMan") {
  alert("  ΅½ ΌΏ΅― ½± ΅Ή¬Ύ΅Ή Ώ½ MysteryMan!");
  return;
}

// ¬½΅ update Ώ½ ½­Ώ »Ώ
await update(ref(db, "users/" + contextTargetUid), {
  role: newRole
});

// Ύ === Log entry Ώ adminLogs ===
const currentUser = auth.currentUser;
if (currentUser) {
  const logRef = push(ref(db, "adminLogs"));
  await set(logRef, {
  action: "changeRole",
  admin: currentUser.displayName || "Unknown",
  targetUser: targetData?.displayName || "Unknown",
  oldRole: oldRole,
  newRole: newRole,
  room: currentRoom || "unknown",  //  Ώ�Ί· ΄Ό±―Ώ
  time: Date.now()
});
}

console.log(" Role updated:", contextTargetUid, "", newRole);

// »΅―΅ Ώ modal Ό΅¬ ·½ ±»»±³�
roleModal.classList.add("hidden");
  });
});
// »΅―ΉΌΏ Ό΅ 
closeRole.addEventListener("click", () => {
  roleModal.classList.add("hidden");
});

// »΅―ΉΌΏ Ό΅ click ­Ύ
roleModal.addEventListener("click", (e) => {
  if (e.target === roleModal) {
    roleModal.classList.add("hidden");
  }
});

// »΅―ΉΌΏ Ό΅ Esc
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    roleModal.classList.add("hidden");
  }

// ===================== ADMIN ACTIONS: KICK / BAN / MUTE / UNMUTE =====================

// Helper ³Ή± log entries
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
    if (!contextTargetUid) return alert("  No user selected!");
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const adminSnap = await get(ref(db, "users/" + currentUser.uid));
    const adminData = adminSnap.val() || {};
    if (adminData.role !== "admin" && currentUser.displayName !== "MysteryMan") {
      alert("  ½Ώ admin ΌΏ΅― ½± Ί¬½΅Ή mute!");
      return;
    }

    const targetSnap = await get(ref(db, "users/" + contextTargetUid));
    const targetData = targetSnap.val() || {};
    if (targetData.displayName === "MysteryMan") {
      alert("« ΅½ ΌΏ΅― ½± Ί¬½΅Ή mute Ώ½ MysteryMan!");
      return;
    }

    await set(ref(db, "mutes/" + contextTargetUid), {
      by: currentUser.displayName,
      time: Date.now()
    });

    await logAdminAction("mute", contextTargetUid, targetData.displayName);
    alert(`  �· ${targetData.displayName || "user"} ­³Ή½΅ mute.`);
    userContextMenu.classList.add("hidden");
  });
}

// === UNMUTE USER ===
const unmuteUserBtn = document.getElementById("unmuteUser");
if (unmuteUserBtn) {
  unmuteUserBtn.addEventListener("click", async () => {
    if (!contextTargetUid) return alert("  No user selected!");

    await remove(ref(db, "mutes/" + contextTargetUid));

    await logAdminAction("unmute", contextTargetUid, "Unknown");
    alert("  �· ­³Ή½΅ unmute.");
    userContextMenu.classList.add("hidden");
  });
}

// === KICK USER ===
const kickUserBtn = document.getElementById("kickUser");
if (kickUserBtn) {
  kickUserBtn.addEventListener("click", async () => {
    if (!contextTargetUid) return alert("  No user selected!");
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const userSnap = await get(ref(db, "users/" + currentUser.uid));
    const userData = userSnap.val() || {};
    if (userData.role !== "admin" && currentUser.displayName !== "MysteryMan") {
      alert("  ½Ώ admin ΌΏ΅― ½± Ί¬½΅Ή kick!");
      return;
    }

    const targetSnap = await get(ref(db, "users/" + contextTargetUid));
    const targetData = targetSnap.val() || {};
    if (targetData.displayName === "MysteryMan") {
      alert("« ΅½ ΌΏ΅― ½± Ί¬½΅Ή kick Ώ½ MysteryMan!");
      return;
    }

    const reason = prompt("’ ³Ώ ³Ή± Ώ kick;", "spam / Ώ²Ώ»�");
    if (!reason) return alert("  Kick ±Ί·Ί΅  ΄΅½ ΄·Ί΅ »³Ώ.");

    await remove(ref(db, "users/" + contextTargetUid));

    await logAdminAction("kick", contextTargetUid, targetData.displayName, { reason });
    alert(`’  �· ${targetData.displayName || "user"} ±Ώ²»�·Ί΅!`);

    userContextMenu.classList.add("hidden");
  });
}

// === BAN USER ===
const banUserBtn = document.getElementById("banUser");
if (banUserBtn) {
  banUserBtn.addEventListener("click", async () => {
    if (!contextTargetUid) return alert("  No user selected!");
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const adminSnap = await get(ref(db, "users/" + currentUser.uid));
    const adminData = adminSnap.val() || {};
    if (adminData.role !== "admin" && currentUser.displayName !== "MysteryMan") {
      alert("  ½Ώ admin ΌΏ΅― ½± Ί¬½΅Ή ban!");
      return;
    }

    const targetSnap = await get(ref(db, "users/" + contextTargetUid));
    const targetData = targetSnap.val() || {};
    if (targetData.displayName === "MysteryMan") {
      alert("« ΅½ ΌΏ΅― ½± Ί¬½΅Ή ban Ώ½ MysteryMan!");
      return;
    }

    const reason = prompt(" ³Ώ ban;", "spamming / toxic behavior");
    if (!reason) return alert("  Ban ±Ί·Ί΅  ΄΅½ ΄·Ί΅ »³Ώ.");

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

    alert(`  �· ${targetData.displayName || "user"} ±ΏΊ»΅―·Ί΅!`);
    userContextMenu.classList.add("hidden");
  });
}
