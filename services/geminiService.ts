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
    image?: string; // Base64 string for image
}

export const getChatResponse = async (history: ChatMessage[], newMessage: string, image?: string): Promise<string> => {
    // Kiểm tra sơ bộ
    if (!process.env.API_KEY) {
        return "⚠️ Lỗi: Chưa cấu hình API Key. Vui lòng tạo file .env và thêm VITE_API_KEY=...";
    }

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        // Format history
        const formattedHistory = history.map(msg => ({
            role: msg.role,
            parts: [{ text: msg.text }]
        }));

        const chat = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction: "Bạn là trợ lý học tập AI dành cho học sinh THPT Quốc Gia (Gen Z). \n\nQUY TẮC QUAN TRỌNG VỀ TOÁN HỌC:\n1. Khi viết công thức toán, BẮT BUỘC dùng định dạng LaTeX.\n2. Công thức cùng dòng (inline) kẹp giữa dấu $: Ví dụ $x^2 + 1 = 0$\n3. Công thức riêng dòng (block) kẹp giữa dấu $$: Ví dụ $$ \\int_{0}^{1} x dx $$\n4. Trình bày lời giải từng bước rõ ràng, dùng bullet point hoặc số thứ tự.\n5. Giọng điệu thân thiện, hài hước, động viên.\n6. Nếu có hình ảnh bài tập, hãy giải chi tiết.",
            },
            history: formattedHistory
        });

        let messageParam: any = newMessage;

        // If there is an image, construct a multipart message
        if (image) {
            // Remove 'data:image/jpeg;base64,' prefix if present to get raw base64
            const base64Data = image.includes(',') ? image.split(',')[1] : image;
            
            messageParam = [
                { text: newMessage || "Giải giúp mình bài này với!" },
                { inlineData: { mimeType: 'image/jpeg', data: base64Data } }
            ];
        }

        const result = await chat.sendMessage({ message: messageParam });
        return result.text || "Hmm, câu này khó nha, mình chưa nghĩ ra. Bạn hỏi lại thử xem?";
    } catch (error: any) {
        console.error("Chat Error:", error);
        
        // Phân loại lỗi để báo cho người dùng dễ hiểu hơn
        const msg = error.toString();

        if (msg.includes('400') || msg.includes('API key')) {
             return "⚠️ **Lỗi API Key**: Key hiện tại không hợp lệ hoặc đã hết hạn.\n\n👉 **Cách sửa**: \n1. Vào `aistudio.google.com` lấy key mới.\n2. Tạo file `.env` ở thư mục gốc.\n3. Thêm dòng: `VITE_API_KEY=KEY_CUA_BAN`.\n4. Chạy lại dự án.";
        }

        if (msg.includes('429') || msg.includes('Quota')) {
            return "⚠️ **Hết lượt dùng**: API Key này đã dùng quá giới hạn hôm nay. Hãy thử lại mai hoặc đổi Key mới nhé.";
       }
        
        return "Mạng lag hoặc lỗi hệ thống rồi. Bạn thử lại sau chút xíu nha! 😵‍💫";
    }
};