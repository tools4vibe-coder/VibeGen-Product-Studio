
export interface UploadedImage {
  file: File;
  preview: string;
  base64: string;
  mimeType: string;
  processedBase64?: string; // Product isolation
}

export enum ProductCategory {
  KITCHEN_APPLIANCE = 'Kitchen Appliance',
  HOME_ELECTRONICS = 'Home Electronics',
  FURNITURE = 'Furniture & Decor',
  BEAUTY_COSMETICS = 'Beauty & Cosmetics',
  GADGETS = 'Gadgets & Tech',
  PACKAGING = 'Bottles & Packaging',
  SHOES = 'Footwear (Product)',
  ACCESSORIES = 'Accessories (Watches/Jewelry)',
  FASHION = 'Fashion & Clothing',
  OTHER = 'General Product'
}

export enum ProductMaterial {
  MATTE = 'Matte / Soft Touch',
  GLOSSY = 'Glossy / Shiny',
  METALLIC = 'Metallic / Brushed Steel',
  GLASS = 'Glass / Transparent',
  FABRIC = 'Fabric / Textured',
  WOOD = 'Wood / Organic',
  LEATHER = 'Leather',
  PLASTIC = 'Plastic'
}

export enum PlacementType {
  TABLETOP = 'Tabletop / Counter',
  FLOOR = 'Floor Standing',
  WALL = 'Wall Mounted',
  FLOATING = 'Floating / Zero Gravity',
  HANDHELD = 'Hand-Held (In Context)',
  PODIUM = 'On Podium / Plinth',
  WORN = 'Worn / On Model'
}

export enum SceneContext {
  STUDIO = 'Pure Studio',
  KITCHEN = 'Modern Kitchen',
  LIVING_ROOM = 'Living Room',
  OFFICE = 'Home Office',
  BATHROOM = 'Luxury Bathroom',
  OUTDOOR = 'Outdoor / Nature',
  MINIMAL = 'Abstract Minimal',
  INDUSTRIAL = 'Industrial / Loft',
  LUXURY = 'High-End Luxury'
}

export enum ShootType {
  STUDIO = 'Studio Photography',
  LIFESTYLE = 'Lifestyle Context'
}

export enum ShootMode {
  SINGLE = 'Single Product',
  MULTIPLE = 'Product Collection'
}

export enum StudioStyle {
  EDITORIAL = 'Editorial',
  MINIMAL = 'Minimal',
  DRAMATIC = 'Dramatic',
  LUXURY = 'Luxury',
  COMMERCIAL = 'E-Commerce White'
}

export enum EnvironmentType {
  INDOOR = 'Indoor',
  OUTDOOR = 'Outdoor',
  URBAN = 'Urban',
  NATURAL = 'Natural'
}

export enum CameraMovement {
  STATIC = 'Static / Subtle',
  PAN = 'Cinematic Pan',
  ZOOM_IN = 'Slow Zoom In',
  ORBIT = 'Orbit / Arc',
  HANDHELD = 'Handheld / Organic'
}

export enum ModelConsistency {
  CONSISTENT = 'Consistent',
  VARIED = 'Varied'
}

export type CameraAngle = 'Auto' | 'Eye-level' | 'Low-angle' | 'High-angle (Flatlay)' | '45-degree ISO' | 'Macro Detail' | 'Wide Angle';
export type LightingStyle = 'Auto' | 'Softbox' | 'Hard Rim Light' | 'Natural Window' | 'Neon/Cyberpunk' | 'Golden Hour' | 'Dark & Moody';
export type LocationStyle = 'Auto' | 'Luxury' | 'Minimal' | 'Rustic' | 'Modern' | 'Industrial' | 'Futuristic';

export interface AdvancedOverrides {
  customText?: string;
  lighting?: LightingStyle;
  locationStyle?: LocationStyle;
  negative?: string;
  consistency?: number;
}

export type GenerationMode = 'AUTO' | 'CUSTOM';

export interface CameraOptions {
  angle: CameraAngle;
  framing: 'Product Hero' | 'Wide Context' | 'Detail Shot';
  look: 'Clean' | 'Cinematic';
}

export type CanvasPreset = '3:4' | '1:1' | '16:9' | 'custom';

export interface HumanModelConfig {
  gender: 'Female' | 'Male' | 'Neutral';
  ethnicity: 'Diverse' | 'Caucasian' | 'Asian' | 'Black' | 'Latino' | 'Middle Eastern';
  action: 'Holding Product' | 'Using Product' | 'Standing Near' | 'Walking With' | 'Sitting With' | 'Wearing Product';
  framing: 'Hands Only' | 'Partial Body' | 'Full Body';
}

export interface ProductAnalysis {
  category: ProductCategory;
  material: ProductMaterial;
  placement: PlacementType;
  description: string;
  productName?: string;
  brand?: string;
  features?: string[];
  components?: string[];
  visualDetails?: {
    shape?: string;
    colors?: string[];
    textures?: string[];
  };
  usageScenarios?: string[];
}

export interface GenerationOptions {
  generationMode: GenerationMode;
  prompt: string;
  productCategory: ProductCategory;
  productMaterial: ProductMaterial;
  placement: PlacementType[]; // Changed to array for multi-select
  autoDescription?: string; 
  analysis?: ProductAnalysis; // New deep analysis data
  
  // Visuals
  colors: string[];
  useCustomColors: boolean;
  shootType: ShootType;
  shootMode: ShootMode;
  studioStyle: StudioStyle;
  
  // Context
  sceneContexts: SceneContext[];
  environmentTypes: EnvironmentType[];
  environmentRandom: boolean;
  
  // Human Model
  includeHuman: boolean;
  humanModel: HumanModelConfig;

  numberOfImages: number;
  width: number;
  height: number;
  canvasPreset: CanvasPreset;
  autoStyle: boolean; 
  variationStrength: 'Low' | 'Medium' | 'High';
  camera: CameraOptions;
  overrides: AdvancedOverrides;
  productConfirmed: boolean;
}

export interface GroupMember {
  id: string;
  productImage: string | null;
  category: ProductCategory;
  description: string;
}

export interface GroupGenerationOptions {
  generationMode: GenerationMode;
  members: GroupMember[];
  scenePrompt: string;
  width: number;
  height: number;
  numberOfImages: number;
  
  // Shared Settings
  sceneContexts: SceneContext[];
  shootType: ShootType;
  studioStyle: StudioStyle;
  productMaterial: ProductMaterial; // Dominant material
  
  environmentRandom: boolean;
  autoStyle: boolean;
  colors: string[];
  useCustomColors: boolean;
  camera: CameraOptions;
  overrides: AdvancedOverrides;
}

export interface GeneratedImage {
  id: string;
  url: string;
  timestamp: number;
  width?: number;
  height?: number;
  location?: string;
  timeOfDay?: string;
  environmentVibe?: EnvironmentType;
}

export interface GeneratedVideo {
  id: string;
  url: string;
  thumbnail: string;
  timestamp: number;
  prompt: string;
  movement: CameraMovement;
  aspectRatio: string;
  resolution: string;
  videoMetadata?: any;
  projectId?: string;
  modelUsed?: string;
}

export interface TimelineClip {
  id: string;
  sourceType: 'image' | 'video';
  sourceUrl: string;
  thumbnail: string;
  label: string;
  startSec: number; 
  durationSec: number;
  sourceDurationSec: number;
  trimInSec: number;
  trimOutSec: number;
  metadata?: any;
  aspectRatio?: string;
  videoId?: string;
  hasAudio?: boolean;
  modelUsed?: string;
}

export interface VideoProject {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  aspectRatio: '9:16' | '16:9';
  resolution: '720p' | '1080p';
  movement: CameraMovement;
  veoModel: string;
  sourceImage: string;
  transform: { x: number; y: number; scale: number };
  fitMode: 'cover' | 'contain';
  timeline: TimelineClip[];
  lastExportUrl?: string;
  lastExportMime?: string;
}

export interface SceneVariation {
  location: string;
  timeOfDay: string;
  lighting: string;
  environment: string;
  backgroundAction: string;
  camera: string;
  composition: string;
  mood: string;
  negative: string;
  sceneContext: SceneContext;
  environmentVibe: EnvironmentType;
}
