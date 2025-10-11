// ================================
//  CONVO CHATROOM — ADMIN MODULE
// ================================

import {
  ref,
  get,
  set,
  remove,
  push,
  onValue,
  update,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const adminBtn = document.getElementById("adminBtn");
const systemPanel = document.getElementById("systemPanel");
const closeSystem = document.getElementById("closeSystem");
const systemLogs = document.getElementById("systemLogs");

// ============================================
// 1️⃣  CHECK ADMIN PRIVILEGES
// ============================================
onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  const userRef = ref(db, "v3/users/" + user.uid);
  const snap = await get(userRef);
  if (!snap.exists()) return;
  const role = snap.val().role;

  // Only MysteryMan or admins see adminBtn
  if (user.displayName === "MysteryMan" || role === "admin") {
    adminBtn.classList.remove("hidden");
    loadLogs();
  } else {
    adminBtn.classList.add("hidden");
  }
});

// ============================================
// 2️⃣  ADMIN PANEL TOGGLE
// ============================================
adminBtn.addEventListener("click", () => {
  systemPanel.classList.toggle("hidden");
});
if (closeSystem)
  closeSystem.addEventListener("click", () => systemPanel.classList.add("hidden"));

// ============================================
// 3️⃣  LOAD ADMIN LOGS
// ============================================
function loadLogs() {
  const logsRef = ref(db, "v3/adminLogs");
  onValue(logsRef, (snapshot) => {
    systemLogs.innerHTML = "";
    if (!snapshot.exists()) {
      systemLogs.innerHTML = "<li>No system logs yet.</li>";
      return;
    }
    snapshot.forEach((child) => {
      const log = child.val();
      const li = document.createElement("li");
      li.textContent = `[${log.time}] ${log.text}`;
      systemLogs.appendChild(li);
    });
  });
}

// ============================================
// 4️⃣  ADMIN ACTIONS (Kick / Ban / Mute / Unmute / Clear Chat)
// ============================================
export async function adminAction(action, targetUid, targetName) {
  const currentUser = auth.currentUser;
  if (!currentUser) return;

  const mySnap = await get(ref(db, "v3/users/" + currentUser.uid));
  const myRole = mySnap.exists() ? mySnap.val().role : "user";
  if (currentUser.displayName !== "MysteryMan" && myRole !== "admin") {
    alert("❌ Only admin can perform this action!");
    return;
  }

  switch (action) {
    case "kick":
      await update(ref(db, "v3/users/" + targetUid), { status: "kicked" });
      await log(`👢 ${targetName} was kicked by ${currentUser.displayName}`);
      alert(`${targetName} has been kicked.`);
      break;

    case "ban":
      await set(ref(db, "v3/banned/" + targetUid), {
        username: targetName,
        bannedBy: currentUser.displayName,
        time: serverTimestamp()
      });
      await log(`🚫 ${targetName} was banned.`);
      alert(`${targetName} has been banned.`);
      break;

    case "unban":
      await remove(ref(db, "v3/banned/" + targetUid));
      await log(`✅ ${targetName} was unbanned.`);
      break;

    case "mute":
      await set(ref(db, "v3/muted/" + targetUid), {
        username: targetName,
        mutedBy: currentUser.displayName,
        time: serverTimestamp()
      });
      await log(`🔇 ${targetName} was muted.`);
      break;

    case "unmute":
      await remove(ref(db, "v3/muted/" + targetUid));
      await log(`🔊 ${targetName} was unmuted.`);
      break;

    case "clear":
      const confirmClear = confirm("🧹 Clear entire chat history?");
      if (!confirmClear) return;
      await remove(ref(db, "v3/messages/general"));
      await log(`🧹 Chat cleared by ${currentUser.displayName}`);
      break;
  }
}

// ============================================
// 5️⃣  LOG HELPER
// ============================================
async function log(text) {
  const logRef = ref(db, "v3/adminLogs");
  await push(logRef, {
    text,
    time: new Date().toLocaleString()
  });
}

// ============================================
// 6️⃣  RIGHT-CLICK USER MENU (Kick / Ban / Mute)
// ============================================
// Στο userList μπορούμε να προσθέσουμε context menu με admin επιλογές
const userList = document.getElementById("userList");
let contextTargetUid = null;
let contextTargetName = null;

// Δημιουργία custom menu
const menu = document.createElement("div");
menu.id = "adminContextMenu";
menu.style.position = "absolute";
menu.style.display = "none";
menu.style.background = "#1a1f27";
menu.style.border = "1px solid rgba(45,140,255,0.4)";
menu.style.borderRadius = "8px";
menu.style.padding = "6px";
menu.style.zIndex = "300";
menu.innerHTML = `
  <button id="kickUser">Kick</button>
  <button id="banUser">Ban</button>
  <button id="muteUser">Mute</button>
  <button id="unmuteUser">Unmute</button>
`;
document.body.appendChild(menu);

// Right-click σε user
userList.addEventListener("contextmenu", async (e) => {
  e.preventDefault();
  const li = e.target.closest("li");
  if (!li) return;

  // Βρες το όνομα χρήστη
  const nameText = li.textContent.replace(/(🟢|🔴|🟡|👑|💎)/g, "").trim();
  const usersSnap = await get(ref(db, "v3/users"));
  usersSnap.forEach((child) => {
    const u = child.val();
    if (u.username === nameText) {
      contextTargetUid = u.uid;
      contextTargetName = u.username;
    }
  });

  // Εμφάνιση μενού
  menu.style.top = e.pageY + "px";
  menu.style.left = e.pageX + "px";
  menu.style.display = "block";
});

// Κλικ έξω για κλείσιμο
document.addEventListener("click", () => {
  menu.style.display = "none";
});

// Buttons actions
menu.querySelector("#kickUser").addEventListener("click", () => {
  adminAction("kick", contextTargetUid, contextTargetName);
});
menu.querySelector("#banUser").addEventListener("click", () => {
  adminAction("ban", contextTargetUid, contextTargetName);
});
menu.querySelector("#muteUser").addEventListener("click", () => {
  adminAction("mute", contextTargetUid, contextTargetName);
});
menu.querySelector("#unmuteUser").addEventListener("click", () => {
  adminAction("unmute", contextTargetUid, contextTargetName);
});

// ============================================
// END ADMIN MODULE
// ============================================
