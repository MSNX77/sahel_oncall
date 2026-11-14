// ======================
// تشخیص محیط بله / تلگرام
// ======================
const tg = window.Telegram?.WebApp || window.Bale?.WebApp || null;

if (tg) {
  tg.ready();
  tg.expand(); // تمام صفحه بشه
  try {
    tg.setHeaderColor("#0d9488");
    tg.setBackgroundColor("#f0fdfa");
  } catch(e) {}
}

// گرفتن اطلاعات کاربر از بله
function getBaleUser() {
  if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) {
    const u = tg.initDataUnsafe.user;
    return {
      id: u.id,
      name: [u.first_name, u.last_name].filter(Boolean).join(" ") || "کاربر",
      username: u.username || null
    };
  }
  return null;
}

const baleUser = getBaleUser();

// ======================
// Storage (فعلاً localStorage - بعداً بک‌اند جایگزین)
// ======================
function getData() {
  const raw = localStorage.getItem("sahel_oncall_v3");
  return raw ? JSON.parse(raw) : {};
}

function saveData(data) {
  localStorage.setItem("sahel_oncall_v3", JSON.stringify(data));
}

// ======================
// روزهای آینده
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
  if (baleUser) return baleUser.name;
  return document.getElementById("tempName")?.value.trim() || "";
}

// ======================
// رندر اولیه
// ======================
function initUI() {
  const tempBox = document.getElementById("tempUserBox");
  
  if (baleUser) {
    // کاربر از داخل بله آمده
    tempBox.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;">
        <div style="width:36px;height:36px;background:#0d9488;color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;">
          ${baleUser.name.charAt(0)}
        </div>
        <div>
          <div style="font-weight:bold;font-size:14px;">${baleUser.name}</div>
          <div style="font-size:11px;color:#64748b;">شناسایی از بله</div>
        </div>
      </div>
    `;
    tempBox.style.background = "#ecfdf5";
    tempBox.style.borderColor = "#a7f3d0";
  } else {
    // حالت مرورگر معمولی
    tempBox.innerHTML = `
      <small>موقت - وقتی از داخل بله باز شود، خودکار شناسایی می‌شوید</small>
      <input type="text" id="tempName" placeholder="نام شما را وارد کنید" />
    `;
  }
}

// ======================
// رندر روزها
// ======================
function renderDays() {
  const container = document.getElementById("daysContainer");
  container.innerHTML = "";
  const days = getNextDays(10);
  const data = getData();

  days.forEach(day => {
    let total = 0;
    if (data[day.key]) {
      Object.values(data[day.key]).forEach(arr => {
        if (Array.isArray(arr)) total += arr.length;
      });
    }

    const item = document.createElement("div");
    item.className = "day-item";
    item.dataset.key = day.key;

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
  });
}

function toggleDay(item, dayKey) {
  const isOpen = item.classList.contains("open");
  document.querySelectorAll(".day-item").forEach(el => el.classList.remove("open"));

  if (!isOpen) {
    item.classList.add("open");
    renderHours(dayKey);
  }
}

// ======================
// رندر ساعت‌ها
// ======================
function renderHours(dayKey) {
  const grid = document.getElementById(`hours-${dayKey}`);
  if (!grid) return;

  const user = getUserName();
  const data = getData();
  const dayData = data[dayKey] || {};

  grid.innerHTML = "";

  for (let h = 1; h <= 24; h++) {
    const people = dayData[h] || [];
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
}

function toggleHour(dayKey, hour) {
  const user = getUserName();
  if (!user) {
    alert("نام شما شناسایی نشد. لطفاً از داخل ربات بله وارد شوید.");
    return;
  }

  const data = getData();
  if (!data[dayKey]) data[dayKey] = {};
  if (!data[dayKey][hour]) data[dayKey][hour] = [];

  const list = data[dayKey][hour];
  const idx = list.indexOf(user);

  if (idx === -1) {
    list.push(user);
  } else {
    list.splice(idx, 1);
  }

  if (list.length === 0) delete data[dayKey][hour];

  saveData(data);
  renderHours(dayKey);
  renderDays();

  // دوباره همان روز را باز نگه دار
  const item = document.querySelector(`.day-item[data-key="${dayKey}"]`);
  if (item) {
    item.classList.add("open");
    renderHours(dayKey);
  }
}

// ======================
// پنل مدیر
// ======================
document.getElementById("managerBtn").onclick = () => {
  document.getElementById("managerPanel").style.display = "block";
  renderManager();
};

document.getElementById("closeManager").onclick = () => {
  document.getElementById("managerPanel").style.display = "none";
};

function renderManager() {
  const content = document.getElementById("managerContent");
  const data = getData();
  const days = getNextDays(10);

  let html = "";
  days.forEach(day => {
    const dayData = data[day.key] || {};
    const hours = Object.keys(dayData).map(Number).sort((a, b) => a - b);
    if (hours.length === 0) return;

    html += `<div class="manager-day"><h3>${day.dayName} ${day.dateStr}</h3>`;
    hours.forEach(h => {
      const people = dayData[h] || [];
      if (people.length) {
        html += `<div class="manager-slot">ساعت ${h}: ${people.join("، ")}</div>`;
      }
    });
    html += `</div>`;
  });

  content.innerHTML = html || "<p style='color:#94a3b8;font-size:13px'>هنوز رزروی ثبت نشده</p>";
}

// شروع
initUI();
renderDays();
