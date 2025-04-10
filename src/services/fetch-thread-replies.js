async function extractThreadReplies(messages, client, channelId) {
    const threadTsList = messages .filter((msg) => msg.thread_ts && msg.subtype !== "thread_broadcast").map(msg => msg.thread_ts);
    if (threadTsList.length === 0) return [];

    try {
        const threadRequests = threadTsList.map(threadTs =>
            client.conversations.replies({ channel: channelId, ts: threadTs })
                .then(response => response.ok ? response.messages.slice(1) : []) // Remove first msg (duplicate of parent)
                .catch(error => {
                    console.error(`Error fetching replies for thread ${threadTs}:`, error);
                    return [];
                })
        );

        const threadMessages = (await Promise.all(threadRequests)).flat();
        console.log(`Fetched ${threadMessages.length} thread replies in parallel.`);
        return threadMessages;
    } catch (error) {
        console.error("Exception fetching thread replies:", error);
        return [];
    }
}
module.exports = extractThreadReplies