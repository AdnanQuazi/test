const getEmbedding = require("../services/embedding-service");

async function processMessages(messages, channelId) {  // Accept channelId as an argument
    return Promise.all(
        messages.map(async (msg) => {
            const formattedText = msg.text?.trim() ? `${msg.user}: ${msg.text}` : msg.user;

            let embedding = [];
            try {
                embedding = await getEmbedding(formattedText, { pooling: "mean", normalize: true });
                embedding = Array.isArray(embedding) ? embedding : Object.values(embedding);
            } catch (error) {
                console.error(`Embedding failed for message ${msg.ts}:`, error);
            }

            return {
                ts: msg.ts,
                thread_ts: msg.thread_ts || null,
                type: msg.thread_ts ? "thread" : "message",
                user_id: msg.user,
                text: formattedText,
                channel_id: channelId,  // Manually assign channel_id
                embedding,
            };
        })
    );
}

module.exports = { processMessages };
