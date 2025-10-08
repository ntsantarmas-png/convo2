// ===================== GIPHY CONFIG =====================
const GIPHY_KEY = "bCn5Jvx2ZOepneH6fMteNoX31hVfqX25";

// ===================== FIREBASE INIT =====================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, push, onChildAdded, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBEiZEcY54mFT7OnrfCv0t3sPo33DthcZ4",
  authDomain: "convo2-4a075.firebaseapp.com",
  databaseURL: "https://convo2-4a075-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "convo2-4a075",
  storageBucket: "convo2-4a075.firebasestorage.app",
  messagingSenderId: "543901633763",
  appId: "1:543901633763:web:2f91926e4c0c6ce11789d6"
};

export const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);


// === DEFAULT ROOM ===
let currentRoom = "general";
export { currentRoom };

// === TEST LOG ===
console.log("✅ Convo Firebase initialized");


// ===================== SEND MESSAGE (FINAL CLEAN FIX) =====================
const messageForm = document.getElementById("messageForm");
const input = document.getElementById("messageInput");

if (input) {
  // === ENTER to send, SHIFT+ENTER for newline ===
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      messageForm.requestSubmit();
    }
  });
}

if (messageForm) {
  messageForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const text = input.value.trim();
    if (!text) return;

    // 🧹 Καθάρισε άμεσα το input (πριν στείλει)
    input.value = "";
    input.style.height = "40px"; // 👈 επαναφορά στο αρχικό ύψος
    input.scrollTop = 0;


    const user = auth.currentUser;
    if (!user) {
      alert("⚠️ Not logged in!");
      return;
    }

    try {
      const roomPath = currentRoom || "general";

      await push(ref(db, "v3/messages/" + roomPath), {
        uid: user.uid,
  displayName: user.displayName || "Guest",
        text,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Message send error:", err);
    }
  });
}

// ===================== RENDER MESSAGES (STABLE v3) =====================
const messagesDiv = document.getElementById("messages");

onAuthStateChanged(auth, (user) => {
  if (!user || !messagesDiv) return;

  const msgRef = ref(db, "v3/messages/" + currentRoom);

  onChildAdded(msgRef, (snap) => {
    const msg = snap.val();
    const mine = msg.uid === user.uid;

    // === Bubble ===
    const bubble = document.createElement("div");
    bubble.className = mine ? "msg mine" : "msg";

    // === Username ===
    const name = document.createElement("div");
    name.className = "msg-user";
    name.textContent = msg.displayName || "Guest";

    // === Text ===
    const text = document.createElement("div");
    text.className = "msg-text";
    text.innerHTML = (msg.text || "")
      .replace(/\n/g, "<br>")
      .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>');

    // === Timestamp ===
    const time = document.createElement("div");
    time.className = "msg-time";
    const date = new Date(msg.createdAt || Date.now());
    time.textContent = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // === Assemble ===
    bubble.append(name, text, time);
    messagesDiv.appendChild(bubble);

    // === Auto scroll ===
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  });
});
// ===================== RENDER USER LIST (REALTIME) =====================
function renderUserList() {
  const usersList = document.getElementById("usersList");
  if (!usersList) return;

  // 📡 Άκου κάθε αλλαγή στο /users
  onValue(ref(db, "users"), (snap) => {
    usersList.innerHTML = "";

    snap.forEach((child) => {
      const u = child.val();
      if (!u) return;

      const li = document.createElement("li");

      // ✅ Εμφάνιση ονόματος (πραγματικό displayName)
      const displayName = u.displayName || "Guest";

      // 👑 Αν είναι MysteryMan → ειδικό σήμα
      li.textContent = displayName === "MysteryMan" ? "MysteryMan 👑" : displayName;

      usersList.appendChild(li);
    });
  });
}

// 🧠 Κάλεσέ την μετά το login
onAuthStateChanged(auth, (user) => {
  if (user) renderUserList();
});
// ===================== USERLIST CATEGORIES (REALTIME RENDER) =====================
import { onValue } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

function renderUserCategories() {
  const adminsList = document.getElementById("adminsList");
  const vipsList = document.getElementById("vipsList");
  const normalUsersList = document.getElementById("normalUsersList");
  const offlineList = document.getElementById("offlineList");

  if (!adminsList || !vipsList || !normalUsersList || !offlineList) return;

  // 🔹 Real-time listener
  onValue(ref(db, "users"), (snap) => {
    // 🧹 Καθάρισε τις λίστες
    adminsList.innerHTML = "";
    vipsList.innerHTML = "";
    normalUsersList.innerHTML = "";
    offlineList.innerHTML = "";

    snap.forEach((child) => {
      const u = child.val();
      if (!u) return;

      const li = document.createElement("li");

      // === Avatar + Status + Name wrapper ===
      const avatarWrap = document.createElement("div");
      avatarWrap.className = "user-avatar-wrap";

      // 🟢 Status dot
      const statusDot = document.createElement("span");
      statusDot.className = u.online ? "status-dot online" : "status-dot offline";

      // 👤 Avatar (εικόνα ή αρχικό)
      const avatar = document.createElement("div");
      avatar.className = "user-avatar";

      if (u.photoURL) {
        const img = document.createElement("img");
        img.src = u.photoURL;
        img.alt = u.displayName || "User";
        avatar.appendChild(img);
      } else {
        const initial = (u.displayName || "?").charAt(0).toUpperCase();
        avatar.textContent = initial;
      }

      // 💫 Glow ανάλογα με role
      if (u.displayName === "MysteryMan" || u.role === "admin") {
        avatar.classList.add("admin-glow");
      } else if (u.role === "vip") {
        avatar.classList.add("vip-glow");
      } else {
        avatar.classList.add("user-glow");
      }

   // 💬 Όνομα με role-based class
const nameSpan = document.createElement("span");
nameSpan.className = "user-name";

if (u.displayName === "MysteryMan" || u.role === "admin") {
  nameSpan.classList.add("admin");
} else if (u.role === "vip") {
  nameSpan.classList.add("vip");
} else if (u.online === false) {
  nameSpan.classList.add("offline");
} else {
  nameSpan.classList.add("user");
}

nameSpan.textContent = u.displayName || "Guest";


      // 👑 Badge (ανάλογα με το role)
      const badge = document.createElement("span");
      badge.className = "user-badge";

      if (u.displayName === "MysteryMan" || u.role === "admin") {
        badge.textContent = "👑";
      } else if (u.role === "vip") {
        badge.textContent = "💎";
      } else {
        badge.textContent = "";
      }

      // === Assemble ===
      avatarWrap.append(statusDot, avatar, nameSpan, badge);
      li.appendChild(avatarWrap);

      // 🕓 Tooltip info (Last seen + Role)
      let roleLabel = "User";
      if (u.displayName === "MysteryMan" || u.role === "admin") roleLabel = "Admin";
      else if (u.role === "vip") roleLabel = "VIP";
      else if (u.isAnonymous) roleLabel = "Guest";

      const lastSeen = u.lastSeen
        ? new Date(u.lastSeen).toLocaleString([], {
            hour: "2-digit",
            minute: "2-digit",
            day: "2-digit",
            month: "2-digit",
          })
        : "–";

      li.setAttribute(
        "data-tooltip",
        u.online
          ? `${u.displayName} (${roleLabel}) — Online 🟢`
          : `${u.displayName} (${roleLabel}) — Last seen: ${lastSeen}`
      );

      // 🌙 Offline users
      if (u.online === false) {
        offlineList.appendChild(li);
        return;
      }

      // Ανάλογα το role → σωστή λίστα
      if (u.displayName === "MysteryMan" || u.role === "admin") {
        adminsList.appendChild(li);
      } else if (u.role === "vip") {
        vipsList.appendChild(li);
      } else {
        normalUsersList.appendChild(li);
      }
    });

    // === Μετά το loop: υπολόγισε counters ===
    const adminCount = adminsList.childElementCount;
    const vipCount = vipsList.childElementCount;
    const userCount = normalUsersList.childElementCount;
    const offlineCount = offlineList.childElementCount;

    const adminHeader = document.querySelector(".cat-header.admin");
    const vipHeader = document.querySelector(".cat-header.vip");
    const userHeader = document.querySelector(".cat-header.users");
    const offlineHeader = document.querySelector(".cat-header.offline");

    if (adminHeader) adminHeader.setAttribute("data-count", adminCount);
    if (vipHeader) vipHeader.setAttribute("data-count", vipCount);
    if (userHeader) userHeader.setAttribute("data-count", userCount);
    if (offlineHeader) offlineHeader.setAttribute("data-count", offlineCount);
  });
}

// 🚀 Εκτέλεση μετά το login
onAuthStateChanged(auth, (user) => {
  if (user) renderUserCategories();
});


// ===================== AUTO-GROW MESSAGE INPUT (DISCORD STYLE) =====================
const msgInput = document.getElementById("messageInput");
const baseHeight = 40;   // 1 γραμμή
const maxHeight = 120;   // περίπου 3 γραμμές

if (msgInput) {
  msgInput.style.height = baseHeight + "px";
  msgInput.style.overflowY = "auto"; // ενεργό scroll (αλλά αόρατο λόγω CSS)

msgInput.addEventListener("input", () => {
  msgInput.style.height = baseHeight + "px"; // πάντα ξεκινά από τη βάση
  const newHeight = Math.min(msgInput.scrollHeight, maxHeight);
  msgInput.style.height = newHeight + "px";
});


    // Αν περάσει το όριο, κρατά scroll ενεργό (χωρίς να φαίνεται)
    msgInput.scrollTop = msgInput.scrollHeight;
  

  // ✅ Μετά την αποστολή, καθάρισε & επανέφερε ύψος
  if (messageForm) {
    messageForm.addEventListener("submit", () => {
      msgInput.value = "";
      msgInput.style.height = baseHeight + "px";
      msgInput.scrollTop = 0;
    });
  }
}


// ===================== WELCOME BUBBLE =====================
function showWelcomeBubble(userName) {
  const bubble = document.getElementById("welcomeBubble");
  const nameSpan = document.getElementById("welcomeName");

  if (!bubble) return;

  nameSpan.textContent = userName || "Guest";
  bubble.classList.add("show");
  bubble.classList.remove("hidden");

  // Εξαφανίζεται μετά από 3 δευτερόλεπτα
  setTimeout(() => {
    bubble.classList.remove("show");
    bubble.classList.add("hidden");
  }, 3000);
}

// Κάλεσμα μετά το login
onAuthStateChanged(auth, (user) => {
  if (user) {
    showWelcomeBubble(user.displayName || "Guest");
  }
});
// ===================== PRESENCE SYSTEM (ONLINE / OFFLINE) =====================
function setupPresence(user) {
  if (!user) return;

  const userRef = ref(db, "users/" + user.uid);
  const connectedRef = ref(db, ".info/connected");

  onValue(connectedRef, (snap) => {
    if (snap.val() === false) return;

    // 🔌 Αν κοπεί η σύνδεση → κάνε offline
    onDisconnect(userRef).update({
      online: false,
      lastSeen: Date.now(),
    });

    // ✅ Αν είναι online → ενημέρωσε
    update(userRef, {
      online: true,
      lastSeen: Date.now(),
    });
  });
}

// 🚀 Κάλεσέ το μετά το login
onAuthStateChanged(auth, (user) => {
  if (user) {
    setupPresence(user);
    renderUserCategories(); // για να ενημερώνεται η λίστα live
  }
});
// ===================== CUSTOM CONVO TOOLTIP =====================
const tooltip = document.createElement("div");
tooltip.id = "convoTooltip";
document.body.appendChild(tooltip);

document.addEventListener("mousemove", (e) => {
  if (tooltip.dataset.visible === "true") {
    tooltip.style.left = e.pageX + 15 + "px";
    tooltip.style.top = e.pageY + 10 + "px";
  }
});

// Hover detection
document.addEventListener("mouseover", (e) => {
  const target = e.target.closest("li");
  if (target && target.hasAttribute("data-tooltip")) {
    tooltip.innerHTML = target.getAttribute("data-tooltip");
    tooltip.dataset.visible = "true";
    tooltip.classList.add("visible");
  }
});

document.addEventListener("mouseout", (e) => {
  const target = e.target.closest("li");
  if (target && target.hasAttribute("data-tooltip")) {
    tooltip.dataset.visible = "false";
    tooltip.classList.remove("visible");
  }
});
// ===================== MINI PROFILE POPUP LOGIC =====================
const profileCard = document.getElementById("profileCard");
const profileAvatar = profileCard.querySelector(".profile-avatar");
const profileName = profileCard.querySelector(".profile-name");
const profileRole = profileCard.querySelector(".profile-role");

// Κλείσιμο όταν κάνεις click έξω
document.addEventListener("click", (e) => {
  if (!profileCard.contains(e.target) && !e.target.closest(".user-avatar-wrap")) {
    profileCard.classList.remove("show");
    setTimeout(() => profileCard.classList.add("hidden"), 150);
  }
});

// Άνοιγμα profile όταν κάνεις click σε user
document.addEventListener("click", (e) => {
  const userEl = e.target.closest(".user-avatar-wrap");
  if (!userEl) return;

  const nameEl = userEl.querySelector(".user-name");
  if (!nameEl) return;

  const name = nameEl.textContent.trim();
  const role = nameEl.classList.contains("admin")
    ? "Admin 👑"
    : nameEl.classList.contains("vip")
    ? "VIP 💎"
    : nameEl.classList.contains("offline")
    ? "Offline 🌙"
    : "User 💬";

// ===================== Avatar εμφάνιση =====================
profileAvatar.innerHTML = ""; // καθάρισε προηγούμενο περιεχόμενο

// Πάρε το displayName και προσπάθησε να βρεις τον χρήστη στη λίστα users
let foundUser = null;
const usersRef = ref(db, "users");
onValue(usersRef, (snap) => {
  snap.forEach((child) => {
    const u = child.val();
    if (u.displayName === name) foundUser = u;
  });

  if (foundUser) {
    // Αν υπάρχει avatar URL -> εμφάνισε εικόνα
    if (foundUser.photoURL) {
      const img = document.createElement("img");
      img.src = foundUser.photoURL;
      img.alt = foundUser.displayName || "User";
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.borderRadius = "50%";
      img.style.objectFit = "cover";
      profileAvatar.appendChild(img);
    } else {
      // αλλιώς δείξε το αρχικό γράμμα
      const initial = name.charAt(0).toUpperCase();
      profileAvatar.textContent = initial;
    }

    // 💫 Glow ανάλογα με ρόλο
    profileAvatar.classList.remove("admin-glow", "vip-glow", "user-glow");
    if (foundUser.displayName === "MysteryMan" || foundUser.role === "admin") {
      profileAvatar.classList.add("admin-glow");
    } else if (foundUser.role === "vip") {
      profileAvatar.classList.add("vip-glow");
    } else {
      profileAvatar.classList.add("user-glow");
    }
  }
});


  // Εμφάνιση info
  profileName.textContent = name;
  profileRole.textContent = role;

  // Εμφάνιση popup
  profileCard.classList.remove("hidden");
  setTimeout(() => profileCard.classList.add("show"), 10);
});


console.log("✅ Convo v3 base loaded");
