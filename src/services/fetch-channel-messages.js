const extractThreadReplies = require("./fetch-thread-replies");

function removeDuplicates(messages) {
  const uniqueMessages = new Map();
  for (const msg of messages) {
    uniqueMessages.set(msg.ts, msg); // Overwrites duplicate ts values
  }
  return Array.from(uniqueMessages.values()); // Convert back to array
}

async function extractMessages(channelId, limit = 500, oldest = 0, client) {
  let allMessages = [];
  let cursor;

  try {
    do {
      const params = { channel: channelId, limit, cursor };
      if (oldest && oldest !== "0") params.oldest = oldest;

      const response = await client.conversations.history(params);
      if (response.ok) {
        allMessages = allMessages.concat(response.messages);
        cursor = response.response_metadata?.next_cursor || null;
      } else {
        console.error("Error retrieving chat history:", response.error);
        break;
      }
    } while (cursor);

    console.log(
      `Fetched ${allMessages.length} messages for channel ${channelId}.`
    );

    // If no new messages, terminate program
    if (allMessages.length === 0) {
      console.log("No new messages found. Skipping further processing.");
      return { allMessages: [], newThreads: {} }; // Return empty values, don't terminate
    }

    // Fetch thread replies for messages that have thread_ts
    const threadMessages = await extractThreadReplies(
      allMessages,
      client,
      channelId
    );

    // Combine main messages and thread messages
    allMessages = removeDuplicates(allMessages.concat(threadMessages));
 
    const newThreads = Object.fromEntries(
      allMessages
        .filter((msg) => msg.thread_ts)
        .map((msg) => [msg.thread_ts, msg.ts]) // Store thread_ts -> latest message ts
    );

    return { allMessages, newThreads };
  } catch (error) {
    console.error("Exception while extracting chat history:", error);
    throw error;
  }
}

module.exports = extractMessages;
