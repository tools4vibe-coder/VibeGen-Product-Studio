
import { SceneContext, EnvironmentType, AdvancedOverrides, GenerationMode, LightingStyle, LocationStyle, ShootType, StudioStyle, PlacementType, ProductMaterial, ProductCategory, SceneVariation, HumanModelConfig, CameraOptions, ProductAnalysis } from '../types';

interface LocationEntry {
  text: string;
  vibes: EnvironmentType[];
  styles: LocationStyle[];
  categories?: ProductCategory[]; // Optional: restrict to certain categories
}

// Mapped by SceneContext
const LOCATIONS: Record<SceneContext, LocationEntry[]> = {
  [SceneContext.KITCHEN]: [
    { text: 'modern marble kitchen countertop with morning light', vibes: [EnvironmentType.INDOOR], styles: ['Luxury', 'Modern'], categories: [ProductCategory.KITCHEN_APPLIANCE, ProductCategory.PACKAGING] },
    { text: 'rustic wooden kitchen island with herbs', vibes: [EnvironmentType.INDOOR], styles: ['Rustic'], categories: [ProductCategory.KITCHEN_APPLIANCE, ProductCategory.PACKAGING] },
    { text: 'sleek minimalist kitchen with matte black cabinetry', vibes: [EnvironmentType.INDOOR], styles: ['Minimal'], categories: [ProductCategory.KITCHEN_APPLIANCE, ProductCategory.HOME_ELECTRONICS] },
    { text: 'sun-drenched breakfast nook with white linen', vibes: [EnvironmentType.INDOOR], styles: ['Modern'], categories: [ProductCategory.KITCHEN_APPLIANCE, ProductCategory.PACKAGING] }
  ],
  [SceneContext.LIVING_ROOM]: [
    { text: 'cozy oak coffee table with soft textures', vibes: [EnvironmentType.INDOOR], styles: ['Rustic', 'Modern'], categories: [ProductCategory.HOME_ELECTRONICS, ProductCategory.FURNITURE, ProductCategory.GADGETS] },
    { text: 'luxury penthouse shelf with city view blur', vibes: [EnvironmentType.INDOOR, EnvironmentType.URBAN], styles: ['Luxury'], categories: [ProductCategory.HOME_ELECTRONICS, ProductCategory.FURNITURE, ProductCategory.GADGETS] },
    { text: 'minimalist media console with abstract art', vibes: [EnvironmentType.INDOOR], styles: ['Minimal'], categories: [ProductCategory.HOME_ELECTRONICS, ProductCategory.FURNITURE] },
    { text: 'mid-century modern side table with warm lamp', vibes: [EnvironmentType.INDOOR], styles: ['Modern'], categories: [ProductCategory.HOME_ELECTRONICS, ProductCategory.FURNITURE, ProductCategory.GADGETS] },
    { text: 'clean white wall above a modern sofa', vibes: [EnvironmentType.INDOOR], styles: ['Modern', 'Minimal'], categories: [ProductCategory.HOME_ELECTRONICS, ProductCategory.FURNITURE] }
  ],
  [SceneContext.OFFICE]: [
    { text: 'professional mahogany desk with leather pad', vibes: [EnvironmentType.INDOOR], styles: ['Luxury', 'Modern'], categories: [ProductCategory.GADGETS, ProductCategory.HOME_ELECTRONICS, ProductCategory.ACCESSORIES] },
    { text: 'clean white creative workspace with plants', vibes: [EnvironmentType.INDOOR], styles: ['Minimal'], categories: [ProductCategory.GADGETS, ProductCategory.HOME_ELECTRONICS] },
    { text: 'high-tech setup with neon ambient lighting', vibes: [EnvironmentType.INDOOR], styles: ['Futuristic'], categories: [ProductCategory.GADGETS, ProductCategory.HOME_ELECTRONICS] },
    { text: 'architectural drafting table with natural light', vibes: [EnvironmentType.INDOOR], styles: ['Industrial'], categories: [ProductCategory.GADGETS, ProductCategory.HOME_ELECTRONICS] }
  ],
  [SceneContext.BATHROOM]: [
    { text: 'white marble vanity with spa accessories', vibes: [EnvironmentType.INDOOR], styles: ['Luxury'], categories: [ProductCategory.BEAUTY_COSMETICS, ProductCategory.PACKAGING] },
    { text: 'terrazzo stone shelf with tropical leaf shadow', vibes: [EnvironmentType.INDOOR], styles: ['Modern'], categories: [ProductCategory.BEAUTY_COSMETICS, ProductCategory.PACKAGING] },
    { text: 'minimalist concrete bathroom ledge', vibes: [EnvironmentType.INDOOR], styles: ['Minimal', 'Industrial'], categories: [ProductCategory.BEAUTY_COSMETICS, ProductCategory.PACKAGING] }
  ],
  [SceneContext.OUTDOOR]: [
    { text: 'sunlit wooden deck in a garden', vibes: [EnvironmentType.OUTDOOR, EnvironmentType.NATURAL], styles: ['Rustic'], categories: [ProductCategory.FURNITURE, ProductCategory.OTHER] },
    { text: 'smooth stone surface by a calm pool', vibes: [EnvironmentType.OUTDOOR, EnvironmentType.NATURAL], styles: ['Luxury'], categories: [ProductCategory.FURNITURE, ProductCategory.OTHER, ProductCategory.GADGETS] },
    { text: 'urban concrete bench with dappled sunlight', vibes: [EnvironmentType.OUTDOOR, EnvironmentType.URBAN], styles: ['Modern'], categories: [ProductCategory.FURNITURE, ProductCategory.OTHER, ProductCategory.GADGETS] },
    { text: 'modern balcony with a view of the city skyline', vibes: [EnvironmentType.OUTDOOR, EnvironmentType.URBAN], styles: ['Modern', 'Luxury'], categories: [ProductCategory.HOME_ELECTRONICS, ProductCategory.FURNITURE] }
  ],
  [SceneContext.STUDIO]: [
    { text: 'solid color studio backdrop', vibes: [EnvironmentType.INDOOR], styles: ['Minimal'] },
    { text: 'abstract geometric shapes podium', vibes: [EnvironmentType.INDOOR], styles: ['Modern'] }
  ],
  [SceneContext.MINIMAL]: [
    { text: 'pure infinite white space', vibes: [EnvironmentType.INDOOR], styles: ['Minimal'] },
    { text: 'soft pastel gradient background', vibes: [EnvironmentType.INDOOR], styles: ['Modern'] },
    { text: 'textured paper background', vibes: [EnvironmentType.INDOOR], styles: ['Minimal'] }
  ],
  [SceneContext.INDUSTRIAL]: [
    { text: 'brushed metal workbench surface', vibes: [EnvironmentType.INDOOR], styles: ['Industrial'], categories: [ProductCategory.GADGETS, ProductCategory.HOME_ELECTRONICS] },
    { text: 'polished concrete floor in a loft', vibes: [EnvironmentType.INDOOR], styles: ['Industrial'], categories: [ProductCategory.FURNITURE, ProductCategory.HOME_ELECTRONICS] }
  ],
  [SceneContext.LUXURY]: [
    { text: 'black velvet display surface', vibes: [EnvironmentType.INDOOR], styles: ['Luxury'], categories: [ProductCategory.ACCESSORIES, ProductCategory.BEAUTY_COSMETICS] },
    { text: 'gold-veined marble plinth', vibes: [EnvironmentType.INDOOR], styles: ['Luxury'], categories: [ProductCategory.ACCESSORIES, ProductCategory.BEAUTY_COSMETICS] },
    { text: 'reflective glass surface with bokeh lights', vibes: [EnvironmentType.INDOOR], styles: ['Luxury'], categories: [ProductCategory.ACCESSORIES, ProductCategory.BEAUTY_COSMETICS, ProductCategory.GADGETS] }
  ]
};

const TIMES = ['morning', 'afternoon', 'golden hour', 'soft window light'];
const LIGHTING = ['soft diffused box', 'hard dramatic rim', 'natural sunlight', 'studio strobe', 'warm ambient'];
const CAMERAS = ['hero shot 50mm', 'macro detail 100mm', 'wide environmental 35mm', 'isometric 45-degree'];
const COMPOSITIONS = ['centered symmetry', 'rule of thirds', 'diagonal layout', 'negative space emphasis'];
const MOODS = ['clean and pristine', 'warm and inviting', 'sleek and high-tech', 'organic and natural', 'bold and dramatic'];

const DEFAULT_NEGATIVE = "cropped image, cropped subject, out of frame, cut off top, cut off bottom, partial subject, bad quality, blurry, pixelated, distorted, low resolution, ugly, messy, clutter, text, watermark, logo, deformed, bad geometry, impossible perspective, broken, damaged, dirty, fingers, hands, human body parts (unless specified), plastic skin, airbrushed skin, fake texture";

export class PromptBuilder {
  static build(
    mode: GenerationMode,
    v: SceneVariation,
    overrides: AdvancedOverrides,
    product: { category: ProductCategory, material: ProductMaterial, placement: PlacementType },
    autoStyle: boolean = false,
    shootType: ShootType = ShootType.LIFESTYLE,
    studioStyle: StudioStyle = StudioStyle.EDITORIAL,
    customColors: string[] = [],
    cameraOptions?: CameraOptions,
    humanConfig?: { include: boolean, config: HumanModelConfig },
    autoDescription?: string,
    analysis?: ProductAnalysis // Injected deep analysis
  ): { prompt: string, meta: any } {
    
    // 1. SELECT FINAL VALUES
    // Priority: Explicit Camera Option > Override > Variation Random
    let finalCamera = v.camera;
    if (cameraOptions?.angle && cameraOptions.angle !== 'Auto') {
        finalCamera = `${cameraOptions.angle} view`;
    }

    const finalLighting = overrides.lighting && overrides.lighting !== 'Auto' ? overrides.lighting : v.lighting;

    let sceneDescription = `Scene: ${v.location}. ${v.environment}.\n`;
    let lightingDescription = `Time: ${v.timeOfDay}. Lighting: ${finalLighting}.\n`;
    let contextStr = `Context: ${v.sceneContext}.\n`;

    // OVERRIDE FOR STUDIO MODE
    if (shootType === ShootType.STUDIO) {
        v.location = "Professional Product Studio";
        
        const hasCustomColor = customColors.length > 0 && customColors[0];
        const colorHex = hasCustomColor ? customColors[0] : '';
        
        let styleDesc = "";
        switch(studioStyle) {
             case StudioStyle.EDITORIAL: styleDesc = "High-end editorial product shot, artistic shadows, sharp focus."; break;
             case StudioStyle.MINIMAL: styleDesc = "Clean minimalist studio, infinite cyclorama, soft dispersed lighting."; break;
             case StudioStyle.COMMERCIAL: 
                 styleDesc = hasCustomColor 
                    ? "E-commerce product photography, high-key lighting, even illumination." 
                    : "E-commerce pure white background, high-key lighting, even illumination.";
                 break;
             case StudioStyle.DRAMATIC: 
                 styleDesc = hasCustomColor
                    ? "Moody dramatic studio, rim lighting, strong contrast."
                    : "Moody dramatic studio, dark background, rim lighting, strong contrast.";
                 break;
             case StudioStyle.LUXURY: styleDesc = "Luxury commercial shoot, rich colors, gold/silver reflections, premium feel."; break;
             default: styleDesc = "Professional product studio.";
        }

        const colorPrompt = hasCustomColor
            ? `BACKGROUND: Uniform Solid Color (Hex: ${colorHex}). The entire background must be this exact color. No gradients, no props, no textures.` 
            : `Background: Solid single-color studio backdrop tailored to product.`;

        sceneDescription = `Scene: ${styleDesc} ${colorPrompt}\nNO CLUTTER. Focus purely on the product.\n`;
        lightingDescription = `Lighting: Professional studio lighting, ${finalLighting}, highlighting material textures.\n`;
        contextStr = `Context: Studio Photography.\n`;
    }

    // NEW: CUSTOM MODE LOGIC
    if (mode === 'CUSTOM' && overrides.customText) {
        sceneDescription = `SCENE DESCRIPTION: ${overrides.customText}.\n`;
    }

    // 2. BASE PROMPT
    let prompt = `[SYSTEM: Professional Product Photography. Output 8k high-fidelity commercial shot.]\n` +
                 `Subject: ${product.category}. Material Finish: ${product.material}.\n`;

    // 2.1. SOURCE OF TRUTH DIRECTIVE (STRICT)
    prompt += `SOURCE OF TRUTH: The uploaded image is the ABSOLUTE reference. ` +
              `Do NOT rely on your internal training data for what this product "usually" looks like. ` +
              `If the image shows a specific button layout, logo placement, or color that differs from the standard model you know, FOLLOW THE IMAGE. ` +
              `You are a digital camera capturing THIS SPECIFIC PHYSICAL OBJECT, not a generic version of it.\n`;

    // 3. PRODUCT KNOWLEDGE INJECTION
    if (analysis) {
        prompt += `IDENTIFIED PRODUCT: ${analysis.productName || 'Known Product'}. ${analysis.brand ? `Brand: ${analysis.brand}.` : ''}\n`;
        prompt += `PRODUCT FEATURES TO SHOWCASE: ${analysis.features?.join(', ') || 'Standard details'}.\n`;
        prompt += `KNOWLEDGE RULE: Use your technical knowledge (e.g. knowing it's waterproof) for context/scene logic, but VISUAL details must strictly come from the image.\n`;
    }
    
    prompt += `REFERENCE ANALYSIS (CRITICAL): The provided images are strictly for understanding the product's structure, features, branding, and materials from different angles. ` +
              `Do NOT simply composite the reference image into the scene. ` +
              `Instead, build a 3D mental model of the product from the references (front, side, details). ` +
              `RE-RENDER the product into the target scene with the requested camera angle ('${finalCamera}') and lighting. ` +
              `The final image must show the product in the new context, naturally integrated, not the original reference photo pasted in.\n` +
              `Ultra-realistic commercial photography, premium look.\n` +
              contextStr +
              sceneDescription +
              lightingDescription +
              `Placement: ${product.placement}.\n` +
              `Camera Angle: ${finalCamera}. Composition: ${v.composition}.\n` +
              `Mood: ${v.mood}.\n`;

    // 4. FASHION & WEARABLES LOGIC
    if (product.category === ProductCategory.FASHION || product.category === ProductCategory.SHOES || product.category === ProductCategory.ACCESSORIES) {
        if (humanConfig?.include) {
             prompt += `WEARABILITY: The product is a fashion item. It must be worn naturally by the model. ` +
                       `Understand the fit and drape based on the reference, but adapt it to the model's pose. ` +
                       `If it's a shirt/dress, drape it on the body. If it's a watch, put it on the wrist. If it's a shoe, put it on the feet.\n`;
        } else {
             prompt += `PRESENTATION: Display the fashion item professionally (e.g., ghost mannequin, folded neatly, or hanging), suitable for the scene context. Do not leave it flat if a better presentation exists.\n`;
        }
    }

    // 5. INTELLIGENT COMPONENT SELECTION (UPDATED)
    if (analysis && analysis.components && analysis.components.length > 0) {
        prompt += `\nCOMPONENT ANALYSIS: The input image contains multiple distinct parts: ${analysis.components.join(', ')}. `;
        prompt += `DECONSTRUCTION RULE: Do NOT treat the input image as a single flattened layer. Mentally isolate these components as separate 3D assets. `;
        prompt += `SCENE COMPOSITION: You have creative license to arrange these specific parts naturally. `;
        prompt += `For example, you might place the '${analysis.components[0]}' in the center and leave secondary accessories to the side or exclude them if they clutter the specific scene. `;
        prompt += `Ensure the MAIN PRODUCT is the hero. Accessories should support, not distract.\n`;
    } else {
        prompt += `INTELLIGENT COMPONENT SELECTION: If the image contains accessories (cables, boxes, manuals) alongside the main product, mentally separate them. `;
        prompt += `You may rearrange or exclude secondary accessories to fit the scene better, but the MAIN PRODUCT must remain exactly as shown.\n`;
    }

    // 6. AUTO DESCRIPTION INJECTION
    if (autoDescription) {
        prompt += `Visual Description: ${autoDescription}. (Use this to better understand the product's shape and color).\n`;
    }

    // 7. HUMAN MODEL LOGIC
    let isFullBody = false;
    if (humanConfig?.include && shootType === ShootType.LIFESTYLE) {
       const { gender, action, framing } = humanConfig.config;
       isFullBody = framing === 'Full Body';
       
       prompt += `\nHUMAN MODEL: Include a hyper-realistic Indian ${gender} model. `;
       prompt += `AESTHETICS: Authentic Indian features. SKIN TEXTURE: Unfiltered real skin, visible pores, natural skin texture, micro-details, imperfections, no smoothing, high-end editorial aesthetics. `;
       prompt += `Action: ${action}. Framing: ${framing}. `;
       prompt += `Ensure natural interaction with the product. The focus must remain on the product, but the model adds lifestyle context. `;
       prompt += `Clothing: High-fashion, aesthetic, modern Indian contemporary, neutral colors to not distract from product.\n`;
    } else {
       // Explicitly forbid humans if not requested
       prompt += `NO HUMANS: Do not include people, hands, faces, or body parts. Pure product photography.\n`;
    }

    if (autoStyle && shootType === ShootType.LIFESTYLE) {
        prompt += `STYLING: Propped with minimal, relevant high-end accessories that match the ${v.sceneContext} context. (e.g., fresh fruit for kitchen, pen for office). Do not clutter. Enhance the hero product.\n`;
    } else {
        prompt += `Keep the scene clean and focused on the product.\n`;
    }

    // 8. PRODUCT FIDELITY RULES (STRICTER)
    prompt += `CRITICAL PRODUCT IDENTITY RULE: The logo, text, label design, and physical proportions must match the reference images exactly. ` +
              `Do NOT 'fix' or 'modernize' the product unless told. ` +
              `Do NOT replace it with a newer or older model version. ` +
              `Do NOT use a generic stock 3D model. ` +
              `You are re-photographing the *same physical object* in a new place.\n`;
    
    // 9. FRAMING (STRICTER ANTI-CROP WITH AUTO ADJUST)
    prompt += `\nCRITICAL FRAMING INSTRUCTION: AUTO-ADJUST CAMERA DISTANCE.\n`;
    prompt += `ZOOM OUT significantly. The camera distance must be automatically adjusted to fit the full height of the subject.\n`;
    prompt += `Ensure the ENTIRE subject (product ${humanConfig?.include ? '+ model' : ''}) fits COMPLETELY inside the frame.\n`;
    prompt += `It is STRICTLY FORBIDDEN to crop the top, bottom, head, or feet of the subject.\n`;
    prompt += `MANDATORY PADDING: Leave at least 20% empty space (padding) at the TOP and BOTTOM of the frame. The subject must NOT touch the vertical edges.\n`;
    prompt += `Center the subject vertically and horizontally with breathing room on all sides.\n`;

    if (isFullBody) {
         prompt += `FULL BODY RULE: Show the human model from head to toe. Do not cut off the head. Do not cut off the feet.\n`;
    }

    // 10. CUSTOM OVERRIDES
    if (mode === 'CUSTOM') {
      if (overrides.customText) prompt += `\nConstraint: ${overrides.customText}.`;
    }

    // 11. NEGATIVE PROMPT LOGIC
    let negativePrompt = overrides.negative ? `${DEFAULT_NEGATIVE}, ${overrides.negative}` : DEFAULT_NEGATIVE;
    
    // Explicitly add negative constraints for product mutation
    negativePrompt += `, wrong version, old model, different generation, generic product, stock photo representation, hallucinated features, different buttons, wrong logo`;
    negativePrompt += `, new packaging design, changed logo, altered text, wrong label, morphed shape, distorted dimensions, different color, hallucinated details`;

    // If humans are included, remove the human-related negative terms
    if (humanConfig?.include) {
        negativePrompt = negativePrompt.replace('fingers, hands, human body parts (unless specified)', '');
        negativePrompt = negativePrompt.replace('fingers, hands, human body parts', '');
    }

    // Reinforce anti-crop in negative prompt
    negativePrompt += `, cropped head, cropped feet, cut off head, cut off feet, out of frame, plastic skin, doll-like skin, blurry skin`;

    prompt += `\nNegative: ${negativePrompt}`;

    return { 
      prompt, 
      meta: { location: v.location, time: v.timeOfDay, context: v.sceneContext } 
    };
  }
}

export function buildVariations(
  contexts: SceneContext[], 
  count: number, 
  locationStyle: LocationStyle = 'Auto',
  category?: ProductCategory
): SceneVariation[] {
  const variations: SceneVariation[] = [];
  const usedLocations = new Set<string>();

  // Determine Camera Sequence for comprehensive coverage if count > 1
  const cameraSequence = ['Front Hero View', '45-Degree Side View', 'Side Profile View', 'Top-Down Flatlay', 'Close-up Detail'];

  for (let i = 0; i < count; i++) {
    const ctx = contexts[i % contexts.length];
    let pool = LOCATIONS[ctx] || LOCATIONS[SceneContext.STUDIO];
    
    let filtered = pool;
    
    // 1. Filter by Category if provided
    if (category) {
        const catFiltered = filtered.filter(l => !l.categories || l.categories.includes(category));
        if (catFiltered.length > 0) filtered = catFiltered;
    }

    // 2. Filter by Style
    if (locationStyle !== 'Auto') {
      const styleFiltered = filtered.filter(l => l.styles.includes(locationStyle));
      if (styleFiltered.length > 0) filtered = styleFiltered;
    }
    
    let selection = filtered[Math.floor(Math.random() * filtered.length)];
    let attempts = 0;
    while (usedLocations.has(selection.text) && attempts < 10 && filtered.length > 1) {
      selection = filtered[Math.floor(Math.random() * filtered.length)];
      attempts++;
    }
    usedLocations.add(selection.text);

    // Smart Camera cycling for full coverage
    const cameraAngle = count > 1 ? cameraSequence[i % cameraSequence.length] : CAMERAS[Math.floor(Math.random() * CAMERAS.length)];

    variations.push({
      location: selection.text,
      environmentVibe: selection.vibes[0],
      sceneContext: ctx,
      timeOfDay: TIMES[Math.floor(Math.random() * TIMES.length)],
      lighting: LIGHTING[Math.floor(Math.random() * LIGHTING.length)],
      environment: MOODS[Math.floor(Math.random() * MOODS.length)],
      backgroundAction: 'Still life product shot.',
      camera: cameraAngle,
      composition: COMPOSITIONS[Math.floor(Math.random() * COMPOSITIONS.length)],
      mood: MOODS[Math.floor(Math.random() * MOODS.length)],
      negative: DEFAULT_NEGATIVE
    });
  }

  return variations;
}
