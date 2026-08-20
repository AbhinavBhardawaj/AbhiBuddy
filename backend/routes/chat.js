import express from "express";
import { chat } from "../services/gemini.js";

const router = express.Router();

router.post("/", async (req, res) => {
    try {
        const { message, conversationId } = req.body;

        if (!message || !conversationId) {
            return res.status(400).json({
                error: "message and conversationId are required"
            });
        }

        const response = await chat(message, conversationId);

        res.json({
            response
        });

    } catch (error) {
        console.error("Chat error:", error);

        res.status(500).json({
            error: "Something went wrong while processing your message."
        });
    }
});

export default router;