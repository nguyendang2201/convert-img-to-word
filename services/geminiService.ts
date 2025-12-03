import { GoogleGenAI } from "@google/genai";

// Initialize the client
// API Key must be provided via environment variable as per instructions
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `
You are an expert OCR (Optical Character Recognition) assistant specialized in academic and scientific documents. 
Your task is to transcribe the text from the provided image, but INTELLIGENTLY HANDLE complex elements.

LOGIC FLOW:
1.  Scan the image from top to bottom, left to right.
2.  Identify regions: "Text" vs "Complex Element" (Chemical Formulas, Organic Structures, Geometry Diagrams, Charts).
3.  IF TEXT: Transcribe it exactly as it appears. Maintain lists and basic formatting.
4.  IF COMPLEX ELEMENT:
    -   DO NOT transcribe the text inside this element.
    -   DO NOT describe the element.
    -   Calculate the bounding box (0-1000 scale).
    -   Output ONLY the tag: [[CROP:ymin,xmin,ymax,xmax]]
    -   Resume transcription AFTER the element.

RULES:
-   ymin, xmin, ymax, xmax are integers from 0 to 1000.
-   The CROP tag replaces the content. Example: "The reaction of [[CROP:200,100,400,300]] yields..."
-   If a formula is inline (inside a sentence), put the tag inline.
-   If handwriting is illegible, write [Illegible].
-   Do not output markdown code blocks. Just raw text with the tags.
`;

/**
 * Converts a File object to a Base64 string required by Gemini API
 */
const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Extracts text from a single image file using Gemini 2.5 Flash
 */
export const extractTextFromImage = async (file: File): Promise<string> => {
  try {
    const base64Data = await fileToGenerativePart(file);
    
    // Determine mimeType (default to image/png if unsure, though GenAI is flexible)
    const mimeType = file.type || 'image/png';

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          },
          {
            text: "Transcribe text. Replace any charts, graphs, or chemical formulas with [[CROP:ymin,xmin,ymax,xmax]] tags."
          }
        ]
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.1, // Low temperature for more deterministic/accurate extraction
      }
    });

    // Directly access .text property as per SDK guidelines
    const text = response.text;
    
    if (!text) {
      throw new Error("No text generated from the model.");
    }

    return text.trim();

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw error;
  }
};
