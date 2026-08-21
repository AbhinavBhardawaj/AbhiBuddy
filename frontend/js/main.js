import { sendMessage } from "./chat.js";
import { initHologram } from "./hologram.js";

const chatForm = document.getElementById("chat-form");
const messageInput = document.getElementById("message-input");
const chatContainer = document.getElementById("chat-container");

// Initialize the Three.js hologram
initHologram("hologram-container");

function addMessage(message, sender) {

    const messageElement = document.createElement("div");

    messageElement.className =
        sender === "user"
            ? "flex justify-end"
            : "flex justify-start";

    messageElement.innerHTML = `
        <div class="max-w-[75%] rounded-2xl px-4 py-3 ${
            sender === "user"
                ? "bg-white text-black"
                : "bg-white/10 text-white"
        }">
            ${message}
        </div>
    `;

    chatContainer.appendChild(messageElement);

    chatContainer.scrollTop = chatContainer.scrollHeight;
}


chatForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const message = messageInput.value.trim();

    if (!message) {
        return;
    }

    addMessage(message, "user");

    messageInput.value = "";

    try {

        const response = await sendMessage(message);

        addMessage(response, "ai");

    } catch (error) {

        console.error(error);

        addMessage(
            "Bhai, kuch problem aa gayi. Backend check kar.",
            "ai"
        );
    }
});