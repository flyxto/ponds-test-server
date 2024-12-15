/** @format */

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Middleware
app.use(
  cors({
    // origin: "https://ponds-photo-booth.vercel.app",
    origin: "http://192.168.1.105:3000",
    // origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  })
);

app.use(express.json());

// Database Connection
mongoose.connect(
  "mongodb+srv://devwish29:VZ1LVat74qR5P4di@cluster0.ysdy3.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);

const imageSchema = new mongoose.Schema({
  uniqueId: String,
  imageUrls: [String],
  selectedUrls: [String],
  userSelected: { type: Boolean, default: false },
  status: { type: String, default: "Pending" },
});

const ImageModel = mongoose.model("Image", imageSchema);

// API Routes
app.post("/submit", async (req, res) => {
  const { imageUrls } = req.body;
  const count = await ImageModel.countDocuments();
  const uniqueId = (count + 1).toString().padStart(4, "0");

  const newImage = new ImageModel({ uniqueId, imageUrls });
  await newImage.save();
  res.json({ uniqueId });
});

app.get("/get/:uniqueId", async (req, res) => {
  const { uniqueId } = req.params;
  console.log(uniqueId);
  const imageObject = await ImageModel.findOne({ uniqueId });
  console.log("request came");
  if (!imageObject)
    return res.json({ message: "Object not found" });
  res.json(imageObject);
});

app.put("/update/:uniqueId", async (req, res) => {
  const { uniqueId } = req.params;
  const { selectedUrls } = req.body;

  const imageObject = await ImageModel.findOneAndUpdate(
    { uniqueId },
    { selectedUrls, userSelected: true },
    { new: true }
  );
  if (!imageObject)
    return res.status(404).json({ message: "Object not found" });

  io.emit("update", imageObject); // Emit the update to clients
  res.json({ message: "Updated successfully" });
});

app.get("/getAll", async (req, res) => {
  try {
    const objects = await ImageModel.find({ userSelected: true });
    res.json(objects);
  } catch (error) {
    res.status(500).json({ message: "Error retrieving objects", error });
  }
});

app.put("/status/:uniqueId", async (req, res) => {
  const { uniqueId } = req.params;
  const { status } = req.body;

  const imageObject = await ImageModel.findOneAndUpdate(
    { uniqueId },
    { status },
    { new: true }
  );
  if (!imageObject)
    return res.status(404).json({ message: "Object not found" });

  io.emit("status", imageObject); // Emit status update to clients
  res.json({ message: "Status updated successfully" });
});

// Start Server
server.listen(5002, () => console.log("Server running on port 5002"));
