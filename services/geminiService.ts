
import { GoogleGenAI } from "@google/genai";
import { ItemStats, ItemRarity } from "../types";

export interface AnalysisResult {
  data: ItemStats;
}

export const analyzeItemWithSearch = async (base64Image: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    TASK: Analyze the Path of Exile 2 item screenshot.
    
    LEAGUE DETECTION:
    1. Only return the league name if found, else leave empty.
    
    ITEM RULES:
    - For UNIQUE items: Include "name" and "type".
    - For RARE/MAGIC items: Only "type" (base type).
    
    TRADE QUERY GENERATION:
    - Return a valid PoE 2 Trade API JSON query in "tradeQuery".
    - Ensure status is {"option": "online"}.
    - DO NOT add trade_filters or sale_type here; the application handles it.
    - Use clean text for filter "id" (e.g., "to maximum life").
    - Put numeric values in "value": {"min": X}.

    JSON RESPONSE FORMAT:
    {
      "name": "Item Name",
      "rarity": "Unique|Rare|Magic|Normal",
      "baseType": "Base Type",
      "league": "",
      "explicitMods": ["text"],
      "tradeQuery": {
        "query": {
          "status": { "option": "online" },
          "type": "BaseName",
          "stats": [{"type": "and", "filters": []}]
        }
      }
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
          { text: prompt }
        ]
      },
      config: {
        temperature: 0.1,
        responseMimeType: "application/json"
      }
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from AI");

    const data = JSON.parse(text) as ItemStats;
    return { data };
  } catch (error) {
    console.error("Gemini service error:", error);
    throw error;
  }
};
