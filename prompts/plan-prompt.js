const functionList = {
  analyze_documents: {
    description:
      "Analyzes the provided documents within an optional time range.",
    parameters: {
      fileNames: "array", // Required: array of file names
      startTs: "string (optional)", // Optional: Unix timestamp in float
      endTs: "string (optional)", // Optional: Unix timestamp in float
    },
    implementation: async (args) => {
      const { fileNames, startTs = null, endTs = null } = args;
      // Replace with actual document analysis logic
      return `Analyzed documents: ${fileNames.join(", ")}${
        startTs ? ` from ${startTs}` : ""
      }${endTs ? ` to ${endTs}` : ""}.`;
    },
  },
  summarize_conversation: {
    description:
      "Summarizes a conversation within the given time range, with an option to include related documents.",
    parameters: {
      includeDocs: "boolean (default: false)", // Optional: whether to include related docs
      startTs: "string (optional)", // Optional: Unix timestamp in float
      endTs: "string (optional)", // Optional: Unix timestamp in float
    },
    implementation: async (args) => {
      const { includeDocs = false, startTs = null, endTs = null } = args;
      // Replace with actual summarization logic
      return `Summarized conversation${includeDocs ? " with documents" : ""}${
        startTs ? ` from ${startTs}` : ""
      }${endTs ? ` to ${endTs}` : ""}.`;
    },
  },
  hybrid_search: {
    description:
      "Performs a broad search using the query across chats and documents within the specified time range.",
    parameters: {
      broadedQuery: "string", // Required: search query
      startTs: "string (optional)", // Optional: Unix timestamp in float
      endTs: "string (optional)", // Optional: Unix timestamp in float
    },
    implementation: async (args) => {
      const { broadedQuery, startTs = null, endTs = null } = args;
      // Replace with actual search logic
      return `Searched for "${broadedQuery}"${
        startTs ? ` from ${startTs}` : ""
      }${endTs ? ` to ${endTs}` : ""}.`;
    },
  },
};

const getCurrentDate = () => {
  const now = new Date();
  const isoDate = now.toISOString();
  return isoDate;
};
// console.log(getCurrentDate())

module.exports = (query, functions = functionList) => {
  // Convert functionList array to a string representation
  const functionDescriptions = Object.entries(functionList)
    .map(([name, func]) => {
      const params = Object.entries(func.parameters)
        .map(([param, type]) => `${param}: ${type}`)
        .join(", ");
      return `${name}(${params}): ${func.description}`;
    })
    .join("\n");

  return `
  You are an intelligent planner for a Slack AI assistant.

  Input Query: "${query}"
  
  You have the following available functions to handle document analysis tasks:
  ${functionDescriptions}
  
  Your tasks:
  1. You are a grammar assistant. Only correct grammar and common spelling errors. 
Do NOT modify names, brand terms, technical jargon, or potentially intentional words that are not found in standard dictionaries.
Keep proper nouns and niche terms as-is.
  2. Broaden the query if necessary.
  3. Determine the function call needed to answer the query.
  4. For function call, output an object with the function name and a list of required argument names.
  5. If the query involves a specific document, include the file name as one of the arguments where appropriate.
  6. If query involves a time range , consider using it based on today's date which is ${getCurrentDate()}.
  7. Use null in startTs and endTs if time range is not required  
  8. If it needs summarization on specific topics in messages then prefer using normal_search
  9. If it comes under normal_search then broaden the query for vector and keyword search
  Return ONLY a JSON object with the following keys:
  {
    "corrected_query": "The corrected query string",
    "broadened_query": "The broadened query string",
    "function_name": "...", "arguments": {...}
  }
  `;
};
