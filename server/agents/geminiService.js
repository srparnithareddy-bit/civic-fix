const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const apiKey = process.env.GEMINI_API_KEY || '';
let genAI = null;
let model = null;

if (apiKey && apiKey !== 'your_gemini_api_key_here') {
  try {
    genAI = new GoogleGenerativeAI(apiKey);
    // Use gemini-1.5-flash or gemini-2.0-flash
    model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    console.log('✅ Gemini AI service connected successfully.');
  } catch (err) {
    console.warn('⚠️ Gemini initialization error:', err.message);
  }
} else {
  console.log('ℹ️ GEMINI_API_KEY not configured. Autonomous deterministic AI fallback engine active.');
}

// Clean JSON response from Gemini Markdown output (e.g. ```json ... ```)
function extractJson(text) {
  try {
    const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('Error parsing JSON from AI output:', text);
    throw new Error('AI returned non-JSON response');
  }
}

async function callGemini(prompt) {
  if (model) {
    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (err) {
      console.warn('Gemini API call failed, invoking deterministic heuristic reasoning:', err.message);
      return null;
    }
  }
  return null;
}

module.exports = {
  callGemini,
  extractJson
};
