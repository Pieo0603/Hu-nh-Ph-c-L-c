import { GoogleGenAI } from "@google/genai";

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