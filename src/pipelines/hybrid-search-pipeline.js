const supabase = require("../config/supabase");
const structureMessages = require("../utils/structure-messages");

async function searchMessages(
  query,
  embedding,
  channelId,
  startTs = null,
  endTs = null,
  matchCount = 20,
  vector_match_count = 10,
  keyword_match_count = 10,
  match_threshold = 0.5,
  rrf_k = 60
) {
  try {
    const { data, error } = await supabase.rpc("hybrid_search", {
      query: query,
      query_embedding: embedding,
      channel_id: channelId,
      start_ts: startTs,
      end_ts: endTs,
      match_count: matchCount,
      vector_match_count,
      keyword_match_count,
      match_threshold,
      rrf_k
    });

    if (error) {
      console.error("Error calling hybrid_search:", error);
      return [];
    }
    return data;
  } catch (error) {
    console.error("An unexpected error occurred:", error);
    return [];
  }
}

async function searchDocs(
  query,
  embedding,
  channelId,
  startTs,
  endTs,
  matchCount = 5,
  match_threshold = 0.5,
  rrf_k = 60
) {
  try {
    
    const { data, error } = await supabase.rpc("search_in_document_chunks", {
      search_query_string: query,
      search_embedding: embedding,
      channel_id: channelId.trim(),
      start_ts: startTs,
      end_ts: endTs,
      match_count: matchCount,
      match_threshold,
      rrf_k
    });

    if (error) {
      console.error("Error calling search_in_document_chunks:", error);
      return [];
    }
    return data;
  } catch (error) {
    console.error("An unexpected error occurred:", error);
    return [];
  }
}
async function fetchSurroundingMessages(ts, channelId, count = 5) {
  // Wrap ts in single quotes for the condition
  const condition = `ts.lt.'${ts}',ts.gt.'${ts}'`;

  const { data, error } = await supabase
    .from("slack_messages")
    .select("ts, text, thread_ts")
    .eq("channel_id", channelId)
    .or(condition)
    .order("ts", { ascending: true }) // Order naturally (closest messages)
    .limit(count * 2); // Fetch enough for both sides

  if (error) {
    throw new Error(`Error fetching messages: ${error.message}`);
  }
  // Split messages into previous and next relative to the target ts
  // const previous = data.filter(msg => parseFloat(msg.ts) < parseFloat(ts)).slice(-count);
  // const next = data.filter(msg => parseFloat(msg.ts) > parseFloat(ts)).slice(0, count);

  return data;
}


async function fetchFullThread(threadTs, channelId) {
  const { data, error } = await supabase
    .from("slack_messages")
    .select("ts, text, thread_ts")
    .eq("channel_id", channelId)
    .eq("thread_ts", threadTs)
    .order("ts", { ascending: true });
  if (error) throw new Error(`Error fetching thread: ${error.message}`);
  return data;
}

async function hybridSearch(
  query,
  queryEmbedding,
  channelId,
  startTs = null,
  endTs = null,
  windowSize = 5
) {
  const [messages, documents] = await Promise.all([
    searchMessages(query, queryEmbedding, channelId, startTs, endTs),
    searchDocs(query, queryEmbedding, channelId, startTs, endTs),
  ]);

  const windows = [];
  for (let i = 0; i < messages.length; i += windowSize) {
    windows.push(messages.slice(i, i + windowSize));
  }

  const surroundingPromises = windows.map((msg) =>
    fetchSurroundingMessages(parseFloat(msg.ts), channelId)
  );

  // const threadPromises = messages
  //   .filter((msg) => msg.thread_ts)
  //   .map((msg) => fetchFullThread(msg.thread_ts, channelId));


  const [contextualMessages] = await Promise.all([
    Promise.all(surroundingPromises),
  ]);
 
  // const contextualMessages = [];
  // const threads = threadResults.flat();

  const allResults = [
    ...messages,
    ...documents,
    ...contextualMessages.flat(),
  ];
  const uniqueResults = Array.from(new Map(allResults.map(item => [item.ts, item])).values());
  const context = structureMessages(uniqueResults);
  return context
}

module.exports = hybridSearch