const express = require("express");
const path = require("path");
const fs = require("fs");
const app = express();
const PORT = process.env.PORT || 3000;

const birthdayHTML = fs.readFileSync(path.join(__dirname, "public", "index.html"), "utf-8");

app.use(express.static(path.join(__dirname, "public")));

// API Routes for Content Management
app.get("/api/content", (req, res) => {
  try {
    const data = fs.readFileSync(path.join(__dirname, "data", "content.json"), "utf-8");
    res.json(JSON.parse(data));
  } catch(e) { res.status(500).json({error: "Failed to load content"}); }
});

app.put("/api/content", (req, res) => {
  try {
    fs.writeFileSync(path.join(__dirname, "data", "content.json"), JSON.stringify(req.body), "utf-8");
    res.json({success: true});
  } catch(e) { res.status(500).json({error: "Failed to save content"}); }
});

app.get("/api/locations", (req, res) => {
  try {
    const data = fs.readFileSync(path.join(__dirname, "data", "locations.json"), "utf-8");
    res.json(JSON.parse(data));
  } catch(e) { res.status(500).json({error: "Failed to load locations"}); }
});

app.put("/api/locations", (req, res) => {
  try {
    fs.writeFileSync(path.join(__dirname, "data", "locations.json"), JSON.stringify(req.body), "utf-8");
    res.json({success: true});
  } catch(e) { res.status(500).json({error: "Failed to save locations"}); }
});

app.get("/api/categories", (req, res) => {
  try {
    const data = fs.readFileSync(path.join(__dirname, "data", "categories.json"), "utf-8");
    res.json(JSON.parse(data));
  } catch(e) { res.status(500).json({error: "Failed to load categories"}); }
});

app.put("/api/categories", (req, res) => {
  try {
    fs.writeFileSync(path.join(__dirname, "data", "categories.json"), JSON.stringify(req.body), "utf-8");
    res.json({success: true});
  } catch(e) { res.status(500).json({error: "Failed to save categories"}); }
});

app.get("*", (req, res) => {
  res.send(birthdayHTML);
});

app.listen(PORT, () => {
  console.log(`Running on port ${PORT}`);
});
