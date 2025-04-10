const { pipeline } = require("@xenova/transformers");
async function getEmbedding(text) {
  // Load the embedding model; if the package doesn't support require directly, consider using dynamic import:
  const embedder = await pipeline(
    "feature-extraction",
    "Xenova/all-MiniLM-L6-v2"
  );
  const result = await embedder(text, { pooling: "mean", normalize: true });
  return result.data; // Returns an array of numbers (embedding)
}
module.exports = getEmbedding;
