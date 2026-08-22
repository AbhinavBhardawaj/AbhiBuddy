let conversationId = crypto.randomUUID();

export async function sendMessage(message) {

    const response = await fetch("https://fluffy-tribble-x5pgrj7jpjrp36xv4-3000.app.github.dev/api/chat", {
        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({
            conversationId,
            message
        })
    });

    if (!response.ok) {
        throw new Error("Failed to get response from server");
    }

    const data = await response.json();

    return data.response;
}