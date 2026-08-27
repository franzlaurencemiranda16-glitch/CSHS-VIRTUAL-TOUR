const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const DATA_DIR = path.join(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function readJSON(file) {
  const fp = path.join(DATA_DIR, file);
  if (!fs.existsSync(fp)) return null;
  return JSON.parse(fs.readFileSync(fp, "utf-8"));
}

function writeJSON(file, data) {
  const fp = path.join(DATA_DIR, file);
  fs.writeFileSync(fp, JSON.stringify(data, null, 2), "utf-8");
}

// ========== LOCATIONS API ==========
app.get("/api/locations", (req, res) => {
  res.json(readJSON("locations.json") || []);
});

app.put("/api/locations", (req, res) => {
  writeJSON("locations.json", req.body);
  res.json({ ok: true });
});

// ========== CATEGORIES API ==========
app.get("/api/categories", (req, res) => {
  res.json(readJSON("categories.json") || []);
});

app.put("/api/categories", (req, res) => {
  writeJSON("categories.json", req.body);
  res.json({ ok: true });
});

// ========== SITE CONTENT API ==========
app.get("/api/content", (req, res) => {
  res.json(readJSON("content.json") || {});
});

app.put("/api/content", (req, res) => {
  writeJSON("content.json", req.body);
  res.json({ ok: true });
});

// ========== CONTACT FORM API ==========
app.get("/api/contacts", (req, res) => {
  res.json(readJSON("contacts.json") || []);
});

app.post("/api/contacts", (req, res) => {
  const list = readJSON("contacts.json") || [];
  list.push({ ...req.body, id: Date.now(), date: new Date().toISOString() });
  writeJSON("contacts.json", list);
  res.json({ ok: true });
});

// ========== ADMIN AUTH ==========
app.post("/api/auth", (req, res) => {
  const { username, password } = req.body;
  if (username === "admin" && password === "CSHS2026") {
    res.json({ ok: true, token: "cshs-authenticated" });
  } else {
    res.status(401).json({ error: "Invalid credentials" });
  }
});

// SPA fallback
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`CSHS Virtual Map running at http://localhost:${PORT}`);
});
