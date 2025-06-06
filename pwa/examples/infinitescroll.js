const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const searchInput = document.getElementById("search");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight - 50; // adjust for UI height

let scrollOffset = 0;
const rowHeight = 40;
let allSongs = [];
let filteredSongs = [];

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("freqhole", 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      const store = db.createObjectStore("songs", { keyPath: "id" });
      store.createIndex("title", "title");
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function checkAndSeed(db) {
  return new Promise((resolve) => {
    const tx = db.transaction("songs", "readonly");
    const store = tx.objectStore("songs");
    const countReq = store.count();
    countReq.onsuccess = () => {
      if (countReq.result > 0) {
        resolve(false);
      } else {
        const tx = db.transaction("songs", "readwrite");
        const store = tx.objectStore("songs");
        for (let i = 0; i < 10_000; i++) {
          store.add({
            id: String(i),
            title: `Freqhole #${i} - ${fakerWord()}`,
            artist: `Artist ${String.fromCharCode(65 + (i % 26))}`,
            genre: ["Noise", "Dub", "Acid", "Field", "Techno"][i % 5],
          });
        }
        tx.oncomplete = () => resolve(true);
      }
    };
  });
}

function loadAllSongs(db) {
  return new Promise((resolve) => {
    const tx = db.transaction("songs", "readonly");
    const store = tx.objectStore("songs");
    const cursor = store.openCursor();
    const list = [];

    cursor.onsuccess = (e) => {
      const c = e.target.result;
      if (c) {
        list.push(c.value);
        c.continue();
      } else {
        resolve(list);
      }
    };
  });
}

function renderSongs() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const start = Math.floor(scrollOffset / rowHeight);
  const end = start + Math.ceil(canvas.height / rowHeight);

  for (let i = start; i < end && i < filteredSongs.length; i++) {
    const y = i * rowHeight - scrollOffset;

    ctx.fillStyle = i % 2 === 0 ? "#222" : "#111";
    ctx.fillRect(0, y, canvas.width, rowHeight);

    ctx.fillStyle = "#ff00ff";
    const s = filteredSongs[i];
    ctx.fillText(`${s.title} — ${s.artist} [${s.genre}]`, 20, y + 25);
  }
}

function getRowAtPosition(y) {
  const index = Math.floor((y + scrollOffset) / rowHeight);
  return filteredSongs[index];
}

canvas.addEventListener("wheel", (e) => {
  scrollOffset += e.deltaY;
  scrollOffset = Math.max(
    0,
    Math.min(scrollOffset, filteredSongs.length * rowHeight - canvas.height),
  );
  renderSongs();
});

canvas.addEventListener("click", (e) => {
  const y = e.clientY - canvas.getBoundingClientRect().top;
  const clicked = getRowAtPosition(y);
  if (clicked) {
    alert(`Clicked: ${clicked.title} by ${clicked.artist}`);
  }
});

window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight - 50;
  renderSongs();
});

searchInput.addEventListener("input", () => {
  const query = searchInput.value.toLowerCase();

  filteredSongs = allSongs.filter((s) =>
    Object.values(s).some((v) => v.toLowerCase().includes(query)),
  );

  document.getElementById("search-results-length").innerText =
    `(${filteredSongs.length})`;
  scrollOffset = 0;
  renderSongs();
});

function fakerWord() {
  return Math.random().toString(36).substring(7).toUpperCase();
}

(async () => {
  const db = await openDB();
  await checkAndSeed(db);
  allSongs = await loadAllSongs(db);
  filteredSongs = [...allSongs];
  renderSongs();
})();
