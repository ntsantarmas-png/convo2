// ================================
//  CONVO CHATROOM — YOUTUBE MODULE
// ================================

import { ref, onChildAdded, push, remove, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const youtubeBtn = document.getElementById("youtubeBtn");
const youtubePanel = document.getElementById("youtubePanel");
const closeYoutube = document.getElementById("closeYoutube");
const youtubeFrame = document.getElementById("youtubeFrame");

let currentRoom = "general";
let currentUser = null;

// ============================================
// 1️⃣  AUTH CHECK
// ============================================
onAuthStateChanged(auth, (user) => {
  if (!user) return;
  currentUser = user;
});

// ============================================
// 2️⃣  OPEN/CLOSE PANEL
// ============================================
youtubeBtn.addEventListener("click", () => {
  youtubePanel.classList.toggle("hidden");
});

if (closeYoutube)
  closeYoutube.addEventListener("click", () => {
    youtubePanel.classList.add("hidden");
    stopVideo();
  });

// ============================================
// 3️⃣  YOUTUBE LINK DETECTION IN CHAT
// ============================================
// Αυτό λειτουργεί μέσω onChildAdded (όταν κάποιος στέλνει link YouTube)
const msgRef = ref(db, "v3/messages/" + currentRoom);

onChildAdded(msgRef, (snapshot) => {
  const msg = snapshot.val();
  if (!msg || !msg.text) return;

  const ytRegex =
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = msg.text.match(ytRegex);
  if (match) {
    const videoId = match[1];
    loadVideo(videoId);

    // Αν ο admin έστειλε το link, στέλνουμε system log
    if (currentUser.displayName === "MysteryMan") {
      push(ref(db, "v3/adminLogs"), {
        text: `🎵 ${msg.username} is playing a YouTube video.`,
        time: new Date().toLocaleString()
      });
    }
  }
});

// ============================================
// 4️⃣  LOAD / STOP VIDEO
// ============================================
function loadVideo(videoId) {
  youtubeFrame.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
  youtubePanel.classList.remove("hidden");
}

function stopVideo() {
  youtubeFrame.src = "";
}

// ============================================
// 5️⃣  OPTIONAL — SEND VIDEO LINK COMMAND
// ============================================
// Μπορείς να επεκτείνεις αυτό ώστε ο admin να στέλνει link με /yt <url>
const messageInput = document.getElementById("messageInput");
messageInput.addEventListener("keydown", async (e) => {
  if (e.key === "Enter" && messageInput.value.startsWith("/yt ")) {
    e.preventDefault();
    const link = messageInput.value.split(" ")[1];
    if (!link) return;
    const ytRegex =
      /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = link.match(ytRegex);
    if (!match) return alert("❌ Invalid YouTube link!");

    const videoId = match[1];
    const msgRef = ref(db, "v3/messages/" + currentRoom);
    await push(msgRef, {
      uid: currentUser.uid,
      username: currentUser.displayName || "User",
      role: "admin",
      text: link,
      createdAt: serverTimestamp()
    });

    loadVideo(videoId);
    messageInput.value = "";
  }
});

// ============================================
// END YOUTUBE MODULE
// ============================================
