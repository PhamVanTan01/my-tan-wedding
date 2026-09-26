document.querySelectorAll(".dress-code, .timeline-card").forEach((section) => section.remove());

const gate = document.querySelector("#invitationGate");
const openButton = document.querySelector("#openInvitation");
const toast = document.querySelector("#toast");
const autoScrollToggle = document.querySelector("#autoScrollToggle");
const backgroundMusic = document.querySelector("#backgroundMusic");
const musicToggle = document.querySelector("#musicToggle");
let toastTimer;
let autoScrollTimer;
let autoScrollRunning = false;
let lastScrollFrame = 0;
let autoScrollPosition = 0;

if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}
window.scrollTo(0, 0);

function showToast(message) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("is-visible");
  toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2800);
}

function openInvitation() {
  window.scrollTo({ top: 0, behavior: "auto" });
  gate.classList.add("is-opening");
  document.body.classList.remove("is-locked");
  document.documentElement.style.overflowY = "auto";
  document.body.style.overflowY = "auto";
  musicToggle.classList.add("is-visible");
  window.setTimeout(() => gate.remove(), 750);
  window.setTimeout(() => {
    autoScrollToggle.classList.add("is-visible");
    window.requestAnimationFrame(() => window.requestAnimationFrame(startAutoScroll));
  }, 900);
}

const OPEN_WAIT_MAX = 6000;

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function handleOpenClick() {
  if (openButton.disabled) return;
  openButton.disabled = true;
  openButton.textContent = "Đang mở thiệp...";
  // Phát nhạc ngay trong lúc bấm để trình duyệt (nhất là iPhone) không chặn tự phát.
  playMusic();
  // Chờ lời chúc tải xong, nhưng không quá OPEN_WAIT_MAX để khách không phải đợi lâu.
  await Promise.race([wishesReady, wait(OPEN_WAIT_MAX)]);
  openInvitation();
}

openButton.addEventListener("click", handleOpenClick);

function updateMusicButton() {
  const isPlaying = !backgroundMusic.paused;
  musicToggle.setAttribute("aria-pressed", String(isPlaying));
  musicToggle.setAttribute(
    "aria-label",
    isPlaying ? "Tạm dừng nhạc Em Đồng Ý (I Do)" : "Phát nhạc Em Đồng Ý (I Do)",
  );
  musicToggle.querySelector("span").textContent = isPlaying ? "Ⅱ" : "♪";
}

async function playMusic() {
  try {
    await backgroundMusic.play();
  } catch (error) {
    console.warn("Trình duyệt chưa cho phép tự phát nhạc.", error);
    showToast("Chạm nút ♪ để phát nhạc.");
  }
  updateMusicButton();
}

musicToggle.addEventListener("click", () => {
  if (backgroundMusic.paused) playMusic();
  else backgroundMusic.pause();
});

backgroundMusic.addEventListener("play", updateMusicButton);
backgroundMusic.addEventListener("pause", updateMusicButton);

function updateAutoScrollButton() {
  autoScrollToggle.setAttribute("aria-pressed", String(autoScrollRunning));
  autoScrollToggle.setAttribute(
    "aria-label",
    autoScrollRunning ? "Tạm dừng cuộn tự động" : "Tiếp tục cuộn tự động",
  );
  autoScrollToggle.querySelector("span").textContent = autoScrollRunning ? "Ⅱ" : "▶";
}

function autoScrollStep(timestamp) {
  if (!autoScrollRunning) return;
  if (!lastScrollFrame) {
    lastScrollFrame = timestamp;
    autoScrollTimer = window.requestAnimationFrame(autoScrollStep);
    return;
  }

  const elapsed = Math.min(timestamp - lastScrollFrame, 50);
  lastScrollFrame = timestamp;
  // Nếu trang bị dịch chuyển (ảnh tải xong, kéo thanh cuộn...) thì bám theo vị trí thật.
  if (Math.abs(window.scrollY - autoScrollPosition) > 4) {
    autoScrollPosition = window.scrollY;
  }
  autoScrollPosition += elapsed * 0.04;
  // Giữ số lẻ để màn hình mật độ cao cuộn từng phần pixel, không bị bước 2px/3px.
  window.scrollTo(0, autoScrollPosition);

  const reachedEnd = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
  if (reachedEnd) {
    pauseAutoScroll();
    return;
  }

  autoScrollTimer = window.requestAnimationFrame(autoScrollStep);
}

function startAutoScroll() {
  if (autoScrollRunning) return;
  if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) {
    window.scrollTo({ top: 0, behavior: "auto" });
  }
  autoScrollRunning = true;
  // Tắt scroll-behavior: smooth trong lúc tự cuộn, nếu không mỗi khung hình sẽ tạo
  // một hiệu ứng cuộn mượt mới chồng lên nhau gây giật.
  document.documentElement.style.scrollBehavior = "auto";
  lastScrollFrame = 0;
  autoScrollPosition = Math.max(0, window.scrollY || window.pageYOffset || 0);
  updateAutoScrollButton();
  window.cancelAnimationFrame(autoScrollTimer);
  autoScrollTimer = window.requestAnimationFrame(autoScrollStep);
}

function pauseAutoScroll() {
  autoScrollRunning = false;
  document.documentElement.style.scrollBehavior = "";
  window.cancelAnimationFrame(autoScrollTimer);
  window.clearTimeout(autoScrollTimer);
  updateAutoScrollButton();
}

autoScrollToggle.addEventListener("click", () => {
  if (autoScrollRunning) pauseAutoScroll();
  else startAutoScroll();
});

function pauseForManualInteraction(event) {
  if (!autoScrollRunning || event.target.closest?.("#autoScrollToggle")) return;
  pauseAutoScroll();
}

window.addEventListener("wheel", pauseForManualInteraction, { passive: true });
window.addEventListener("touchmove", pauseForManualInteraction, { passive: true });
document.addEventListener("keydown", (event) => {
  if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "].includes(event.key)) {
    pauseAutoScroll();
  }
});

document.addEventListener("visibilitychange", () => {
  if (!document.hidden && autoScrollRunning) {
    lastScrollFrame = 0;
    autoScrollPosition = Math.max(0, window.scrollY || window.pageYOffset || 0);
    window.cancelAnimationFrame(autoScrollTimer);
    autoScrollTimer = window.requestAnimationFrame(autoScrollStep);
  }
});

const targetDate = new Date("2026-10-17T10:30:00+07:00").getTime();
const countdownUnits = [
  ["days", 86_400_000],
  ["hours", 3_600_000],
  ["minutes", 60_000],
  ["seconds", 1_000],
];

function updateCountdown() {
  let remaining = Math.max(0, targetDate - Date.now());

  countdownUnits.forEach(([id, duration]) => {
    const value = Math.floor(remaining / duration);
    remaining %= duration;
    document.querySelector(`#${id}`).textContent = String(value).padStart(2, "0");
  });

  if (Date.now() >= targetDate) {
    document.querySelector("#countdownDone").hidden = false;
  }
}

updateCountdown();
window.setInterval(updateCountdown, 1000);

function renderCalendar() {
  const grid = document.querySelector("#calendarGrid");
  const weekdays = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
  const firstDay = new Date(2026, 9, 1).getDay();
  const mondayOffset = (firstDay + 6) % 7;

  weekdays.forEach((day) => {
    const cell = document.createElement("span");
    cell.className = "weekday";
    cell.textContent = day;
    grid.append(cell);
  });

  for (let index = 0; index < mondayOffset; index += 1) {
    const blank = document.createElement("span");
    blank.className = "blank";
    blank.textContent = "0";
    grid.append(blank);
  }

  for (let day = 1; day <= 31; day += 1) {
    const cell = document.createElement("span");
    cell.textContent = day;
    if (day === 17 || day === 21) {
      cell.className = "wedding-day";
      cell.setAttribute("aria-label", `Ngày cưới ${day} tháng 10`);
    }
    grid.append(cell);
  }
}

renderCalendar();

const photos = [
  "./assets/p3.webp",
  "./assets/p4.webp",
  "./assets/p5.jpg",
  "./assets/p6.jpg",
  "./assets/p7.jpg",
  "./assets/p8.jpg",
  "./assets/p2.jpg",
  "./assets/p9.jpg",
  "./assets/p10.jpg",
  "./assets/p1.jpg",
  "./assets/optimized/p11.webp",
  "./assets/optimized/p12.webp",
  "./assets/optimized/p13.webp",
  "./assets/optimized/p14.webp",
  "./assets/optimized/p15.webp",
  "./assets/optimized/p16.webp",
  "./assets/optimized/p17.webp",
  "./assets/optimized/p18.webp",
  "./assets/optimized/p19.webp",
  "./assets/optimized/p20.webp",
];
const lightbox = document.querySelector("#lightbox");
const lightboxImage = document.querySelector("#lightboxImage");
const lightboxCounter = document.querySelector("#lightboxCounter");
const albumSection = document.querySelector(".album-section");
const albumViewport = document.querySelector("#albumViewport");
const albumTrack = document.querySelector("#albumTrack");
let currentPhoto = 0;
let albumAnimationFrame = 0;
let lastAlbumFrame = 0;
let albumPauseUntil = 0;
let albumScrollPosition = 0;
const mobileAlbumQuery = window.matchMedia("(max-width: 768px), (pointer: coarse)");

const originalAlbumItems = [...albumTrack.children];
originalAlbumItems.forEach((item) => {
  const clone = item.cloneNode(true);
  clone.setAttribute("aria-hidden", "true");
  clone.tabIndex = -1;
  albumTrack.append(clone);
});

function getAlbumSpeed() {
  return mobileAlbumQuery.matches ? .09 : .045;
}

function getAlbumResumeDelay() {
  return mobileAlbumQuery.matches ? 650 : 1800;
}

function pauseAlbumMotion(duration = getAlbumResumeDelay()) {
  albumPauseUntil = performance.now() + duration;
}

function albumMotionStep(timestamp) {
  if (!lastAlbumFrame) lastAlbumFrame = timestamp;
  const elapsed = Math.min(timestamp - lastAlbumFrame, 50);
  lastAlbumFrame = timestamp;

  if (timestamp >= albumPauseUntil && !document.hidden && !lightbox.open) {
    albumScrollPosition += elapsed * getAlbumSpeed();
    const loopPoint = albumTrack.scrollWidth / 2;
    if (loopPoint && albumScrollPosition >= loopPoint) {
      albumScrollPosition -= loopPoint;
    }
    albumViewport.scrollLeft = albumScrollPosition;
  } else {
    albumScrollPosition = albumViewport.scrollLeft;
  }

  albumAnimationFrame = window.requestAnimationFrame(albumMotionStep);
}

function startAlbumMotion() {
  if (albumAnimationFrame || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  lastAlbumFrame = 0;
  albumScrollPosition = albumViewport.scrollLeft;
  albumAnimationFrame = window.requestAnimationFrame(albumMotionStep);
}

function stopAlbumMotion() {
  window.cancelAnimationFrame(albumAnimationFrame);
  albumAnimationFrame = 0;
  lastAlbumFrame = 0;
  albumScrollPosition = albumViewport.scrollLeft;
}

const albumObserver = new IntersectionObserver(
  ([entry]) => {
    if (entry.isIntersecting) startAlbumMotion();
    else stopAlbumMotion();
  },
  { threshold: .05, rootMargin: "15% 0px" },
);

albumObserver.observe(albumSection);

albumViewport.addEventListener("pointerdown", () => {
  albumPauseUntil = Number.POSITIVE_INFINITY;
}, { passive: true });
albumViewport.addEventListener("pointerup", () => pauseAlbumMotion(), { passive: true });
albumViewport.addEventListener("pointercancel", () => pauseAlbumMotion(), { passive: true });
albumViewport.addEventListener("wheel", () => pauseAlbumMotion(1200), { passive: true });
albumViewport.addEventListener("keydown", () => {
  albumPauseUntil = Number.POSITIVE_INFINITY;
});
albumViewport.addEventListener("focusout", () => pauseAlbumMotion(500));

function showPhoto(index) {
  currentPhoto = (index + photos.length) % photos.length;
  lightboxImage.src = photos[currentPhoto];
  lightboxCounter.textContent = `${currentPhoto + 1} / ${photos.length}`;
}

albumTrack.addEventListener("click", (event) => {
  const button = event.target.closest("[data-image]");
  if (!button) return;
  showPhoto(Number(button.dataset.image));
  lightbox.showModal();
});

document.querySelector(".lightbox-close").addEventListener("click", () => lightbox.close());
document.querySelector(".lightbox-nav.prev").addEventListener("click", () => showPhoto(currentPhoto - 1));
document.querySelector(".lightbox-nav.next").addEventListener("click", () => showPhoto(currentPhoto + 1));

lightbox.addEventListener("click", (event) => {
  if (event.target === lightbox) lightbox.close();
});

document.addEventListener("keydown", (event) => {
  if (!lightbox.open) return;
  if (event.key === "ArrowLeft") showPhoto(currentPhoto - 1);
  if (event.key === "ArrowRight") showPhoto(currentPhoto + 1);
});

const rsvpDialog = document.querySelector("#rsvpDialog");
const rsvpForm = document.querySelector("#rsvpForm");
const rsvpSubmitButton = rsvpForm.querySelector('button[type="submit"]');
const rsvpEndpoint = "https://script.google.com/macros/s/AKfycbxuU1Hz-rK1ZS4b1Tr6ap8sZc0VOQmD4EIf_Vgxj45eCmNmYPG8BFfAKQ37-HM8zEcH/exec";

document.querySelector("#openRsvp").addEventListener("click", () => rsvpDialog.showModal());
document.querySelector(".modal-close").addEventListener("click", (event) => {
  event.preventDefault();
  rsvpDialog.close();
});

rsvpDialog.addEventListener("click", (event) => {
  if (event.target === rsvpDialog) rsvpDialog.close();
});

rsvpForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!rsvpForm.reportValidity()) return;

  const response = Object.fromEntries(new FormData(rsvpForm));
  response.createdAt = new Date().toISOString();

  const originalButtonText = rsvpSubmitButton.textContent;
  rsvpSubmitButton.disabled = true;
  rsvpSubmitButton.textContent = "Đang gửi...";

  try {
    await fetch(rsvpEndpoint, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(response),
      keepalive: true,
    });

    localStorage.setItem("my-tan-rsvp", JSON.stringify(response));
    rsvpForm.reset();
    rsvpDialog.close();
    showToast("Cảm ơn bạn! Xác nhận đã được gửi đến cô dâu và chú rể.");
  } catch (error) {
    console.warn("Không thể gửi xác nhận tham dự.", error);
    showToast("Chưa gửi được xác nhận. Vui lòng kiểm tra mạng và thử lại.");
  } finally {
    rsvpSubmitButton.disabled = false;
    rsvpSubmitButton.textContent = originalButtonText;
  }
});

const wishForm = document.querySelector("#wishForm");
const wishList = document.querySelector("#wishList");
const wishSubmitButton = wishForm.querySelector('button[type="submit"]');
const wishesCacheKey = "my-tan-shared-wishes";
const wishesRequestTimeout = 10000;
let sharedWishes = [];

function readCachedWishes() {
  try {
    const cached = JSON.parse(localStorage.getItem(wishesCacheKey));
    return Array.isArray(cached) ? cached : [];
  } catch {
    return [];
  }
}

function cacheWishes(wishes) {
  try {
    localStorage.setItem(wishesCacheKey, JSON.stringify(wishes));
  } catch {
    // Trang vẫn hoạt động bình thường khi trình duyệt chặn localStorage.
  }
}

async function loadSharedWishes() {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), wishesRequestTimeout);

  try {
    const response = await fetch(`${rsvpEndpoint}?action=wishes&t=${Date.now()}`, {
      method: "GET",
      mode: "cors",
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    if (!response.ok) throw new Error(`wish_request_failed_${response.status}`);
    const payload = await response.json();
    if (!payload || !payload.ok || !Array.isArray(payload.wishes)) {
      throw new Error("invalid_wish_response");
    }
    return payload.wishes;
  } finally {
    window.clearTimeout(timeout);
  }
}

function renderWishes(wishes = sharedWishes) {
  wishList.replaceChildren();
  wishList.removeAttribute("aria-busy");

  if (!wishes.length) {
    const empty = document.createElement("p");
    empty.className = "wish-empty";
    empty.textContent = "Hãy là người đầu tiên gửi lời chúc đến cô dâu và chú rể.";
    wishList.append(empty);
    return;
  }

  wishes.slice().reverse().forEach((wish) => {
    const article = document.createElement("article");
    article.className = "wish-item";

    const header = document.createElement("header");
    const name = document.createElement("strong");
    const time = document.createElement("time");
    const message = document.createElement("p");

    name.textContent = wish.name;
    time.dateTime = wish.createdAt;
    time.textContent = new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(wish.createdAt));
    message.textContent = wish.message;

    header.append(name, time);
    article.append(header, message);
    wishList.append(article);
  });
}

async function refreshWishes({ showLoading = false } = {}) {
  if (showLoading) {
    wishList.setAttribute("aria-busy", "true");
    const loading = document.createElement("p");
    loading.className = "wish-empty";
    loading.textContent = "Đang tải lời chúc...";
    wishList.replaceChildren(loading);
  }

  try {
    sharedWishes = await loadWishesWithRetry();
    cacheWishes(sharedWishes);
    renderWishes();
    return true;
  } catch (error) {
    console.warn("Không thể tải sổ lời chúc dùng chung.", error);
    wishList.removeAttribute("aria-busy");
    if (!sharedWishes.length) sharedWishes = readCachedWishes();
    if (sharedWishes.length) {
      renderWishes();
      return true;
    }
    if (!sharedWishes.length) {
      const unavailable = document.createElement("p");
      unavailable.className = "wish-empty";
      unavailable.textContent = "Chưa tải được lời chúc. Vui lòng thử lại sau.";
      wishList.replaceChildren(unavailable);
    }
    return false;
  }
}

async function loadWishesWithRetry(attempts = 3) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await loadSharedWishes();
    } catch (error) {
      if (attempt >= attempts) throw error;
      await new Promise((resolve) => window.setTimeout(resolve, 1500 * attempt));
    }
  }
}

wishForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!wishForm.reportValidity()) return;

  const data = new FormData(wishForm);
  const wish = {
    type: "wish",
    name: String(data.get("name")).trim(),
    message: String(data.get("message")).trim(),
    createdAt: new Date().toISOString(),
  };

  const originalButtonText = wishSubmitButton.textContent;
  wishSubmitButton.disabled = true;
  wishSubmitButton.textContent = "Đang gửi...";

  try {
    await fetch(rsvpEndpoint, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(wish),
      keepalive: true,
    });
    wishForm.reset();
    await refreshWishes();
    showToast("Lời chúc đã được gửi và hiển thị trong sổ lưu bút. Cảm ơn bạn!");
  } catch (error) {
    console.warn("Không thể gửi lời chúc.", error);
    showToast("Chưa gửi được lời chúc. Vui lòng kiểm tra mạng và thử lại.");
  } finally {
    wishSubmitButton.disabled = false;
    wishSubmitButton.textContent = originalButtonText;
  }
});

const wishesReady = refreshWishes({ showLoading: true });
window.setInterval(() => {
  if (!document.hidden) refreshWishes();
}, 30000);

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.08 },
);

document.querySelectorAll(".reveal").forEach((element) => observer.observe(element));

const backToTop = document.querySelector("#backToTop");
window.addEventListener(
  "scroll",
  () => backToTop.classList.toggle("is-visible", window.scrollY > 700),
  { passive: true },
);
backToTop.addEventListener("click", () => {
  pauseAutoScroll();
  window.scrollTo({ top: 0, behavior: "smooth" });
});
