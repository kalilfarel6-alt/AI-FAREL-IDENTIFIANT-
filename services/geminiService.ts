import { GoogleGenAI, Type, Schema } from "@google/genai";
import { PipingComponent, WebResource } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const pipingSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    type: { type: Type.STRING, description: "Type de matériel (ex: Vanne papillon, Coude 90°, Bride)" },
    dn: { type: Type.STRING, description: "Diamètre Nominal estimé (ex: 50, 100), juste le chiffre." },
    pn: { type: Type.STRING, description: "Pression Nominale estimée (ex: 16, 40), juste le chiffre." },
    material: { type: Type.STRING, description: "Matériau principal (ex: Acier Inox 316L, Fonte)" },
    connection: { type: Type.STRING, description: "Type de raccordement (ex: À brides, Soudé)" },
    brands: { type: Type.STRING, description: "Marque probable ou 'Inconnue'" },
    standards: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "Liste des normes probables (ex: ISO, DIN, ANSI)" 
    },
    description: { type: Type.STRING, description: "Description technique détaillée de la pièce et de sa fonction." },
    maintenance_instructions: { type: Type.STRING, description: "Consignes de maintenance préventive et de réparation courante (ex: graissage, joints, serrage)." },
    confidence: { type: Type.NUMBER, description: "Confiance de 0 à 100" }
  },
  required: ["type", "material", "brands", "standards", "description", "maintenance_instructions"],
};

export const identifyPipingComponent = async (base64Image: string): Promise<PipingComponent> => {
  try {
    // Remove header if present (data:image/jpeg;base64,)
    const cleanBase64 = base64Image.split(',')[1] || base64Image;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: cleanBase64
            }
          },
          {
            text: "Identifie cet équipement de tuyauterie industrielle. Sois précis sur le type, le DN, le PN et les normes. Fournis une description technique et des consignes de maintenance/réparation. Réponds en français."
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: pipingSchema,
        temperature: 0.4
      }
    });

    const text = response.text;
    if (!text) throw new Error("Réponse vide de l'IA");

    return JSON.parse(text) as PipingComponent;
  } catch (error) {
    console.error("Gemini Vision Error:", error);
    throw new Error("Impossible d'identifier l'équipement. Vérifiez votre connexion ou la clarté de l'image.");
  }
};

export const searchManufacturersResources = async (query: string): Promise<WebResource[]> => {
  if (!query || query.length < 3) return [];

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Trouve les derniers catalogues PDF, fiches techniques et le site officiel pour : "${query}" dans le domaine de la tuyauterie industrielle.`,
      config: {
        tools: [{ googleSearch: {} }],
        // Note: responseSchema is NOT supported with googleSearch
      },
    });

    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const resources: WebResource[] = [];

    if (chunks) {
      chunks.forEach((chunk: any) => {
        if (chunk.web?.uri && chunk.web?.title) {
          resources.push({
            title: chunk.web.title,
            uri: chunk.web.uri,
            source: new URL(chunk.web.uri).hostname.replace('www.', '')
          });
        }
      });
    }

    // Deduplicate by URI
    return Array.from(new Map(resources.map(item => [item.uri, item])).values());

  } catch (error) {
    console.warn("Google Search Grounding Error:", error);
    return [];
  }
};