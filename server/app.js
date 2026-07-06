const express = require("express");
const cors = require("cors");

const app = express();

if (process.env.NODE_ENV !== "test") {
  app.use(require("morgan")("dev"));
}

app.use(
  cors({
    origin: [
      process.env.NODE_ENV !== "production" && "http://localhost:5173",
      process.env.CLIENT_URL,
    ].filter(Boolean),
    credentials: true,
  }),
);
app.use(express.json());
app.use(require("helmet")());
app.use(require("compression")());

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/", (req, res) => {
  res.json({ message: "SmartHifz API is running!" });
});

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/progress", require("./routes/progressRoutes"));
app.use("/api/chat", require("./routes/chatRoutes"));

app.use((req, res) =>
  res.status(404).json({ success: false, message: "Route not found" }),
);

module.exports = app;
