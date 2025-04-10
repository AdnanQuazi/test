function structureMessages(messages) {
    const threads = {}; // Group replies by their thread_ts
    const mainMessages = []; // Standalone messages or thread parent messages
  
    messages.forEach((msg) => {
  
  
      const {
        source = "slack_messages",
        ts,
        text,
        thread_ts,
        permalink = null,
        file_name = null,
      } = msg;
      // If thread_ts exists and is different from ts, it's a reply
      if (thread_ts && thread_ts !== ts) {
        if (!threads[thread_ts]) {
          threads[thread_ts] = [];
        }
        threads[thread_ts].push({ ts, text });
      } else {
        // Otherwise, it's a standalone message or the thread's parent message
        mainMessages.push({
          source,
          ts,
          text,
          thread_ts: thread_ts || null,
          permalink,
          file_name
        });
      }
    });
  
    // Sort main messages by timestamp (ascending)
    mainMessages.sort((a, b) => parseFloat(a.ts) - parseFloat(b.ts));
  
    // Attach any replies to their respective parent message based on ts
    mainMessages.forEach((msg) => {
      if (threads[msg.ts]) {
        threads[msg.ts].sort((a, b) => parseFloat(a.ts) - parseFloat(b.ts));
        msg.thread = threads[msg.ts];
      }
    });
  
    return mainMessages;
  }

module.exports = structureMessages