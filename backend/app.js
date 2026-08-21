import express from "express";
import cors from "cors";
import chatRouter from "./routes/chat.js";

const app = express();

app.use(cors({
    origin: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"]
}));

app.use(express.json());

app.use("/api/chat", chatRouter);

const PORT = 3000;

app.listen(PORT, () => {
    console.log(`Abhinav AI running on port ${PORT}`);
});