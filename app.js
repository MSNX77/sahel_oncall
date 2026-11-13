// ======================
// Storage helpers
// ======================
function getData() {
  const raw = localStorage.getItem("sahel_oncall_v2");
  return raw ? JSON.parse(raw) : {};
}

function saveData(data) {
  localStorage.setItem("sahel_oncall_v2", JSON.stringify(data));
}

// ======================
// Generate next 10 days
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

// ======================
// Render days (accordion)
// ======================
function renderDays() {
  const container = document.getElementById("daysContainer");
  container.innerHTML = "";
  const days = getNextDays(10);
  const data = getData();

  days.forEach((day, index) => {
    const item = document.createElement("div");
    item.className = "day-item";
    item.dataset.key = day.key;

    // Count total reservations for this day
    let total = 0;
    if (data[day.key]) {
      Object.values(data[day.key]).forEach(arr => total += arr.length);
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

    const header = item.querySelector(".day-header");
    header.onclick = () => toggleDay(item, day.key);

    container.appendChild(item);
  });
}

function toggleDay(item, dayKey) {
  const isOpen = item.classList.contains("open");

  // Close all
  document.querySelectorAll(".day-item").forEach(el => {
    el.classList.remove("open");
  });

  if (!isOpen) {
    item.classList.add("open");
    renderHours(dayKey);
  }
}

// ======================
// Render hours 1-24
// ======================
function renderHours(dayKey) {
  const grid = document.getElementById(`hours-${dayKey}`);
  if (!grid) return;

  const user = document.getElementById("tempName").value.trim();
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
  const user = document.getElementById("tempName").value.trim();
  if (!user) {
    alert("لطفاً ابتدا نام خود را وارد کنید");
    document.getElementById("tempName").focus();
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

  // Clean empty
  if (list.length === 0) delete data[dayKey][hour];

  saveData(data);
  renderHours(dayKey);

  // Update day header count
  renderDays();
  // Re-open the same day
  const item = document.querySelector(`.day-item[data-key="${dayKey}"]`);
  if (item) {
    item.classList.add("open");
    renderHours(dayKey);
  }
}

// ======================
// Manager panel
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

// Re-render hours when name changes
document.getElementById("tempName").addEventListener("input", () => {
  const openItem = document.querySelector(".day-item.open");
  if (openItem) {
    renderHours(openItem.dataset.key);
  }
});

// Start
renderDays();
