require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const intentPlanPrompt = require("../../prompts/plan-prompt");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function sendToGemini(query){
    try {
        const prompt = intentPlanPrompt(query)
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (error) {
        console.error("Error generating response:", error);
        return "Sorry, I couldn't process that request.";
    }

}

module.exports = sendToGemini