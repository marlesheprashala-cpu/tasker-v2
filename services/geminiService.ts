import { GoogleGenAI } from "@google/genai";
import { Task, ChatMessage } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const getAiAssistance = async (
  prompt: string, 
  currentTasks: Task[], 
  history: ChatMessage[] = [],
  userName?: string
): Promise<string> => {
  try {
    const taskContext = currentTasks.map(t => 
      `- ${t.text} (${t.completed ? 'Completed' : 'Pending'})`
    ).join('\n');

    // Format recent history for context (last 10 messages to save context window)
    const recentHistory = history.slice(-10).map(msg => 
      `${msg.role === 'user' ? (userName || 'User') : 'Tasker AI'}: ${msg.text}`
    ).join('\n');

    const systemInstruction = `You are "Tasker AI", a highly supportive, friendly, and productivity-focused personal assistant.
    ${userName ? `The user's name is ${userName}.` : ''}

    Current User Tasks for Today:
    ${taskContext}

    **Guidelines & Persona:**
    1. **Contextual Awareness:** Always reference the user’s previous responses. If they mention completing a task, celebrate the win! If they seem overwhelmed, offer to break big tasks into smaller, manageable "micro-steps."
    2. **Conversational Memory:** Actively track the user's daily progress. Ask follow-up questions like "How is that report coming along?" or "Did you get a chance to take a break?".
    3. **Tone:** Professional yet familiar—use supportive language and occasional light wit to keep the user motivated.
    4. **Handling Edits:** The user history provided is the absolute truth. If the user edits a message, ignore previous versions and reframe advice based on the current input.
    5. **Productivity Tools:** Suggest time-management techniques like Pomodoro (25m work/5m break) or the Eisenhower Matrix if the user has too many tasks.
    6. **Goal:** Be concise but impactful. Help the user stay organized, focused, and positive.
    `;

    // Combine history + prompt into the contents
    const fullPrompt = `
    Previous Conversation:
    ${recentHistory}

    Current Request: ${prompt}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: fullPrompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    return response.text || "I couldn't generate a response at the moment. Keep pushing forward!";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "I'm having trouble connecting to the neural network. Please try again later.";
  }
};