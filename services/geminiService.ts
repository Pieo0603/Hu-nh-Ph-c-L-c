import { GoogleGenAI } from "@google/genai";

// Shared instance logic if needed, but safe to instantiate per call for simple serverless-like usage
// In a real app, you might want to manage the instance better.

export const generateWish = async (): Promise<string> => {
  try {
    // Initialize Gemini client with API key from environment variable directly
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // We use flash for speed
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: "Viết một lời chúc ngắn gọn (dưới 30 từ), dễ thương, động viên các bạn học sinh sinh năm 2008 ôn thi THPT Quốc Gia. Có emoji.",
    });

    return response.text?.trim() || "Chúc sĩ tử 2026 vượt vũ môn thành công! 🐟🐉";
  } catch (error) {
    console.error("Error generating wish:", error);
    return "Chúc sĩ tử 2026 vượt vũ môn thành công! 🐟🐉";
  }
};

export interface ChatMessage {
    role: 'user' | 'model';
    text: string;
}

export const getChatResponse = async (history: ChatMessage[], newMessage: string): Promise<string> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        // Convert simple message format to Gemini history format
        const formattedHistory = history.map(msg => ({
            role: msg.role,
            parts: [{ text: msg.text }]
        }));

        const chat = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction: "Bạn là một trợ lý học tập AI thân thiện, hài hước và am hiểu kiến thức THPT Quốc Gia. Nhiệm vụ của bạn là giải đáp thắc mắc các môn Toán, Văn, Anh, Lý, Hóa, Sinh... và đưa ra lời khuyên, động viên tinh thần cho học sinh ôn thi. Hãy dùng emoji và giọng văn trẻ trung (Gen Z). Nếu không biết câu trả lời, hãy thành thật.",
            },
            history: formattedHistory
        });

        const result = await chat.sendMessage({ message: newMessage });
        return result.text || "Hmm, câu này khó nha, mình chưa nghĩ ra. Bạn hỏi lại thử xem?";
    } catch (error) {
        console.error("Chat Error:", error);
        return "Mạng lag quá rùi, bạn kiểm tra lại kết nối nha! (Hoặc API Key hết hạn)";
    }
};