const express = require("express");
const path = require("path");
const fs = require("fs");
const app = express();
const PORT = process.env.PORT || 3000;

const birthdayHTML = fs.readFileSync(path.join(__dirname, "public", "index.html"), "utf-8");

app.use(express.static(path.join(__dirname, "public")));

app.get("*", (req, res) => {
  res.send(birthdayHTML);
});

app.listen(PORT, () => {
  console.log(`Running on port ${PORT}`);
});
