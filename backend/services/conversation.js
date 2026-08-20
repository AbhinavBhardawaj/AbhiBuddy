const conversations = new Map();

export function getPreviousInteractionId(conversationId) {
    return conversations.get(conversationId) || null;
}

export function updateInteractionId(conversationId, interactionId) {
    conversations.set(conversationId, interactionId);
}

export function deleteConversation(conversationId) {
    conversations.delete(conversationId);
}