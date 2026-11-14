// ======================
// Firebase Setup
// ======================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCoPEz0kj5gLwDK25tZNi74RWC90xDAzCw",
  authDomain: "oncall-nurse.firebaseapp.com",
  projectId: "oncall-nurse",
  storageBucket: "oncall-nurse.firebasestorage.app",
  messagingSenderId: "840132050417",
  appId: "1:840132050417:web:8a23c458b13311bb829850"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ======================
// Helpers
// ======================
function getNextDays(count = 10) {
  const weekDays = ["یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه", "شنبه"];
  const days = [];
  const today = new Date();

  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push({
      key: d.toISOString().split("T")[0],
      dayName: weekDays[d.getDay()],
      dateStr: d.toLocaleDateString("fa-IR")
    });
  }
  return days;
}

function getUserName() {
  return document.getElementById("tempName").value.trim();
}

// ======================
// Render Days
// ======================
async function renderDays() {
  const container = document.getElementById("daysContainer");
  container.innerHTML = "";
  const days = getNextDays(10);

  for (const day of days) {
    const item = document.createElement("div");
    item.className = "day-item";
    item.dataset.key = day.key;

    // Get reservation count for this day
    let total = 0;
    try {
      const snap = await getDoc(doc(db, "oncall", day.key));
      if (snap.exists()) {
        const data = snap.data();
        Object.values(data).forEach(arr => {
          if (Array.isArray(arr)) total += arr.length;
        });
      }
    } catch (e) {
      console.log("Error loading count:", e);
    }

    item.innerHTML = `
      <div class="day-header">
        <div>
          <div class="day-title">${day.dayName}</div>
          <div class="day-date">${day.dateStr}${total > 0 ? ` • ${total} رزرو` : ""}</div>
        </div>
        <div class="day-arrow">▼</div>
      </div>
      <div class="hours-panel">
        <div class="hours-grid" id="hours-${day.key}"></div>
      </div>
    `;

    item.querySelector(".day-header").onclick = () => toggleDay(item, day.key);
    container.appendChild(item);
  }
}

function toggleDay(item, dayKey) {
  const isOpen = item.classList.contains("open");

  document.querySelectorAll(".day-item").forEach(el => {
    el.classList.remove("open");
  });

  if (!isOpen) {
    item.classList.add("open");
    renderHours(dayKey);
  }
}

// ======================
// Render Hours + Real-time
// ======================
let currentUnsub = null;

async function renderHours(dayKey) {
  const grid = document.getElementById(`hours-${dayKey}`);
  if (!grid) return;

  // Unsubscribe previous listener
  if (currentUnsub) {
    currentUnsub();
    currentUnsub = null;
  }

  const user = getUserName();

  // Real-time listener
  const dayRef = doc(db, "oncall", dayKey);
  currentUnsub = onSnapshot(dayRef, (snap) => {
    const dayData = snap.exists() ? snap.data() : {};
    grid.innerHTML = "";

    for (let h = 1; h <= 24; h++) {
      const hourKey = String(h);
      const people = dayData[hourKey] || [];
      const isSelected = user && people.includes(user);
      const count = people.length;

      const btn = document.createElement("button");
      btn.className = "hour-btn" + (isSelected ? " selected" : "");
      btn.innerHTML = `
        ${h}
        <span class="count">${count > 0 ? count + " نفر" : "-"}</span>
      `;

      btn.onclick = (e) => {
        e.stopPropagation();
        toggleHour(dayKey, h);
      };

      grid.appendChild(btn);
    }
  }, (error) => {
    console.error("Snapshot error:", error);
    grid.innerHTML = "<p style='color:red;font-size:13px;padding:10px'>خطا در دریافت داده</p>";
  });
}

async function toggleHour(dayKey, hour) {
  const user = getUserName();
  if (!user) {
    alert("لطفاً ابتدا نام خود را وارد کنید");
    document.getElementById("tempName").focus();
    return;
  }

  const hourKey = String(hour);
  const dayRef = doc(db, "oncall", dayKey);

  try {
    const snap = await getDoc(dayRef);
    
    if (!snap.exists()) {
      // Create new document
      await setDoc(dayRef, {
        [hourKey]: [user]
      });
    } else {
      const data = snap.data();
      const people = data[hourKey] || [];

      if (people.includes(user)) {
        // Remove
        await updateDoc(dayRef, {
          [hourKey]: arrayRemove(user)
        });
      } else {
        // Add
        await updateDoc(dayRef, {
          [hourKey]: arrayUnion(user)
        });
      }
    }
  } catch (error) {
    console.error("Toggle error:", error);
    alert("خطا در ذخیره. دوباره تلاش کنید.");
  }
}

// ======================
// Manager Panel
// ======================
document.getElementById("managerBtn").onclick = async () => {
  document.getElementById("managerPanel").style.display = "block";
  await renderManager();
};

document.getElementById("closeManager").onclick = () => {
  document.getElementById("managerPanel").style.display = "none";
};

async function renderManager() {
  const content = document.getElementById("managerContent");
  content.innerHTML = "<p style='font-size:13px;color:#64748b'>در حال بارگذاری...</p>";

  const days = getNextDays(10);
  let html = "";

  for (const day of days) {
    try {
      const snap = await getDoc(doc(db, "oncall", day.key));
      if (!snap.exists()) continue;

      const dayData = snap.data();
      const hours = Object.keys(dayData)
        .map(Number)
        .filter(h => Array.isArray(dayData[String(h)]) && dayData[String(h)].length > 0)
        .sort((a, b) => a - b);

      if (hours.length === 0) continue;

      html += `<div class="manager-day"><h3>${day.dayName} ${day.dateStr}</h3>`;
      hours.forEach(h => {
        const people = dayData[String(h)] || [];
        html += `<div class="manager-slot">ساعت ${h}: ${people.join("، ")}</div>`;
      });
      html += `</div>`;
    } catch (e) {
      console.log(e);
    }
  }

  content.innerHTML = html || "<p style='color:#94a3b8;font-size:13px'>هنوز رزروی ثبت نشده</p>";
}

// Re-render when name changes
document.getElementById("tempName").addEventListener("input", () => {
  const openItem = document.querySelector(".day-item.open");
  if (openItem) {
    renderHours(openItem.dataset.key);
  }
});

// Start
renderDays();
