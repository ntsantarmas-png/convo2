// ===================== APP.JS (Convo Reignite Base v1.8.0) =====================
// Core Chat Logic: Rooms, Messages, Presence, Giphy Integration
// ================================================================================
// ===================== GIPHY CONFIG =====================
const GIPHY_KEY = "bCn5Jvx2ZOepneH6fMteNoX31hVfqX25";


import {
  ref, onValue, onChildAdded, push, set, update, serverTimestamp, onDisconnect, off
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
let activeMsgRef = null; // αποθήκευση ενεργού listener για τα μηνύματα

// ============================================================================
//  1️⃣ ON AUTH STATE
// ============================================================================
onAuthStateChanged(window.auth, (user) => {
  if (!user) return;
  renderRooms();
  renderUserList();
    renderMessages(currentRoom); // ✅ αρχική φόρτωση του main room

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
//  4️⃣ RENDER MESSAGES (Final FIX – No Duplicates, Smooth Append)
// ============================================================================
function renderMessages(room) {
  // 💡 Καθάρισε προηγούμενο listener
  if (activeMsgRef) off(activeMsgRef);

  const msgsRef = ref(window.db, "v3/messages/" + room);
  activeMsgRef = msgsRef;

  // Καθάρισε μόνο μία φορά στην αρχή
  messagesDiv.innerHTML = "";

  const user = window.auth.currentUser;

  // 🔹 Άκου μόνο νέα μηνύματα (append)
  onChildAdded(msgsRef, (snap) => {
    const msg = snap.val();
    if (!msg) return;

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

    // === GIF / Image ===
    if (msg.imageUrl) {
      const imgEl = document.createElement("img");
      imgEl.src = msg.imageUrl;
      imgEl.className = "msgImage";
      imgEl.alt = "GIF";
      imgEl.loading = "lazy";
      imgEl.style.borderRadius = "8px";
      imgEl.style.maxWidth = "220px";
      imgEl.style.marginTop = "6px";
      imgEl.style.display = "block";
      div.appendChild(imgEl);
    }

    // === Timestamp ===
    const timeSpan = document.createElement("span");
    timeSpan.className = "msgTime";

    const ts = msg.createdAt || msg.timestamp;
    if (ts) {
      const d = new Date(ts);
      const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const dateStr = d.toLocaleDateString([], { day: "2-digit", month: "2-digit", year: "2-digit" });
      timeSpan.textContent = `${timeStr} · ${dateStr}`;
    }

    div.append(userSpan, textSpan, timeSpan);
    messagesDiv.appendChild(div);

    // Scroll προς τα κάτω
    messagesDiv.scrollTo({
      top: messagesDiv.scrollHeight,
      behavior: "smooth"
    });
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
      createdAt: Date.now() // ✅ άλλαξε serverTimestamp() σε Date.now() για άμεση εμφάνιση
    };

    if (text === lastMessageId) return;
    lastMessageId = text;

    await push(msgRef, newMsg);
    msgInput.value = "";
    msgInput.focus();
    msgInput.style.height = "40px";

    // 👇 Κλείσιμο emoji panel
    emojiPanel.classList.add("hidden");
  });
}


// ============================================================================
//  AUTO-GROW INPUT + ENTER TO SEND (Convo UX v1.0)
// ============================================================================
if (msgInput) {
  const baseHeight = 40;  // ύψος 1 γραμμής
  const maxHeight = 90;   // μέγιστο ύψος ( ~3 γραμμές )

  msgInput.style.height = baseHeight + "px";
  msgInput.style.overflowY = "hidden";

  msgInput.addEventListener("input", () => {
    msgInput.style.height = baseHeight + "px"; // reset
    const newHeight = Math.min(msgInput.scrollHeight, maxHeight);
    msgInput.style.height = newHeight + "px";
  });

  // === ENTER → Send, SHIFT+ENTER → Newline ===
  msgInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      messageForm.requestSubmit(); // Στέλνει το μήνυμα
    }
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

// ==== EMOJI PANEL TOGGLE (Step 2) ====
const emojiBtn = document.getElementById("emojiBtn");
const emojiPanel = document.getElementById("emojiPanel");
const emojiSidebarButtons = document.querySelectorAll(".emoji-sidebar button");

if (emojiBtn && emojiPanel) {
  // toggle open/close
  emojiBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    emojiPanel.classList.toggle("hidden");
  });

  // close when clicking outside
  document.addEventListener("click", (e) => {
    if (!emojiPanel.contains(e.target) && e.target !== emojiBtn) {
      emojiPanel.classList.add("hidden");
    }
  });
  // ==== EMOJI SIDEBAR ACTIVE STATE (Step 3 – Part 3) ====

emojiSidebarButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    // Αφαίρεσε active από όλα
    emojiSidebarButtons.forEach((b) => b.classList.remove("active"));
    // Πρόσθεσε active στο επιλεγμένο
    btn.classList.add("active");
  });
});


  // close with ESC
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") emojiPanel.classList.add("hidden");
  });
}

// ==== EMOJI CATEGORY CONTENT (Step 3 – Part 4) ====
const emojiMain = document.querySelector(".emoji-main");

// Ορισμός emoji ανά κατηγορία
const emojiCategories = {
  "🕒": ["⌚", "⏰", "⏳", "🕐", "🕓", "🕖", "🕘"],
  "😄": ["😀","😃","😄","😁","😆","🥹","😂","🤣","😊","😉","😍","😘","🥰"],
  "🐻": ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵"],
  "🍕": ["🍏","🍎","🍐","🍊","🍋","🍌","🍉","🍇","🍓","🍒","🍑","🍍","🥭","🍔","🍕","🍣"],
  "⚽": ["⚽","🏀","🏈","⚾","🎾","🏐","🏉","🥏","🎱","🏓","🏸","🥅","🥊"],
  "✈️": ["🚗","🚕","🚙","🚌","🚎","🏎️","🚓","🚑","🚒","🚐","🚚","🚲","🛴","✈️","🚀","🚢"],
  "💡": ["💡","🔦","🕯️","🔋","🔌","💻","📱","⌨️","🖥️","🖱️","📷","📺","🕹️","💾"],
  "❤️": ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️","💕","💞","💓","💗"],
  "🇬🇷": ["🇬🇷","🇬🇧","🇫🇷","🇩🇪","🇮🇹","🇪🇸","🇺🇸","🇨🇦","🇯🇵","🇧🇷","🇨🇭"],
  "🎮": ["🎮","🕹️","🎲","🎯","♟️","🧩","🪄","🔮","⚔️","🛡️","💣"],
  "🧙‍♂️": ["🧙‍♂️","🧝‍♀️","🧚‍♀️","🧞‍♂️","🦄","🐉","🪄","⚗️","🕯️","🔮"],
  "👋": ["👋","🤚","🖐️","✋","🖖","👌","🤌","🤏","✌️","🤞","🤟","🤘","🤙","🫶","🙏"],
  "👨‍💻": ["👩‍💻","👨‍💻","👩‍🔧","👨‍🍳","👩‍🏫","👨‍🚀","👩‍⚖️","👨‍⚕️","👨‍🎤"],
  "💎": ["✨","⚡","💬","💎","🎁","🚀","🔥","💙","🌟","🧠"],
  "⭐": ["👍","👎","🔥","💯","👏","😮","😢","😡","💀"]
};

// εμφάνιση περιεχομένου
emojiSidebarButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const selectedCategory = btn.textContent;
    const emojis = emojiCategories[selectedCategory] || [];

    // φτιάχνει grid με emoji
    emojiMain.innerHTML = emojis
      .map((e) => `<button class="emoji-item">${e}</button>`)
      .join("");
  });
});
// ==== INSERT EMOJI INTO INPUT (Step 3 – Part 5) ====
const messageInput = document.getElementById("messageInput");

// Παρακολούθησε click σε οποιοδήποτε emoji-item
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("emoji-item")) {
    const emoji = e.target.textContent;
    messageInput.value += emoji; // προσθήκη στο τέλος
    messageInput.focus(); // επαναφορά focus στο input
    

  }
});

// ==== PANEL TABS SWITCH (Step 4 – Part 2) ====
const tabButtons = document.querySelectorAll(".panel-tabs .tab");
const emojiTabLayout = document.getElementById("emojiTabLayout");
const gifTabLayout = document.getElementById("gifTabLayout");
// (θα προστεθεί και stickerTabLayout αργότερα)

tabButtons.forEach((tab) => {
  tab.addEventListener("click", () => {
    // Αφαίρεσε active από όλα
    tabButtons.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");

    // Κρύψε όλα τα layouts
    emojiTabLayout.classList.add("hidden");
    gifTabLayout.classList.add("hidden");

    // Εμφάνισε το σωστό ανάλογα με το text
    if (tab.textContent === "Emoji") emojiTabLayout.classList.remove("hidden");
    if (tab.textContent === "GIFs") gifTabLayout.classList.remove("hidden");
  });
});
// ==== GIPHY SEARCH + SEND (Step 4 – Part 3) ====
const gifInput = document.getElementById("gifSearchInput");
const gifGrid = document.querySelector(".gif-grid");

if (gifInput && gifGrid) {
  // === AUTO LOAD TRENDING GIFs ===
async function loadTrendingGifs() {
  gifGrid.innerHTML = `<p style="opacity:0.6; text-align:center;">🔥 Φόρτωση trending...</p>`;
  try {
    const res = await fetch(
      `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_KEY}&limit=25&rating=g`
    );
    const data = await res.json();
    if (!data.data.length) {
      gifGrid.innerHTML = `<p style="opacity:0.6; text-align:center;">😕 Δεν υπάρχουν GIFs</p>`;
      return;
    }

    gifGrid.innerHTML = data.data
      .map(
        (gif) =>
          `<img src="${gif.images.fixed_width.url}" 
                data-url="${gif.images.original.url}" 
                alt="gif" />`
      )
      .join("");
  } catch (err) {
    gifGrid.innerHTML = `<p style="color:#f55;text-align:center;">⚠️ Σφάλμα φόρτωσης</p>`;
  }
}

// 🔹 Όταν ανοίγεις το tab "GIFs", να φορτώνει αυτόματα τα trending
const gifTabButton = Array.from(document.querySelectorAll(".panel-tabs .tab"))
  .find((t) => t.textContent === "GIFs");

if (gifTabButton) {
  gifTabButton.addEventListener("click", () => {
    if (gifGrid.innerHTML.includes("Δεν υπάρχουν GIFs")) {
      loadTrendingGifs();
    }
  });
}

  let searchTimeout;

  gifInput.addEventListener("input", () => {
    clearTimeout(searchTimeout);
    const query = gifInput.value.trim();
    if (!query) {
      gifGrid.innerHTML = `<p style="opacity:0.6; text-align:center;">(Δεν υπάρχουν GIFs ακόμη)</p>`;
      return;
    }

    searchTimeout = setTimeout(async () => {
      gifGrid.innerHTML = `<p style="opacity:0.6; text-align:center;">⏳ Αναζήτηση...</p>`;
      try {
        const res = await fetch(
          `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(
            query
          )}&limit=24&rating=g`
        );
        const data = await res.json();
        if (!data.data.length) {
          gifGrid.innerHTML = `<p style="opacity:0.6; text-align:center;">😕 Δεν βρέθηκαν GIFs</p>`;
          return;
        }

        gifGrid.innerHTML = data.data
          .map(
            (gif) =>
              `<img src="${gif.images.fixed_width.url}" 
                    data-url="${gif.images.original.url}" 
                    alt="gif" />`
          )
          .join("");
      } catch (err) {
        gifGrid.innerHTML = `<p style="color:#f55;text-align:center;">⚠️ Σφάλμα σύνδεσης</p>`;
      }
    }, 500); // μικρή καθυστέρηση για πιο smooth typing
  });

  // ==== SEND GIF TO MAIN CHAT ====
  gifGrid.addEventListener("click", async (e) => {
    if (e.target.tagName === "IMG") {
      const gifUrl = e.target.dataset.url;
      const user = auth.currentUser;
      if (!user) return;

      // στέλνουμε στο Firebase σαν εικόνα (όχι link)
      const roomPath = currentRoom || "general";
      await push(ref(db, "v3/messages/" + roomPath), {
        uid: user.uid,
        text: "",
        imageUrl: gifUrl,
        timestamp: Date.now(),
         });

      // feedback
      e.target.style.opacity = "0.5";
      setTimeout(() => (e.target.style.opacity = "1"), 400);

          // 👇 Κλείσε το emoji panel μετά την αποστολή
    emojiPanel.classList.add("hidden");
    }
  });
}

// ============================================================================
//  🧩 GIPHY STICKERS (Trending + Search + Send)
// ============================================================================
const stickerInput = document.getElementById("stickerSearchInput");
const stickerGrid = document.querySelector(".sticker-grid");

if (stickerInput && stickerGrid) {
  const STICKER_KEY = GIPHY_KEY; // ίδιο key με GIFs

  // === AUTO LOAD TRENDING STICKERS ===
  async function loadTrendingStickers() {
    stickerGrid.innerHTML = `<p style="opacity:0.6; text-align:center;">🔥 Φόρτωση δημοφιλών...</p>`;
    try {
      const res = await fetch(
        `https://api.giphy.com/v1/stickers/trending?api_key=${STICKER_KEY}&limit=25&rating=g`
      );
      const data = await res.json();

      if (!data.data.length) {
        stickerGrid.innerHTML = `<p style="opacity:0.6; text-align:center;">😕 Δεν υπάρχουν stickers</p>`;
        return;
      }

      stickerGrid.innerHTML = data.data
        .map(
          (st) =>
            `<img src="${st.images.fixed_height.url}" 
                  data-url="${st.images.original.url}" 
                  alt="sticker" />`
        )
        .join("");
    } catch (err) {
      stickerGrid.innerHTML = `<p style="color:#f55;text-align:center;">⚠️ Σφάλμα φόρτωσης</p>`;
    }
  }

  // 🔹 Όταν ανοίγεις το tab "Stickers", φόρτωσε trending αν είναι άδειο
  const stickerTabButton = Array.from(
    document.querySelectorAll(".panel-tabs .tab")
  ).find((t) => t.textContent === "Stickers");

  if (stickerTabButton) {
    stickerTabButton.addEventListener("click", () => {
      if (stickerGrid.innerHTML.includes("Δεν υπάρχουν Stickers")) {
        loadTrendingStickers();
      }
    });
  }

  // === SEARCH FUNCTIONALITY ===
  let stickerSearchTimeout;
  stickerInput.addEventListener("input", () => {
    clearTimeout(stickerSearchTimeout);
    const query = stickerInput.value.trim();
    if (!query) {
      stickerGrid.innerHTML = `<p style="opacity:0.6; text-align:center;">(Δεν υπάρχουν Stickers ακόμη)</p>`;
      return;
    }

    stickerSearchTimeout = setTimeout(async () => {
      stickerGrid.innerHTML = `<p style="opacity:0.6; text-align:center;">⏳ Αναζήτηση...</p>`;
      try {
        const res = await fetch(
          `https://api.giphy.com/v1/stickers/search?api_key=${STICKER_KEY}&q=${encodeURIComponent(
            query
          )}&limit=25&rating=g`
        );
        const data = await res.json();

        if (!data.data.length) {
          stickerGrid.innerHTML = `<p style="opacity:0.6; text-align:center;">😕 Δεν βρέθηκαν Stickers</p>`;
          return;
        }

        stickerGrid.innerHTML = data.data
          .map(
            (st) =>
              `<img src="${st.images.fixed_height.url}" 
                    data-url="${st.images.original.url}" 
                    alt="sticker" />`
          )
          .join("");
      } catch (err) {
        stickerGrid.innerHTML = `<p style="color:#f55;text-align:center;">⚠️ Σφάλμα σύνδεσης</p>`;
      }
    }, 500);
  });

  // === SEND STICKER TO MAIN CHAT ===
  stickerGrid.addEventListener("click", async (e) => {
    if (e.target.tagName === "IMG") {
      const stickerUrl = e.target.dataset.url;
      const user = auth.currentUser;
      if (!user) return;

      const roomPath = currentRoom || "general";
      await push(ref(db, "v3/messages/" + roomPath), {
        uid: user.uid,
        text: "",
        imageUrl: stickerUrl,
        timestamp: Date.now(),
      });

      e.target.style.opacity = "0.5";
      setTimeout(() => (e.target.style.opacity = "1"), 400);
      emojiPanel.classList.add("hidden");
    }
  });
}
