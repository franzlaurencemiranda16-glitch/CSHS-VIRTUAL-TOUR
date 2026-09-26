/* ============================================================
   CSHS Interactive Virtual Campus Tour — Express backend
   - JSON file persistence (data/*.json)
   - Session-based admin auth (credentials from .env / env vars)
   - Image + 360° panorama uploads (sharp processing, no re-blur)
   ============================================================ */
const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const sharp = require("sharp");
const multer = require("multer");

/* ---------- tiny .env loader (no external dependency) ---------- */
(function loadEnv() {
  try {
    const envPath = path.join(__dirname, ".env");
    if (!fs.existsSync(envPath)) return;
    fs.readFileSync(envPath, "utf-8").split(/\r?\n/).forEach((line) => {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
    });
  } catch (e) { /* ignore */ }
})();

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_DIR = path.join(__dirname, "data");
const UPLOAD_DIR = path.join(PUBLIC_DIR, "uploads");
const SESSION_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASS = process.env.ADMIN_PASS || "CSHS2026";
const SESSION_SECRET = process.env.SESSION_SECRET || "cshs-virtual-tour-dev-secret";

[DATA_DIR, UPLOAD_DIR].forEach((d) => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

/* ============================================================
   JSON STORE (atomic writes)
   ============================================================ */
function dbFile(name) { return path.join(DATA_DIR, name + ".json"); }

function readDB(name, fallback) {
  try {
    const raw = fs.readFileSync(dbFile(name), "utf-8");
    return JSON.parse(raw);
  } catch (e) { return fallback; }
}

function writeDB(name, value) {
  const file = dbFile(name);
  const tmp = file + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2), "utf-8");
  fs.renameSync(tmp, file);
}

/* ---------- seed defaults on first run ---------- */
const DEFAULT_CATEGORIES = [
  { id: "cat-academic", name: "Academic", color: "#c8102e", icon: "📚", group: "facilities" },
  { id: "cat-admin", name: "Administration", color: "#1a1d21", icon: "🏛️", group: "offices" },
  { id: "cat-lab", name: "Laboratory", color: "#b3331f", icon: "🔬", group: "laboratories" },
  { id: "cat-student", name: "Student Services", color: "#5b6e63", icon: "🎓", group: "offices" },
  { id: "cat-sports", name: "Sports", color: "#8a1220", icon: "🏐", group: "facilities" },
  { id: "cat-facilities", name: "Facilities", color: "#44474d", icon: "🏫", group: "facilities" },
  { id: "cat-entrance", name: "Entrance", color: "#2b2f36", icon: "🚪", group: "facilities" },
  { id: "cat-safety", name: "Safety", color: "#b9860f", icon: "⛑️", group: "facilities" }
];

const DEFAULT_LOCATIONS = [
  { id: "loc-gate", name: "Main Gate", slug: "main-gate", categoryId: "cat-entrance", short: "The primary entrance to CSHS.", full: "The Main Gate is the primary entrance to Cabiao Senior High School, where visitors and students begin their campus journey.", additionalInfo: "", mapX: 12, mapY: 78, cover: "", images: [], panorama: "https://pannellum.org/images/alma.jpg", video: "", contact: "", hours: "6:00 AM – 6:00 PM", hotspots: [], demo: true, status: "published" },
  { id: "loc-principal", name: "Principal's Office", slug: "principals-office", categoryId: "cat-admin", short: "Office of the School Principal.", full: "The Principal's Office handles school administration, policy matters, and official concerns raised by students, parents, and staff.", additionalInfo: "", mapX: 34, mapY: 48, cover: "", images: [], panorama: "https://pannellum.org/images/bma-2.jpg", video: "", contact: "", hours: "Mon–Fri, 8:00 AM–5:00 PM", hotspots: [], demo: true, status: "published" },
  { id: "loc-ict", name: "ICT Laboratory", slug: "ict-laboratory", categoryId: "cat-lab", short: "Computer laboratory for ICT and programming classes.", full: "Computer laboratory used for ICT-related activities, programming classes, practical exercises, and technology-based learning.", additionalInfo: "", mapX: 58, mapY: 30, cover: "", images: [], panorama: "https://pannellum.org/images/cerro-toco-0.jpg", video: "", contact: "", hours: "Mon–Fri, 7:30 AM–5:00 PM", hotspots: [], demo: true, status: "published" },
  { id: "loc-library", name: "Library", slug: "library", categoryId: "cat-academic", short: "Reading and research resource center.", full: "The Library provides books, references, and a quiet study space for research and independent learning.", additionalInfo: "", mapX: 47, mapY: 58, cover: "", images: [], panorama: "", video: "", contact: "", hours: "Mon–Fri, 7:30 AM–4:30 PM", hotspots: [], demo: true, status: "published" },
  { id: "loc-canteen", name: "Canteen", slug: "canteen", categoryId: "cat-facilities", short: "Campus dining and food stalls.", full: "The Canteen serves meals and snacks to students and staff throughout the school day.", additionalInfo: "", mapX: 70, mapY: 62, cover: "", images: [], panorama: "", video: "", contact: "", hours: "6:30 AM – 4:00 PM", hotspots: [], demo: true, status: "published" },
  { id: "loc-court", name: "Covered Court", slug: "covered-court", categoryId: "cat-sports", short: "Venue for sports and school events.", full: "The Covered Court hosts physical education classes, intramurals, assemblies, and school-wide events.", additionalInfo: "", mapX: 80, mapY: 35, cover: "", images: [], panorama: "", video: "", contact: "", hours: "Open during school hours", hotspots: [], demo: true, status: "published" },
  { id: "loc-clinic", name: "School Clinic", slug: "school-clinic", categoryId: "cat-student", short: "First-aid and student health services.", full: "The School Clinic provides basic first aid and health monitoring for students and staff.", additionalInfo: "", mapX: 38, mapY: 34, cover: "", images: [], panorama: "", video: "", contact: "", hours: "Mon–Fri, 7:30 AM–5:00 PM", hotspots: [], demo: true, status: "published" },
  { id: "loc-guidance", name: "Guidance Office", slug: "guidance-office", categoryId: "cat-student", short: "Student counseling and guidance services.", full: "The Guidance Office supports students with counseling, academic guidance, and personal concerns.", additionalInfo: "", mapX: 26, mapY: 36, cover: "", images: [], panorama: "", video: "", contact: "", hours: "Mon–Fri, 8:00 AM–5:00 PM", hotspots: [], demo: true, status: "published" }
];

const DEFAULT_CONTENT = {
  schoolName: "CABIAO SENIOR HIGH SCHOOL",
  heroLine2: "Interactive Virtual Campus Tour",
  heroDesc: "Explore the laboratories, offices, and facilities of Cabiao Senior High School through an interactive digital campus map.",
  statLocations: "8",
  stat360: "360°",
  about1: "Cabiao Senior High School (CSHS) is located in Cabiao, Nueva Ecija, Philippines. This interactive virtual tour and campus map was built so students, parents, and visitors can explore the campus online before ever setting foot on it.",
  about2: "Use the campus map to search for any office or facility, or step directly into the 360° virtual tour to walk the halls yourself. Everything here — from the map pins to the panoramic scenes — is kept up to date by the school's own content team through the admin dashboard.",
  footerTagline: "Interactive Virtual Campus Tour — explore CSHS from anywhere, anytime.",
  email: "info@cabiaoshs.edu.ph",
  phone: ""
};

const DEFAULT_SETTINGS = {
  schoolName: "Cabiao Senior High School",
  projectTitle: "Interactive Virtual Campus Tour",
  shortDescription: "Explore the laboratories, offices, and facilities of Cabiao Senior High School through an interactive digital campus map.",
  logo: ""
};

const DEFAULT_MAP = { url: "" };

function seedIfMissing(name, fallback) {
  if (!fs.existsSync(dbFile(name))) writeDB(name, fallback);
}
seedIfMissing("categories", DEFAULT_CATEGORIES);
seedIfMissing("locations", DEFAULT_LOCATIONS);
seedIfMissing("content", DEFAULT_CONTENT);
seedIfMissing("settings", DEFAULT_SETTINGS);
seedIfMissing("map-image", DEFAULT_MAP);
seedIfMissing("images", { logo: "", avatar: "", experto: "" });
seedIfMissing("sessions", {});

/* normalise older data files (add missing fields) */
(function normalizeLocations() {
  const locs = readDB("locations", []);
  if (!Array.isArray(locs) || !locs.length) return;
  let changed = false;
  locs.forEach((l) => {
    if (!Array.isArray(l.images)) { l.images = []; changed = true; }
    if (typeof l.additionalInfo !== "string") { l.additionalInfo = ""; changed = true; }
    if (l.mapX == null) { l.mapX = 50; changed = true; }
    if (l.mapY == null) { l.mapY = 50; changed = true; }
    if (!Array.isArray(l.hotspots)) { l.hotspots = []; changed = true; }
  });
  if (changed) writeDB("locations", locs);
})();
(function normalizeCategories() {
  const cats = readDB("categories", []);
  if (!Array.isArray(cats) || !cats.length) return;
  const groupOf = { "cat-academic": "facilities", "cat-admin": "offices", "cat-lab": "laboratories", "cat-student": "offices", "cat-sports": "facilities", "cat-facilities": "facilities", "cat-entrance": "facilities", "cat-safety": "facilities" };
  let changed = false;
  cats.forEach((c) => {
    if (c.group !== "laboratories" && c.group !== "offices" && c.group !== "facilities") {
      c.group = groupOf[c.id] || "facilities";
      changed = true;
    }
  });
  if (changed) writeDB("categories", cats);
})();

/* ============================================================
   AUTH — session tokens + rate limiting
   ============================================================ */
const loginAttempts = new Map(); // key: ip -> {count, first, lockedUntil}

function rateLimitOk(ip) {
  const now = Date.now();
  const rec = loginAttempts.get(ip);
  if (!rec) return true;
  if (rec.lockedUntil && now < rec.lockedUntil) return false;
  if (now - rec.first > 15 * 60 * 1000) { loginAttempts.delete(ip); return true; }
  return rec.count < 8;
}
function recordFail(ip) {
  const now = Date.now();
  const rec = loginAttempts.get(ip) || { count: 0, first: now, lockedUntil: 0 };
  if (now - rec.first > 15 * 60 * 1000) { rec.count = 0; rec.first = now; }
  rec.count++;
  if (rec.count >= 8) rec.lockedUntil = now + 15 * 60 * 1000;
  loginAttempts.set(ip, rec);
}

function pruneSessions() {
  const sessions = readDB("sessions", {});
  const now = Date.now();
  let changed = false;
  Object.keys(sessions).forEach((t) => {
    if (!sessions[t] || !sessions[t].exp || sessions[t].exp < now) { delete sessions[t]; changed = true; }
  });
  if (changed) writeDB("sessions", sessions);
}

function createSession(user) {
  pruneSessions();
  const token = crypto.createHmac("sha256", SESSION_SECRET).update(crypto.randomBytes(32)).digest("hex");
  const sessions = readDB("sessions", {});
  sessions[token] = { user: user, exp: Date.now() + SESSION_TTL, created: Date.now() };
  writeDB("sessions", sessions);
  return token;
}

function destroySession(token) {
  const sessions = readDB("sessions", {});
  delete sessions[token];
  writeDB("sessions", sessions);
}

function getToken(req) {
  const h = req.headers["x-session-token"] || req.headers["authorization"] || "";
  if (h && h.indexOf("Bearer ") === 0) return h.slice(7).trim();
  return (h || "").trim();
}

function validateToken(req) {
  const token = getToken(req);
  if (!token) return null;
  const sessions = readDB("sessions", {});
  const s = sessions[token];
  if (!s || !s.exp || s.exp < Date.now()) return null;
  return { token: token, user: s.user };
}

function requireAuth(req, res, next) {
  const session = validateToken(req);
  if (!session) return res.status(401).json({ error: "Admin authentication required" });
  req.session = session;
  next();
}

function safeEqual(a, b) {
  const ba = Buffer.from(String(a), "utf8");
  const bb = Buffer.from(String(b), "utf8");
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

/* ============================================================
   UPLOADS — sharp processing that NEVER blurs
   ============================================================ */
const ALLOWED_EXT = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 40 * 1024 * 1024, files: 12 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    if (ALLOWED_EXT.indexOf(ext) !== -1 || /^image\//.test(file.mimetype || "")) cb(null, true);
    else cb(new Error("Only image files (JPG, PNG, WEBP) are allowed"));
  }
});

/**
 * Process an uploaded image.
 * Rules (to keep photos crisp):
 *  - auto-rotate from EXIF only
 *  - down-scale ONLY when larger than the limit (never upscale)
 *  - quality 90 jpeg / png kept lossless
 *  - NO blur, NO sharpen, NO colorspace tricks
 */
async function processImage(buffer, opts) {
  opts = opts || {};
  const maxW = opts.maxWidth || 2400;
  const img = sharp(buffer, { failOn: "none" });
  const meta = await img.metadata();
  let pipeline = img.rotate();
  const w = meta.width || 0;
  if (w > maxW) pipeline = pipeline.resize({ width: maxW, withoutEnlargement: true });
  const keepPng = (meta.format === "png" || meta.format === "webp") && meta.hasAlpha;
  if (keepPng) {
    const out = await pipeline.png({ compressionLevel: 9 }).toBuffer();
    return { buffer: out, ext: "png", width: (meta.width > maxW ? maxW : meta.width), height: Math.round((meta.height || 0) * (meta.width > maxW ? maxW / meta.width : 1)) };
  }
  const out = await pipeline.jpeg({ quality: opts.quality || 90, chromaSubsampling: "4:4:4" }).toBuffer();
  const scaled = meta.width > maxW ? maxW / meta.width : 1;
  return { buffer: out, ext: "jpg", width: Math.round(w * scaled), height: Math.round((meta.height || 0) * scaled) };
}

function publicUrl(filename) { return "/uploads/" + filename; }

async function saveUpload(buffer, originalName, opts) {
  const processed = await processImage(buffer, opts);
  const base = Date.now().toString(36) + "-" + crypto.randomBytes(5).toString("hex");
  const filename = base + "." + processed.ext;
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), processed.buffer);
  return {
    url: publicUrl(filename),
    file: filename,
    width: processed.width,
    height: processed.height,
    isPano: !!(processed.width && processed.height && Math.abs(processed.width / processed.height - 2) < 0.25)
  };
}

/* ============================================================
   APP
   ============================================================ */
const app = express();
app.use(express.json({ limit: "60mb" }));

// no-cache for HTML so admin edits show up immediately
app.use((req, res, next) => {
  if (req.path === "/" || req.path.endsWith(".html")) res.set("Cache-Control", "no-store, no-cache, must-revalidate");
  else if (req.path.startsWith("/uploads/")) res.set("Cache-Control", "public, max-age=86400");
  next();
});

app.use(express.static(PUBLIC_DIR));

/* ---------- auth ---------- */
app.post("/api/auth/login", (req, res) => {
  const ip = req.ip || "unknown";
  if (!rateLimitOk(ip)) return res.status(429).json({ error: "Too many attempts. Try again in 15 minutes." });
  const { username, password } = req.body || {};
  const uOk = safeEqual((username || "").trim(), ADMIN_USER) || safeEqual((username || "").trim(), ADMIN_USER.toLowerCase() + "@cabiaoshs.edu.ph");
  const pOk = safeEqual(password || "", ADMIN_PASS);
  if (uOk && pOk) {
    loginAttempts.delete(ip);
    const token = createSession(ADMIN_USER);
    return res.json({ ok: true, token: token, user: ADMIN_USER });
  }
  recordFail(ip);
  return res.status(401).json({ error: "Incorrect username or password." });
});

app.get("/api/auth/session", (req, res) => {
  const s = validateToken(req);
  if (!s) return res.status(401).json({ error: "Not signed in" });
  res.json({ ok: true, user: s.user });
});

app.post("/api/auth/logout", (req, res) => {
  const token = getToken(req);
  if (token) destroySession(token);
  res.json({ ok: true });
});

/* ---------- public reads ---------- */
app.get("/api/locations", (req, res) => res.json(readDB("locations", [])));
app.get("/api/categories", (req, res) => res.json(readDB("categories", [])));
app.get("/api/content", (req, res) => res.json(readDB("content", DEFAULT_CONTENT)));
app.get("/api/settings", (req, res) => res.json(readDB("settings", DEFAULT_SETTINGS)));
app.get("/api/images", (req, res) => res.json(readDB("images", { logo: "", avatar: "", experto: "" })));
app.get("/api/map", (req, res) => res.json(readDB("map-image", DEFAULT_MAP)));

/* ---------- admin writes ---------- */
app.put("/api/locations", requireAuth, (req, res) => {
  if (!Array.isArray(req.body)) return res.status(400).json({ error: "Expected an array of locations" });
  const cleaned = req.body.map((l) => {
    const o = Object.assign({}, l);
    delete o._tmpX; delete o._tmpY;
    if (!Array.isArray(o.images)) o.images = [];
    if (typeof o.additionalInfo !== "string") o.additionalInfo = "";
    if (!Array.isArray(o.hotspots)) o.hotspots = [];
    if (o.mapX == null) o.mapX = 50;
    if (o.mapY == null) o.mapY = 50;
    if (!o.id) o.id = "loc-" + crypto.randomBytes(4).toString("hex");
    if (!o.status) o.status = "published";
    return o;
  });
  writeDB("locations", cleaned);
  res.json({ ok: true, count: cleaned.length });
});

app.put("/api/categories", requireAuth, (req, res) => {
  if (!Array.isArray(req.body)) return res.status(400).json({ error: "Expected an array of categories" });
  writeDB("categories", req.body.map((c) => {
    const o = Object.assign({}, c);
    if (["laboratories", "offices", "facilities"].indexOf(o.group) === -1) o.group = "facilities";
    return o;
  }));
  res.json({ ok: true });
});

app.put("/api/content", requireAuth, (req, res) => {
  if (!req.body || typeof req.body !== "object") return res.status(400).json({ error: "Invalid content" });
  writeDB("content", req.body);
  res.json({ ok: true });
});

app.put("/api/settings", requireAuth, (req, res) => {
  if (!req.body || typeof req.body !== "object") return res.status(400).json({ error: "Invalid settings" });
  const current = readDB("settings", DEFAULT_SETTINGS);
  writeDB("settings", Object.assign({}, current, req.body));
  res.json({ ok: true });
});

app.put("/api/images", requireAuth, (req, res) => {
  if (!req.body || typeof req.body !== "object") return res.status(400).json({ error: "Invalid images" });
  const current = readDB("images", { logo: "", avatar: "", experto: "" });
  ["logo", "avatar", "experto"].forEach((k) => {
    if (typeof req.body[k] === "string") current[k] = req.body[k];
  });
  writeDB("images", current);
  res.json({ ok: true });
});

/* ---------- uploads ---------- */
app.post("/api/upload", requireAuth, (req, res) => {
  upload.array("files", 12)(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message || "Upload failed" });
    if (!req.files || !req.files.length) return res.status(400).json({ error: "No files uploaded" });
    try {
      const kind = (req.body && req.body.kind) || "image";
      const isPano = kind === "panorama";
      const results = [];
      for (const f of req.files) {
        const r = await saveUpload(f.buffer, f.originalname, {
          maxWidth: isPano ? 8000 : 2400,
          quality: isPano ? 89 : 90
        });
        results.push(r);
      }
      res.json({ ok: true, files: results });
    } catch (e) {
      console.error("upload error", e);
      res.status(500).json({ error: "Failed to process image" });
    }
  });
});

app.post("/api/map", requireAuth, (req, res) => {
  upload.single("file")(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message || "Upload failed" });
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    try {
      const r = await saveUpload(req.file.buffer, req.file.originalname, { maxWidth: 4000, quality: 90 });
      writeDB("map-image", { url: r.url });
      res.json({ ok: true, url: r.url });
    } catch (e) {
      console.error("map upload error", e);
      res.status(500).json({ error: "Failed to process map image" });
    }
  });
});

app.delete("/api/map", requireAuth, (req, res) => {
  writeDB("map-image", DEFAULT_MAP);
  res.json({ ok: true });
});

/* ---------- media library ---------- */
app.get("/api/media", async (req, res) => {
  try {
    const files = fs.readdirSync(UPLOAD_DIR).filter((f) => ALLOWED_EXT.indexOf(path.extname(f).toLowerCase()) !== -1);
    const items = [];
    for (const f of files) {
      const full = path.join(UPLOAD_DIR, f);
      const stat = fs.statSync(full);
      let width = 0, height = 0;
      try {
        const m = await sharp(full).metadata();
        width = m.width || 0; height = m.height || 0;
      } catch (e) { /* ignore */ }
      items.push({ file: f, url: publicUrl(f), size: stat.size, mtime: stat.mtimeMs, width: width, height: height });
    }
    items.sort((a, b) => b.mtime - a.mtime);
    res.json({ ok: true, files: items });
  } catch (e) {
    res.status(500).json({ error: "Failed to list media" });
  }
});

app.delete("/api/media/:file", requireAuth, (req, res) => {
  const name = path.basename(req.params.file || "");
  const full = path.join(UPLOAD_DIR, name);
  if (!name || !fs.existsSync(full)) return res.status(404).json({ error: "File not found" });
  fs.unlinkSync(full);
  res.json({ ok: true, file: name });
});

/* ---------- SPA fallback (after all APIs) ---------- */
const indexHTML = fs.readFileSync(path.join(PUBLIC_DIR, "index.html"), "utf-8");
app.get("*", (req, res) => {
  if (req.path.indexOf("/api/") === 0) return res.status(404).json({ error: "Not found" });
  res.send(indexHTML);
});

app.listen(PORT, () => {
  console.log("CSHS Virtual Campus Tour running on http://localhost:" + PORT);
});
