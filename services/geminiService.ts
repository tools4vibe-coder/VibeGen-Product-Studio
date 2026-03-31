
import { GoogleGenAI, Type } from "@google/genai";
import { UploadedImage, GenerationOptions, CameraMovement, GroupGenerationOptions, SceneVariation, PlacementType, ProductMaterial, ProductCategory, SceneContext, ProductAnalysis, EnvironmentType } from "../types";
import { buildVariations, PromptBuilder } from "../utils/variationEngine";
import { resizeAndPadImage } from "../utils/helpers";

const getClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini API Key not found in environment.");
  return new GoogleGenAI({ apiKey });
};

const getAspectRatioConfig = (width: number, height: number): string => {
    const ratio = width / height;
    if (ratio >= 1.7) return "16:9";
    if (ratio <= 0.6) return "9:16";
    if (ratio >= 1.3) return "4:3";
    if (ratio <= 0.8) return "3:4";
    return "1:1";
};

export const analyzeProductImage = async (
  base64Image: string
): Promise<ProductAnalysis> => {
  const ai = getClient();
  
  // Use gemini-3-flash-preview for analysis
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/png', data: base64Image.split(',')[1] } },
        { text: `You are an expert product analyst and photographer. 
          1. VISUAL INSPECTION & DECONSTRUCTION (PRIMARY): Meticulously analyze the image. Identify the MAIN PRODUCT vs ACCESSORIES vs BACKGROUND. List every distinct physical component visible (e.g., "Main Headset", "Carry Case", "Audio Cable", "Remote").
          2. SOURCE OF TRUTH: The image structure is the absolute reference for these parts.
          3. Return a detailed JSON analysis including a list of components.
          ` 
        }
      ]
    },
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING, enum: Object.values(ProductCategory) },
          material: { type: Type.STRING, enum: Object.values(ProductMaterial) },
          placement: { type: Type.STRING, enum: Object.values(PlacementType) },
          description: { type: Type.STRING, description: "A highly detailed visual description of the product's shape, color, and texture." },
          productName: { type: Type.STRING, description: "The identified name of the product (e.g., 'Sony WH-1000XM5' or 'Generic Leather Tote')." },
          brand: { type: Type.STRING, description: "The brand name if identifiable." },
          features: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Key physical features to highlight (e.g., 'Gold buckle', 'Touch control panel')." },
          components: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of distinct parts visible in the image (e.g., 'Main Bottle', 'Cap', 'Box', 'Applicator')." },
          usageScenarios: { type: Type.ARRAY, items: { type: Type.STRING }, description: "5 common contexts where this product is used." }
        },
        required: ['category', 'material', 'placement', 'description', 'features', 'components']
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("Analysis failed");
  
  try {
      return JSON.parse(text) as ProductAnalysis;
  } catch (e) {
      console.warn("JSON Parse Error in Analysis", e);
      // Fallback simple object if JSON fails but we have text (unlikely with schema)
      return {
          category: ProductCategory.OTHER,
          material: ProductMaterial.PLASTIC,
          placement: PlacementType.TABLETOP,
          description: text.substring(0, 200),
          features: ["Auto-detected product"],
          components: ["Main Product"],
          usageScenarios: ["Studio", "Home"]
      };
  }
};

export const generateProductShoot = async (
  images: UploadedImage[],
  options: GenerationOptions,
  onResult: (url: string, variation?: SceneVariation) => Promise<void>,
  signal?: AbortSignal
) => {
  const ai = getClient();
  
  let variations: SceneVariation[] = [];

  // If in AUTO mode and we have analysis, let's try to get even better variations from Gemini
  if (options.generationMode === 'AUTO' && options.analysis && options.analysis.usageScenarios) {
      try {
          const variationResponse = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: `Generate ${options.numberOfImages} diverse and realistic professional product photography scene variations for this product: ${options.analysis.productName}.
              Category: ${options.productCategory}.
              Usage Scenarios: ${options.analysis.usageScenarios.join(', ')}.
              Desired Contexts: ${options.sceneContexts.join(', ')}.
              
              For each variation, provide:
              1. location: A specific, realistic setting (e.g., 'modern minimalist living room wall' for an AC).
              2. environmentVibe: One of [Indoor, Outdoor, Urban, Natural].
              3. timeOfDay: One of [morning, afternoon, golden hour, soft window light].
              4. lighting: A professional lighting style.
              5. mood: A mood for the shot.
              6. composition: A photography composition rule.
              
              Return as a JSON array of objects.`,
              config: {
                  responseMimeType: 'application/json',
                  responseSchema: {
                      type: Type.ARRAY,
                      items: {
                          type: Type.OBJECT,
                          properties: {
                              location: { type: Type.STRING },
                              environmentVibe: { type: Type.STRING, enum: Object.values(EnvironmentType) },
                              timeOfDay: { type: Type.STRING },
                              lighting: { type: Type.STRING },
                              mood: { type: Type.STRING },
                              composition: { type: Type.STRING }
                          },
                          required: ['location', 'environmentVibe', 'timeOfDay', 'lighting', 'mood', 'composition']
                      }
                  }
              }
          });

          const generatedVariations = JSON.parse(variationResponse.text);
          variations = generatedVariations.map((gv: any) => ({
              ...gv,
              sceneContext: options.sceneContexts[0], // Fallback context
              environment: gv.mood,
              backgroundAction: 'Still life product shot.',
              camera: 'Front Hero View', // Default
              negative: ''
          }));
      } catch (e) {
          console.warn("Failed to generate variations with Gemini, falling back to engine", e);
          variations = buildVariations(
            options.sceneContexts,
            options.numberOfImages,
            options.overrides.locationStyle,
            options.productCategory
          );
      }
  } else {
      variations = buildVariations(
        options.sceneContexts,
        options.numberOfImages,
        options.overrides.locationStyle,
        options.productCategory
      );
  }

  for (let i = 0; i < options.numberOfImages; i++) {
    if (signal?.aborted) throw new Error("Generation Cancelled");

    const variation = variations[i % variations.length];
    const selectedPlacement = options.placement[i % options.placement.length];
    
    // Pass the rich analysis to the prompt builder
    const { prompt } = PromptBuilder.build(
      options.generationMode,
      variation,
      options.overrides,
      {
        category: options.productCategory,
        material: options.productMaterial,
        placement: selectedPlacement
      },
      options.autoStyle,
      options.shootType,
      options.studioStyle,
      options.useCustomColors ? options.colors : [],
      options.camera, 
      { include: options.includeHuman, config: options.humanModel },
      options.autoDescription,
      options.analysis // Inject deep analysis
    );

    // Prepare all image parts
    const imageParts = images.map(img => ({
        inlineData: { 
            mimeType: img.mimeType, 
            data: img.base64.split(',')[1] 
        }
    }));

    try {
      const ar = getAspectRatioConfig(options.width, options.height);
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            ...imageParts,
            { text: prompt }
          ]
        },
        config: {
            imageConfig: {
                aspectRatio: ar as any
            }
        }
      });

      if (signal?.aborted) return;

      let foundImage = false;
      const candidates = response.candidates;
      if (candidates) {
        for (const candidate of candidates) {
            if (candidate.content && candidate.content.parts) {
                for (const part of candidate.content.parts) {
                    if (part.inlineData && part.inlineData.data) {
                        const base64 = `data:image/png;base64,${part.inlineData.data}`;
                        await onResult(base64, variation);
                        foundImage = true;
                    }
                }
            }
        }
      }
      
      if (!foundImage) console.warn("No image returned from generation.");

    } catch (e: any) {
      console.error("Generation Error:", e);
      // RETHROW CRITICAL ERRORS to allow UI to handle auth/quota issues
      const msg = e.toString().toLowerCase();
      if (msg.includes("429") || msg.includes("quota") || msg.includes("resource_exhausted") || msg.includes("not found")) {
        throw e;
      }
    }
  }
};

export const generateCollectionShoot = async (
    options: GroupGenerationOptions,
    onResult: (url: string, variation?: SceneVariation) => Promise<void>,
    signal?: AbortSignal
) => {
    const ai = getClient();
    const variations = buildVariations(
        options.sceneContexts,
        options.numberOfImages,
        options.overrides.locationStyle
    );

    for (let i = 0; i < options.numberOfImages; i++) {
        if (signal?.aborted) throw new Error("Generation Cancelled");
        const variation = variations[i % variations.length];

        let prompt = `[SYSTEM: Professional Product Group Photography]\n`;
        prompt += `Scene: ${variation.location}. ${variation.environment}.\n`;
        prompt += `Lighting: ${variation.lighting}. Mood: ${variation.mood}.\n`;
        
        prompt += `SUBJECTS:\n`;
        options.members.forEach((m, idx) => {
            prompt += `Product ${idx + 1}: ${m.category}. ${m.description || ''}.\n`;
        });
        
        prompt += `COMPOSITION: Arrange these ${options.members.length} products naturally together in the scene. `;
        prompt += `Style: ${options.studioStyle} look.\n`;
        prompt += `Negative: blurry, floating artifacts, distorted text, bad geometry.\n`;

        const parts: any[] = [];
        options.members.forEach(m => {
            if (m.productImage) {
                parts.push({ inlineData: { mimeType: 'image/png', data: m.productImage.split(',')[1] } });
            }
        });
        parts.push({ text: prompt });

        try {
            const ar = getAspectRatioConfig(options.width, options.height);
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts },
                config: {
                    imageConfig: {
                        aspectRatio: ar as any
                    }
                }
            });

             if (signal?.aborted) return;

            if (response.candidates?.[0]?.content?.parts) {
                 for (const part of response.candidates[0].content.parts) {
                     if (part.inlineData?.data) {
                         const base64 = `data:image/png;base64,${part.inlineData.data}`;
                         await onResult(base64, variation);
                     }
                 }
            }
        } catch(e: any) { 
            console.error("Generation Error:", e);
            // RETHROW CRITICAL ERRORS
            const msg = e.toString().toLowerCase();
            if (msg.includes("429") || msg.includes("quota") || msg.includes("resource_exhausted") || msg.includes("not found")) {
                throw e;
            }
        }
    }
};

export const generateProductVideo = async (
  image: string,
  prompt: string,
  movement: CameraMovement,
  aspectRatio: string,
  resolution: string,
  modelId: string
): Promise<{ url: string, videoMetadata: any }> => {
    const ai = getClient();
    const imageBytes = image.split(',')[1];
    const fullPrompt = `Cinematic product video. ${prompt}. Movement: ${movement}. High quality, 8k, professional lighting.`;

    let operation = await ai.models.generateVideos({
        model: modelId,
        prompt: fullPrompt,
        image: {
            imageBytes: imageBytes,
            mimeType: 'image/jpeg'
        },
        config: {
            numberOfVideos: 1,
            aspectRatio: aspectRatio as any,
            resolution: resolution as any
        }
    });

    while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        operation = await ai.operations.getVideosOperation({ operation });
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) throw new Error("Video generation failed");

    const response = await fetch(`${videoUri}&key=${process.env.GEMINI_API_KEY}`);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    
    return { url, videoMetadata: operation.response?.generatedVideos?.[0]?.video };
};

export const extendProductVideo = async (
    videoMetadata: any,
    prompt: string,
    aspectRatio: string,
    modelId: string
): Promise<{ url: string, videoMetadata: any }> => {
    const ai = getClient();
    
    // Extensions require 720p as per current Veo limitations
    let operation = await ai.models.generateVideos({
        model: 'veo-3.1-generate-preview',
        prompt: prompt,
        video: videoMetadata,
        config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: aspectRatio as any
        }
    });

     while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        operation = await ai.operations.getVideosOperation({ operation });
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) throw new Error("Video extension failed");

    const response = await fetch(`${videoUri}&key=${process.env.GEMINI_API_KEY}`);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    
    return { url, videoMetadata: operation.response?.generatedVideos?.[0]?.video };
}

export const expandImage = async (imageUrl: string, width: number, height: number): Promise<string> => {
    const ai = getClient();
    
    // 1. Pad the image locally to the target dimensions
    const paddedBase64 = await resizeAndPadImage(imageUrl, width, height);
    const base64Data = paddedBase64.split(',')[1];
    
    // 2. Determine Aspect Ratio for Config (closest standard)
    const aspectRatioStr = getAspectRatioConfig(width, height);
    
    const prompt = "Seamlessly outpaint and expand this image to fill the entire canvas. " + 
                   "Generate a coherent background that matches the existing scene's lighting, textures, and depth. " +
                   "Do not alter the central product. Fill the empty/white space naturally.";

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image', 
        contents: {
            parts: [
                { inlineData: { mimeType: 'image/png', data: base64Data } },
                { text: prompt }
            ]
        },
        config: {
             imageConfig: {
                 aspectRatio: aspectRatioStr as any,
             }
        }
    });
    
    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (part?.inlineData?.data) {
        return `data:image/png;base64,${part.inlineData.data}`;
    }
    throw new Error("Expansion failed");
};

export const upscaleImage4K = async (imageUrl: string, width: number, height: number): Promise<string> => {
    const ai = getClient();
    const base64 = imageUrl.split(',')[1];
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                { inlineData: { mimeType: 'image/png', data: base64 } },
                { text: "Remaster this image in high resolution. Ultra-sharp details, remove noise, enhance textures. Keep content exactly the same." }
            ]
        },
        config: {
             imageConfig: {
                 aspectRatio: "1:1"
             }
        }
    });

    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (part?.inlineData?.data) {
        return `data:image/png;base64,${part.inlineData.data}`;
    }
    throw new Error("Upscaling failed");
};
