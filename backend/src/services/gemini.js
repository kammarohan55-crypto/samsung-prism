import { GoogleGenerativeAI } from '@google/generative-ai';

let genAI = null;
let chatModel = null;
let embedModel = null;

/**
 * Initialize Gemini clients.
 */
function init() {
  if (genAI) return;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set');
  genAI = new GoogleGenerativeAI(apiKey);
  chatModel = genAI.getGenerativeModel({ model: process.env.LLM_MODEL || 'gemini-2.0-flash' });
  embedModel = genAI.getGenerativeModel({ model: process.env.EMBEDDING_MODEL || 'gemini-embedding-001' });
}

/**
 * Generate a chat response using Gemini.
 * @param {string} systemPrompt - System instruction
 * @param {string} userMessage - User's message
 * @param {Array} history - Previous messages [{role, content}]
 * @returns {string} Assistant response text
 */
export async function generateResponse(systemPrompt, userMessage, history = []) {
  init();
  const model = genAI.getGenerativeModel({
    model: process.env.LLM_MODEL || 'gemini-2.0-flash',
    systemInstruction: systemPrompt,
  });

  const chatHistory = history.map(h => ({
    role: h.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: h.content }],
  }));

  const chat = model.startChat({ history: chatHistory });
  const result = await chat.sendMessage(userMessage);
  return result.response.text();
}

/**
 * Generate embeddings for text using Gemini.
 * @param {string} text - Text to embed
 * @returns {number[]} Embedding vector
 */
export async function generateEmbedding(text) {
  init();
  const result = await embedModel.embedContent(text);
  return result.embedding.values;
}

/**
 * Generate embeddings for multiple texts in batch.
 * @param {string[]} texts - Array of texts
 * @returns {number[][]} Array of embedding vectors
 */
export async function generateEmbeddings(texts) {
  init();
  const results = [];
  // Batch in groups of 5 to respect rate limits
  for (let i = 0; i < texts.length; i += 5) {
    const batch = texts.slice(i, i + 5);
    const promises = batch.map(t => generateEmbedding(t));
    const batchResults = await Promise.all(promises);
    results.push(...batchResults);
    if (i + 5 < texts.length) await new Promise(r => setTimeout(r, 200)); // rate limit buffer
  }
  return results;
}

/**
 * Classify intent using Gemini.
 * @param {string} message - User message
 * @param {string} role - User's role
 * @returns {{intent: string, confidence: number, worker: string}}
 */
export async function classifyIntent(message, role) {
  init();
  const prompt = `You are an intent classifier for an employee onboarding and team intelligence system.

Classify the following message into exactly ONE intent. Return ONLY a JSON object, no other text.

Intents:
- policy_question: Questions about company policies, benefits, leave, HR rules
- checklist_status: Questions about onboarding progress, tasks, checklists
- reminder_request: Requests to set reminders or schedule notifications
- task_creation: Requests to create action items, assign tasks
- metrics_query: Questions about team performance, velocity, metrics, dashboards
- feedback: User giving feedback about the system or prior answers
- general_question: General greetings, help requests, anything else

User role: ${role}
Message: "${message}"

Return: {"intent": "<intent_name>", "confidence": <0.0-1.0>, "worker": "<worker_name>"}

Worker mapping:
- policy_question → onboarding-rag
- checklist_status → onboarding-rag
- reminder_request → action-generator
- task_creation → action-generator
- metrics_query → metrics-analyzer
- feedback → onboarding-rag
- general_question → onboarding-rag`;

  const model = genAI.getGenerativeModel({
    model: process.env.LLM_MODEL || 'gemini-2.0-flash',
    generationConfig: { responseMimeType: 'application/json' },
  });
  const result = await model.generateContent(prompt);
  try {
    return JSON.parse(result.response.text());
  } catch {
    return { intent: 'general_question', confidence: 0.5, worker: 'onboarding-rag' };
  }
}
