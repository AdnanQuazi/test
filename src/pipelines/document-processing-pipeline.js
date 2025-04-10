
const path = require("path");
const axios = require("axios");
const mammoth = require("mammoth");
const supabase = require("../config/supabase");
const pLimit = require("p-limit").default;
const pdfParse = require("pdf-parse");
const getEmbedding = require("../services/embedding-service");
// Set a concurrency limit for processing files (adjust as needed)
const fileProcessingLimit = pLimit(5); // Example: 5 concurrent tasks

/**
 * Downloads a file from Slack using the provided URL and token.
 */
async function downloadFile(fileUrl, token) {
  try {
    console.log("Downloading file from:", fileUrl);
    const response = await axios.get(fileUrl, {
      responseType: "arraybuffer",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Download error:", error);
    console.error("File URL:", fileUrl);
    throw error;
  }
}

/**
 * Process a PDF file buffer and extract its text.
 */
async function processPDF(fileBuffer) {
  try {
    const pdfData = await pdfParse(fileBuffer);
    return pdfData.text;
  } catch (e) {
    console.error("Error parsing PDF:", e);
    return ""; // Return empty string on failure, continue processing
  }
}

/**
 * Process a DOCX file buffer and extract its text using Mammoth.
 */
async function processDocx(fileBuffer) {
  try {
    const result = await mammoth.extractRawText({ buffer: fileBuffer });
    return result.value;
  } catch (e) {
    console.error("Error parsing DOCX:", e);
    return ""; // Return empty string on failure, continue processing
  }
}

/**
 * Process a plain text file buffer.
 */
async function processText(fileBuffer) {
  return fileBuffer.toString("utf8");
}

/**
 * Processes a file buffer based on its extension.
 */
async function processDocument(fileBuffer, ext) {
  if (ext === ".pdf") {
    return processPDF(fileBuffer);
  } else if (ext === ".docx") {
    return processDocx(fileBuffer);
  } else if (ext === ".txt") {
    return processText(fileBuffer);
  } else {
    console.error(`Unsupported file type: ${ext}`);
    return ""; // Return empty string on failure, continue processing
  }
}

/**
 * Chunks text into smaller pieces without breaking words.
 */
function chunkText(text, maxLength = 1000) {
  const chunks = [];
  let currentChunk = "";
  text.split(/\s+/).forEach((word) => {
    if (currentChunk.length + word.length + 1 > maxLength) {
      chunks.push(currentChunk.trim());
      currentChunk = word + " ";
    } else {
      currentChunk += word + " ";
    }
  });
  if (currentChunk) chunks.push(currentChunk.trim());
  return chunks;
}

/**
 * Stores document metadata in the 'documents' table.
 */
async function storeDocumentMetadata(metadata) {
  try {
    const { data, error } = await supabase.from("documents").insert([metadata]);
    if (error) throw new Error(`Error storing document metadata: ${error.message}`);
    return data;
  } catch (error) {
    console.error("Error storing document metadata:", error);
    return null; // Return null on failure, continue processing
  }
}

/**
 * Stores multiple document chunks in the 'document_chunks' table in a batch.
 */
async function storeDocumentChunks(chunksData) {
  try {
    const { data, error } = await supabase.from("document_chunks").insert(chunksData);
    if (error) throw new Error(`Error storing document chunks: ${error.message}`);
    return data;
  } catch (error) {
    console.error("Error storing document chunks:", error);
    return null; // Return null on failure, continue processing
  }
}

/**
 * Processes a single file from Slack:
 * 1. Downloads the file.
 * 2. Extracts text.
 * 3. Chunks text.
 * 4. Computes embeddings for each chunk concurrently.
 * 5. Stores document metadata and chunks in the database.
 */
async function processSingleFile(file, message, slackToken) {
  try {
    const ext = path.extname(file.name).toLowerCase();
    const fileUrl = file.url_private_download;

    // 1. Download file data
    const fileBuffer = await downloadFile(fileUrl, slackToken);
    console.log(`Downloaded file ${file.id} of size: ${fileBuffer.length}`);

    // 2. Extract text from the file
    const text = await processDocument(fileBuffer, ext);

    // 3. Chunk the extracted text
    const chunks = chunkText(text, 1000);

    // 4. Prepare document metadata (merging file info with message context)
    const documentMetadata = {
      file_id: file.id,
      created: file.created,
      ts: message.ts,
      channel_id: message.channel_id || null,
      thread_ts: message.thread_ts || null,
      name: file.name,
      title: file.title,
      mimetype: file.mimetype,
      filetype: file.filetype,
      pretty_type: file.pretty_type,
      user_id: file.user,
      user_team: file.user_team,
      size: file.size,
      url_private_download: fileUrl,
      converted_pdf: file.converted_pdf,
      thumb_pdf: file.thumb_pdf,
      permalink: file.permalink,
      permalink_public: file.permalink_public,
      file_access: file.file_access,
      created_at: new Date().toISOString(),
    };

    // 5. Store document metadata
    await storeDocumentMetadata(documentMetadata);

    // 6. Compute embeddings for each chunk concurrently
    const embeddingPromises = chunks.map((chunk) => getEmbedding(chunk));
    const embeddings = await Promise.all(embeddingPromises);

    // 7. Prepare and batch store each chunk in the DB
    const chunksData = chunks.map((chunk, index) => ({
      file_id: documentMetadata.file_id,
      chunk_index: index,
      text: chunk,
      embedding: Object.values(embeddings[index]),
      created_at: new Date().toISOString(),
    }));

    await storeDocumentChunks(chunksData);

    return { file_id: documentMetadata.file_id, chunkCount: chunks.length };
  } catch (error) {
    console.error(`Error processing file ${file.id}:`, error);
    return null; // Return null on failure, continue processing
  }
}

/**
 * Main pipeline: Processes an array of Slack file messages concurrently.
 */
async function processFileMessages(fileMessages, slackToken, channel_id) {
  const results = await Promise.all(
    fileMessages.map(async (message) => {
      const fileResults = await Promise.all(
        (message.files || []).map((file) =>
          fileProcessingLimit(() => processSingleFile(file, { ...message, channel_id }, slackToken))
        )
      );
      return fileResults.filter(result => result !== null); // Filter out null results (failures)
    })
  );
  return results.flat();
}

module.exports = processFileMessages;