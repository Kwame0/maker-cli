import { GoogleGenerativeAI } from "@google/generative-ai";
import { CONFIG } from "./config.js";

const genAI = new GoogleGenerativeAI(CONFIG.API_KEY);
const model = genAI.getGenerativeModel({ model: CONFIG.MODEL_NAME });

/**
 * Decomposes a high-level user prompt into a sequence of atomic steps.
 * @param {string} userPrompt - The user's request.
 * @returns {Promise<string[]>} - An array of instruction strings.
 */
export async function decomposeTask(userPrompt) {
    const prompt = `
    You are an expert planner.
    Task: Break down the following user request into a linear sequence of atomic, logical steps that a stateless agent can execute one by one.
    
    User Request: "${userPrompt}"
    
    Rules:
    1. Return ONLY a valid JSON array of strings.
    2. Each string must be a clear, self-contained instruction.
    3. Do not include markdown formatting.
    4. Example: ["Initialize variable x to 0", "Add 5 to x", "Multiply x by 2"]
    `;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();
        const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();

        return JSON.parse(cleanText);
    } catch (error) {
        throw new Error("Failed to decompose task: " + error.message);
    }
}
