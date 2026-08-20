import ai from "../config/ai.js";
import abhinavSystemInstruction from "../prompts/abhinav.js";
import {
    getPreviousInteractionId,
    updateInteractionId
} from "./conversation.js";

export async function chat(userMessage, conversationId) {
    const previousInteractionId = getPreviousInteractionId(conversationId);
    const interaction = await ai.interactions.create({
        model: "gemini-3.5-flash-lite",
        system_instruction: abhinavSystemInstruction,
        input: userMessage,
        previous_interaction_id: previousInteractionId || undefined,
    });

    updateInteractionId(conversationId,interaction.id);
    
    return interaction.output_text;
}