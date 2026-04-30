export const compressImage = (file: File, maxWidth = 4096, quality = 1.0): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Failed to get canvas context'));
        
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

/**
 * Ensures an image is optimized for OCR.space (under 1MB limit)
 * Targeted for high quality and correct dimensions for OCR Engine 2
 */
export const prepareForOCR = async (dataUrl: string, maxSizeBytes = 1000 * 1024): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = dataUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(dataUrl);

      // OCR.space best results are usually between 1500px and 2500px
      let targetWidth = Math.min(img.width, 2400); 
      let targetHeight = (targetWidth / img.width) * img.height;

      canvas.width = targetWidth;
      canvas.height = targetHeight;
      
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      // Recursive check for size
      const tryCompression = (q: number): string => {
        const result = canvas.toDataURL('image/jpeg', q);
        // Base64 size is ~1.33x original, but let's be safe and check the actual string length
        // Data URL format: data:image/jpeg;base64,xxxx
        const head = "data:image/jpeg;base64,";
        const contentSize = (result.length - head.length) * 0.75;
        
        if (contentSize > maxSizeBytes && q > 0.1) {
          return tryCompression(q - 0.15);
        }
        return result;
      };

      resolve(tryCompression(0.9));
    };
    img.onerror = () => resolve(dataUrl);
  });
};
