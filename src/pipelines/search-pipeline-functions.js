const supabase = require("../config/supabase");
const structureMessages = require("../utils/structure-messages");
const hybridSearch = require("./hybrid-search-pipeline");

function isWithinLast15Days(tsInput) {
  const FIFTEEN_DAYS_IN_SECONDS = 15 * 24 * 60 * 60;
  const now = Math.floor(Date.now() / 1000); // current time in seconds
  const fifteenDaysAgo = now - FIFTEEN_DAYS_IN_SECONDS;

  let ts;

  if (typeof tsInput === "string") {
    ts = Math.floor(new Date(tsInput).getTime() / 1000);
  } else if (typeof tsInput === "number") {
    ts = tsInput;
  } else {
    throw new Error(
      "Invalid timestamp format. Provide ISO string or Unix number."
    );
  }

  const isValid = ts >= fifteenDaysAgo && ts <= now;

  return {
    isValid,
    inputUnix: ts,
    fifteenDaysAgoUnix: fifteenDaysAgo,
    nowUnix: now,
  };
}

async function analyze_documents({
  fileNames,
  channelId,
  startTs = null,
  endTs = null,
}) {
  try {
    let note = null;
    if (fileNames.length > 2) {
      fileNames = fileNames.slice(0, 2);
      note = "Cannot exceed more than 2 files at once";
    }
    // Start building the query
    let query = supabase
      .from("documents")
      .select(
        `
        permalink,
        name,
        channel_id,
        user_id,
        document_chunks (
          text,
          chunk_index,
          created_at
        )
      `
      )
      .in("name", fileNames) // Filter by the array of file names
      .eq("channel_id", channelId); // Filter by channel_id

    // If timestamps are provided, filter by created_at range
    // Note: We assume the documents' created_at is the date you want to filter on.
    if (startTs !== null) {
      // Convert the Unix timestamp (seconds) to ISO string
      query = query.lte("ts", startTs);
    }
    if (endTs !== null) {
      query = query.gte("ts", endTs);
    }

    // Execute the query
    const { data, error } = await query;

    if (error) {
      console.error("Error fetching documents:", error);
      throw error;
    }

    // data is an array of documents, each with a `docu_chunks` array
    return { data, note , suggestions : "Please ensure that the file name exactly matches the file as uploaded on Slack and that it is associated with the correct channel."};
  } catch (err) {
    console.error("Unexpected error in analyze_documents:", err);
    throw err;
  }
}
async function summarize_conversation({
  startTs = null,
  endTs = null,
  channelId,
  includeDocs = false,
}) {
  let note = null;
  const tsData = endTs ?? isWithinLast15Days(endTs);

  if (!tsData.isValid) {
    note = "Messages are summarized within a 15-day window.";
  }
  let query = supabase
    .from("slack_messages")
    .select("user_id , thread_ts , ts , text , type")
    .eq("channel_id", channelId)
    .order("ts", { ascending: true });
  if (startTs !== null) {
    query = query.lte("ts", startTs);
  }
  if (endTs !== null) {
    query = query.gte("ts", tsData.isValid ? endTs : tsData.fifteenDaysAgoUnix);
  }

  if (endTs == null) {
    query = query.limit(30);
  }

  const { data, error } = await query;

  if (error) throw new Error("Error fetching messages: " + error.message);

  const context = structureMessages(data);

  return { data: context, note ,suggestions : "Consider inquiring about topics discussed within this channel."};
}

async function hybrid_search({
  broadedQuery,
  queryEmbedding,
  channelId,
  startTs = null,
  endTs = null,
  windowSize = 5,
}) {

  const data = await hybridSearch(broadedQuery,queryEmbedding,channelId,startTs,endTs,windowSize)
  return {data,note : null,suggestions : "Consider inquiring about topics discussed within this channel."}
}
module.exports = { analyze_documents, summarize_conversation , hybrid_search};
