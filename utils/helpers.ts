
import { ProductCategory } from '../types';

const convertToPng = (src: string): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            } else {
                resolve(src);
            }
        };
        img.onerror = () => resolve(src);
        img.src = src;
    });
};

export const resizeAndPadImage = async (base64: string, targetWidth: number, targetHeight: number): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error("Canvas context failed"));
                return;
            }

            // Fill with a neutral color that indicates "empty" for outpainting context
            ctx.fillStyle = '#FFFFFF'; 
            ctx.fillRect(0, 0, targetWidth, targetHeight);
            
            // Calculate scaling to fit the image WITHIN the target (contain)
            const ratio = Math.min(1, Math.min(targetWidth / img.width, targetHeight / img.height));
            
            const dWidth = img.width * ratio;
            const dHeight = img.height * ratio;
            const dx = (targetWidth - dWidth) / 2;
            const dy = (targetHeight - dHeight) / 2;
            
            ctx.drawImage(img, dx, dy, dWidth, dHeight);
            
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = reject;
        img.src = base64;
    });
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
        let res = reader.result as string;
        if (res.startsWith('data:image/avif')) {
            try {
                res = await convertToPng(res);
            } catch (e) {
                console.warn("AVIF conversion failed", e);
            }
        }
        resolve(res);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 9);
};

export const fetchImageFromUrl = async (url: string): Promise<{ base64: string; mimeType: string }> => {
  const cleanUrl = url.split('?')[0];

  try {
    const response = await fetch(cleanUrl);
    if (response.ok) {
      const blob = await response.blob();
      return await blobToBase64Result(blob);
    }
  } catch (directErr) {
    console.warn("Direct fetch failed, attempting proxies...", directErr);
  }

  try {
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(cleanUrl)}`;
    const response = await fetch(proxyUrl);
    if (!response.ok) throw new Error('Primary proxy failed');
    
    const blob = await response.blob();
    return await blobToBase64Result(blob);
  } catch (err) {
    console.warn("Primary proxy failed, trying fallback...", err);
    
    try {
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(cleanUrl)}`;
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error('Fallback proxy failed');
        
        const blob = await response.blob();
        return await blobToBase64Result(blob);
    } catch (fallbackErr) {
        throw new Error("Failed to download image. The website might be blocking access.");
    }
  }
};

const blobToBase64Result = async (blob: Blob): Promise<{ base64: string; mimeType: string }> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = async () => {
            let base64 = reader.result as string;
            let mimeType = blob.type;
            
            if (base64.startsWith('data:image/avif') || mimeType === 'image/avif') {
                try {
                    base64 = await convertToPng(base64);
                    mimeType = 'image/png';
                } catch (e) {
                    console.warn("AVIF conversion failed", e);
                }
            }
            
            resolve({ base64, mimeType });
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

const detectCategoryFromUrl = (url: string, title: string, description: string = ''): ProductCategory | undefined => {
  const lowerText = `${url} ${title} ${description}`.toLowerCase();
  
  if (lowerText.includes('fridge') || lowerText.includes('refrigerator') || lowerText.includes('oven') || lowerText.includes('blender') || lowerText.includes('mixer')) return ProductCategory.KITCHEN_APPLIANCE;
  if (lowerText.includes('tv') || lowerText.includes('television') || lowerText.includes('monitor') || lowerText.includes('speaker')) return ProductCategory.HOME_ELECTRONICS;
  if (lowerText.includes('sofa') || lowerText.includes('chair') || lowerText.includes('table') || lowerText.includes('lamp')) return ProductCategory.FURNITURE;
  if (lowerText.includes('cream') || lowerText.includes('lotion') || lowerText.includes('serum') || lowerText.includes('perfume')) return ProductCategory.BEAUTY_COSMETICS;
  if (lowerText.includes('phone') || lowerText.includes('tablet') || lowerText.includes('laptop') || lowerText.includes('earbuds')) return ProductCategory.GADGETS;
  if (lowerText.includes('shoe') || lowerText.includes('sneaker') || lowerText.includes('boot')) return ProductCategory.SHOES;
  if (lowerText.includes('shirt') || lowerText.includes('dress') || lowerText.includes('pant') || lowerText.includes('jacket') || lowerText.includes('clothing') || lowerText.includes('wear')) return ProductCategory.FASHION;
  
  return ProductCategory.OTHER;
};

export const scrapeProductInfo = async (url: string, preferScreenshot: boolean = true): Promise<{ title: string; image: string; category?: ProductCategory; description?: string }> => {
    const apiUrl = `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&meta=true&viewport.width=1280&viewport.height=1600&waitFor=3000&adblock=true`;

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error("Failed to capture page screenshot");
        
        const data = await response.json();
        
        if (data.status === 'success' && data.data) {
             const title = data.data.title || 'Product';
             const description = data.data.description || '';
             
             let selectedImageUrl = data.data.screenshot?.url;
             if (!preferScreenshot && data.data.image?.url) {
                 selectedImageUrl = data.data.image.url;
             }
             if (!selectedImageUrl) {
                 selectedImageUrl = data.data.screenshot?.url || data.data.image?.url;
             }
             if (!selectedImageUrl) {
                 throw new Error("Image generation failed.");
             }

             const category = detectCategoryFromUrl(url, title, description);

             return { 
                 title: title, 
                 image: selectedImageUrl, 
                 category,
                 description
             };
        } else {
            throw new Error("Invalid response from screenshot service.");
        }
    } catch (err) {
        console.error("Screenshot API Error:", err);
        throw new Error("Could not process product page URL.");
    }
};
