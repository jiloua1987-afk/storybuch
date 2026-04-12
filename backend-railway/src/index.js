require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: [
    process.env.FRONTEND_URL || "http://localhost:3000",
    "https://storybuch-git-main-jiloua1987-afks-projects.vercel.app",
    /\.vercel\.app$/,
  ],
}));
app.use(express.json({ limit: "50mb" }));

app.use("/api/comic", require("./routes/comic"));

app.get("/health", (_, res) => res.json({ status: "ok", service: "MyComicStory Backend" }));

app.listen(PORT, () => console.log(`MyComicStory Backend läuft auf Port ${PORT}`));
