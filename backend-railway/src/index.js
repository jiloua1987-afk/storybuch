require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow all vercel.app domains
    if (origin.endsWith('.vercel.app') || origin.includes('vercel.app')) {
      return callback(null, true);
    }
    
    // Allow localhost
    if (origin.includes('localhost')) {
      return callback(null, true);
    }
    
    // Allow FRONTEND_URL from env
    if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) {
      return callback(null, true);
    }
    
    // Reject all others
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json({ limit: "50mb" }));

app.use("/api/comic", require("./routes/comic"));

app.get("/health", (_, res) => res.json({ status: "ok", service: "MyComicStory Backend" }));

app.listen(PORT, () => console.log(`MyComicStory Backend läuft auf Port ${PORT}`));
