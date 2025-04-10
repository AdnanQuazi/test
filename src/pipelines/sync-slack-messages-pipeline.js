const { batchStoreMessages } = require("../services/batch-store-messages");
const extractMessages = require("../services/fetch-channel-messages");
const extractRepliesFromPastThreads = require("../services/fetch-replies-from-past-threads");
const { getLastSyncState, updateSyncState } = require("../services/sync-state");
const { processMessages } = require("../utils/process-messages");
const processFileMessages = require("./document-processing-pipeline");

const syncLocks = new Map(); // Stores ongoing sync states per channel
const allowedFileTypes = ["pdf", "text", "binary" , "docx" , "txt"];

const separateMessages = (messages) => {
  const textMessages = [];
  const fileMessages = [];

  messages.forEach((msg) => {
    if (msg.bot_id) return;

    if (msg.subtype && ["channel_join", "bot_message"].includes(msg.subtype))
      return;

    const hasText = msg.text && msg.text.trim().length > 0;
    const allowedFiles = msg.files
      ? msg.files.filter((file) => allowedFileTypes.includes(file.filetype))
      : [];

    if (hasText) textMessages.push(msg);

    if (allowedFiles.length > 0) {
      fileMessages.push({ ...msg, files: allowedFiles });
    }
  });

  return { textMessages, fileMessages };
};

async function syncSlackMessages(client, channel_id, botToken) {
  if (syncLocks.get(channel_id)) {
    console.log(`Sync already in progress for channel ${channel_id}. Skipping...`);
    return;
  }

  syncLocks.set(channel_id, true); // Lock the specific channel

  try {
    const syncData = await fetchAndProcessData(client, channel_id, botToken);
    if (!syncData) {
      return; // No new messages, early return
    }

    await storeAndFinalize(syncData, channel_id);
    console.log(`Sync complete for channel ${channel_id}!`);
  } catch (error) {
    console.error(`Error syncing Slack messages for channel ${channel_id}:`, error);
  } finally {
    syncLocks.delete(channel_id); // Unlock the channel after execution
  }
}

async function fetchAndProcessData(client, channel_id, botToken) {
  console.log(`Retrieving last sync state for channel ${channel_id}...`);
  const lastSyncData = await getLastSyncState(channel_id);

  console.log(`Fetching replies and main messages for channel ${channel_id}...`);
  const [repliesData, mainMessagesData] = await Promise.all([
    extractRepliesFromPastThreads(client, channel_id, lastSyncData),
    extractMessages(channel_id, 500, lastSyncData.lastMainTS, client),
  ]);

  const { updatedThreadTSData, allNewReplies } = repliesData;
  const { allMessages, newThreads } = mainMessagesData;

  console.log(`Filtering messages...`);
  const { textMessages: mainTextMessages, fileMessages: mainFileMessages } = separateMessages(allMessages);
  const { textMessages: replyTextMessages, fileMessages: replyFileMessages } = separateMessages(allNewReplies || []);

  const allTextMessages = [...mainTextMessages, ...replyTextMessages];
  const allFileMessages = [...mainFileMessages, ...replyFileMessages];

  console.log(`Main Messages: ${mainTextMessages.length} text, ${mainFileMessages.length} files`);
  console.log(`Reply Messages: ${replyTextMessages.length} text, ${replyFileMessages.length} files`);

  if (allTextMessages.length === 0 && allFileMessages.length === 0) {
    console.log(`No new messages or files found for channel ${channel_id}. Skipping processing.`);
    return null; // Signal no new data
  }

  const processedData = await processTextAndFiles(allTextMessages, allFileMessages, channel_id, botToken);
  return { ...processedData, updatedThreadTSData, newThreads, allMessages, lastSyncData };
}

async function processTextAndFiles(allTextMessages, allFileMessages, channel_id, botToken) {
  const promises = [];
  if (allTextMessages.length > 0) {
    console.log(`Processing text messages for channel ${channel_id}...`);
    promises.push(processMessages(allTextMessages, channel_id));
  }

  if (allFileMessages.length > 0) {
    console.log(`Processing file messages for channel ${channel_id}...`);
    promises.push(processFileMessages(allFileMessages, botToken, channel_id));
  }

  const results = await Promise.all(promises);

  const processedTextMessages = results.find((result) => Array.isArray(result) && result[0] && result[0].text) || [];
  const processedFileMessages = results.find((result) => Array.isArray(result) && result[0] && result[0].file_id) || [];

  return { processedTextMessages, processedFileMessages };
}

async function storeAndFinalize(syncData, channel_id) {
  const { processedTextMessages, processedFileMessages, updatedThreadTSData, newThreads, allMessages, lastSyncData } = syncData;

  if (processedTextMessages.length > 0) {
    console.log(`Storing messages in Supabase for channel ${channel_id}...`);
    await batchStoreMessages(processedTextMessages);
    console.log({processedTextMessages})
  }

  if (processedFileMessages.length > 0) {
      console.log(processedFileMessages);
  }

  console.log(`Updating last processed timestamps for channel ${channel_id}...`);
  const latestMainTS = allMessages.length > 0 ? allMessages[0].ts : lastSyncData.lastMainTS;
  await updateSyncState(channel_id, latestMainTS, { ...updatedThreadTSData, ...newThreads });
}

module.exports = syncSlackMessages