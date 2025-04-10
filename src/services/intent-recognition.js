require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const intentRecognitionPrompt = require("../../prompts/intent-recognition-prompt");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

async function intentRecognition(query) {
  const prompt = intentRecognitionPrompt(query);

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // If you expect structured JSON:
    // return JSON.parse(text);

    return text;
  } catch (error) {
    console.error("[Gemini Understanding Error]:", error);
    throw new Error("Failed to process understanding query");
  }
}

module.exports = intentRecognition;
