import { GoogleGenAI } from "@google/genai";

// Shared instance logic if needed, but safe to instantiate per call for simple serverless-like usage
// In a real app, you might want to manage the instance better.

export const generateWish = async (): Promise<string> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        return "Lỗi: Thiếu API Key.";
    }

    // Initialize Gemini client with API key from environment variable directly
    const ai = new GoogleGenAI({ apiKey: apiKey });
    
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
    const apiKey = process.env.API_KEY;
    
    if (!apiKey) {
        return "⚠️ Lỗi hệ thống: Không tìm thấy API Key. Vui lòng kiểm tra cấu hình.";
    }

    try {
        const ai = new GoogleGenAI({ apiKey });
        
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
    } catch (error: any) {
        console.error("Chat Error:", error);
        
        if (error.message?.includes('400') || error.message?.includes('API key')) {
             return "⚠️ Lỗi API Key: Key có vẻ không hợp lệ hoặc đã hết hạn mức sử dụng (Quota exceeded).";
        }
        
        return "Mạng lag quá rùi. Bạn kiểm tra lại wifi xem sao nha!";
    }
};