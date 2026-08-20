import ai from "../config/ai.js";
import abhinavSystemInstruction from "../prompts/abhinav.js";


let previousInteractionId = null;

export async function chat(userMessage) {
    const interaction = await ai.interactions.create({
        model: "gemini-3.5-flash-lite",
        system_instruction: abhinavSystemInstruction,
        input: userInput,
        previous_interaction_id: previousInteractionId || undefined,
    });

    previousInteractionId = interaction.id;
    
    return interaction.output_text;
}