
async function extractRepliesFromPastThreads(client, channelId , thread_history) {
    console.log("Fetching last stored thread timestamps...");

    const threadTSData = thread_history?.threadTSData || {};
    console.log(`Checking ${Object.keys(threadTSData).length} active threads...`);

    let allNewReplies = [];
    let updatedThreadTSData = { ...threadTSData };
    // Fetch new replies and check thread activity in parallel
    const threadPromises = Object.entries(threadTSData).map(async ([threadTs, lastReplyTs]) => {
        let allReplies = [];
        let cursor;
        let isInactive = false;

        do {
            const params = {
                channel: channelId,
                ts: threadTs,
                oldest: lastReplyTs,
                cursor: cursor,
            };

            const response = await client.conversations.replies(params);

            if (response.ok) {
                const newReplies = response.messages.filter((msg) => msg.ts > lastReplyTs && msg.subtype !== "thread_broadcast");
                allReplies = allReplies.concat(newReplies);
                cursor = response.response_metadata?.next_cursor || null;

                // Get the main thread message
                const mainThreadMessage = response.messages[0];

                // Check if the thread is inactive
                const hasNewReplies = newReplies.length > 0;
                const replyCountUnchanged = mainThreadMessage.reply_count === (Object.keys(threadTSData).length || 0);
                const isLocked = mainThreadMessage.is_locked || false; // If Slack provides this

                if (!hasNewReplies && replyCountUnchanged) {
                    isInactive = true;
                }
            } else {
                console.error(`Error retrieving replies for thread ${threadTs}:`, response.error);
                break;
            }
        } while (cursor);

        // Remove inactive threads from sync state
        if (isInactive) {
            console.log(`Thread ${threadTs} is inactive. Removing from sync.`);
            delete updatedThreadTSData[threadTs];
        } else if (allReplies.length > 0) {
            updatedThreadTSData[threadTs] = allReplies[allReplies.length - 1].ts;

            allNewReplies = allNewReplies.concat(allReplies);
        }
        return { threadTs, replies: allReplies };
    });

    await Promise.all(threadPromises);

    console.log(`Fetched ${allNewReplies.length} new replies.`);
    return { updatedThreadTSData, allNewReplies };
}

module.exports = extractRepliesFromPastThreads