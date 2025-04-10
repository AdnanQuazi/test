const extractAndParseJson = require("../utils/json-parser");
const {
  analyze_documents,
  summarize_conversation,
  hybrid_search,
} = require("./search-pipeline-functions");
const sendToGemini = require("../services/gemini-planner");
const getEmbedding = require("../services/embedding-service");

const PLANS = {
  summarize_conversation: {
    execute: summarize_conversation,
  },
  analyze_documents: {
    execute: analyze_documents,
  },
  hybrid_search: {
    execute: hybrid_search,
  },
};

function convertAndSwapTimestamps(args) {
  let { startTs, endTs } = args;

  // Convert ISO to Unix (seconds) if present, else leave as null.
  const convertToUnix = (iso) => (iso ? new Date(iso).getTime() / 1000 : null);

  const startUnix = convertToUnix(startTs);
  const endUnix = convertToUnix(endTs);

  // Swap the converted values.
  return {
    startTs: endUnix,
    endTs: startUnix,
  };
}

async function parseQuery({ query, channelId }) {
  const parsedQuery = await extractAndParseJson(await sendToGemini(query));

  if (parsedQuery.arguments && parsedQuery.arguments.startTs) {
    // Convert and swap the timestamps.
    const swappedTimestamps = convertAndSwapTimestamps({
      startTs: parsedQuery.arguments.startTs,
      endTs: parsedQuery.arguments.endTs,
    });

    // Merge the swapped timestamps back into the response arguments.
    parsedQuery.arguments = { ...parsedQuery.arguments, ...swappedTimestamps };
  }

  let queryEmbedding;
  if (parsedQuery.function_name == "hybrid_search") {
    try {
      queryEmbedding = await getEmbedding(parsedQuery.broadened_query);
      queryEmbedding = Array.isArray(queryEmbedding)
        ? queryEmbedding
        : Object.values(queryEmbedding);
    } catch (err) {
      console.error("Error generating query embedding:", err);
      return "Sorry, I couldn't process your query at this time.";
    }
  }
  console.log(parsedQuery)
  return PLANS[parsedQuery.function_name].execute({
    ...parsedQuery.arguments,
    channelId,
    queryEmbedding,
  });
}

module.exports = parseQuery;
