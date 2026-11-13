// ======================
// داده‌های نمونه (بعداً به Firebase وصل می‌شود)
// ======================
const staffList = [
  "سعیدی نژاد", "میرجلیلی", "مرادی", "شمشیری", "کریمی", "سلیمانی"
];

// بازه‌های زمانی ثابت
const timeSlots = [
  { id: "morning", label: "صبح (۷ تا ۱۲)", start: 7, end: 12 },
  { id: "afternoon", label: "عصر (۱۳ تا ۱۸)", start: 13, end: 18 },
  { id: "night", label: "شب (۱۹ تا ۲۴)", start: 19, end: 24 }
];

// ذخیره‌سازی موقت در localStorage
function getReservations() {
  const data = localStorage.getItem("sahel_oncall");
  return data ? JSON.parse(data) : {};
}

function saveReservations(data) {
  localStorage.setItem("sahel_oncall", JSON.stringify(data));
}

// تولید ۷ روز آینده
function getNextDays(count = 7) {
  const days = [];
  const weekDays = ["یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه", "شنبه"];
  const today = new Date();

  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dayName = weekDays[d.getDay()];
    const dateStr = d.toLocaleDateString("fa-IR");
    const key = d.toISOString().split("T")[0]; // YYYY-MM-DD
    days.push({ key, dayName, dateStr, full: d });
  }
  return days;
}

// ======================
// رندر روزها
// ======================
function renderDays() {
  const container = document.getElementById("daysContainer");
  container.innerHTML = "";
  const days = getNextDays(7);

  days.forEach(day => {
    const card = document.createElement("div");
    card.className = "day-card";
    card.innerHTML = `
      <div class="day-name">${day.dayName}</div>
      <div class="day-date">${day.dateStr}</div>
    `;
    card.onclick = () => selectDay(day, card);
    container.appendChild(card);
  });
}

let selectedDay = null;

function selectDay(day, cardElement) {
  // حذف active از بقیه
  document.querySelectorAll(".day-card").forEach(c => c.classList.remove("active"));
  cardElement.classList.add("active");

  selectedDay = day;
  document.getElementById("selectedDayTitle").textContent = `بازه‌های ${day.dayName} ${day.dateStr}`;
  document.getElementById("slotsSection").style.display = "block";
  renderSlots();
}

// ======================
// رندر بازه‌ها
// ======================
function renderSlots() {
  if (!selectedDay) return;

  const user = document.getElementById("userSelect").value;
  const reservations = getReservations();
  const dayData = reservations[selectedDay.key] || {};

  const container = document.getElementById("slotsContainer");
  container.innerHTML = "";

  timeSlots.forEach(slot => {
    const people = dayData[slot.id] || [];
    const isReserved = user && people.includes(user);
    const count = people.length;

    const card = document.createElement("div");
    card.className = "slot-card";
    card.innerHTML = `
      <div class="slot-info">
        <div class="slot-time">${slot.label}</div>
        <div class="slot-count"><span>${count}</span> نفر آنکال</div>
      </div>
      <button class="btn-reserve ${isReserved ? 'reserved' : ''} ${!user ? 'disabled' : ''}"
              data-slot="${slot.id}">
        ${isReserved ? "رزرو شده ✓" : "رزرو آنکال"}
      </button>
    `;

    const btn = card.querySelector("button");
    if (user) {
      btn.onclick = () => toggleReservation(slot.id, user);
    }

    container.appendChild(card);
  });
}

function toggleReservation(slotId, user) {
  const reservations = getReservations();
  if (!reservations[selectedDay.key]) {
    reservations[selectedDay.key] = {};
  }
  if (!reservations[selectedDay.key][slotId]) {
    reservations[selectedDay.key][slotId] = [];
  }

  const list = reservations[selectedDay.key][slotId];
  const index = list.indexOf(user);

  if (index === -1) {
    list.push(user);
  } else {
    list.splice(index, 1);
  }

  saveReservations(reservations);
  renderSlots();
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
  const reservations = getReservations();
  const days = getNextDays(7);

  let html = "";
  days.forEach(day => {
    const dayData = reservations[day.key] || {};
    html += `<div class="manager-day"><h3>${day.dayName} ${day.dateStr}</h3>`;

    timeSlots.forEach(slot => {
      const people = dayData[slot.id] || [];
      if (people.length > 0) {
        html += `<div class="manager-slot">• ${slot.label}: ${people.join("، ")}</div>`;
      } else {
        html += `<div class="manager-slot" style="color:#94a3b8">• ${slot.label}: کسی رزرو نکرده</div>`;
      }
    });

    html += `</div>`;
  });

  content.innerHTML = html || "<p>هنوز رزروی ثبت نشده</p>";
}

// تغییر کاربر → رندر مجدد
document.getElementById("userSelect").onchange = () => {
  if (selectedDay) renderSlots();
};

// شروع
renderDays();
