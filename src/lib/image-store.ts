import { create } from 'zustand';

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ImageProcessingState {
  // Original uploaded image
  originalImage: string | null;
  originalImageFile: File | null;
  
  // Cropped image
  croppedImage: string | null;
  cropArea: CropArea | null;
  
  // Threshold image (final processed)
  thresholdImage: string | null;
  previewThresholdImage: string | null; // Preview of threshold processing, not yet confirmed
  thresholdValue: number;
  
  // UI state
  isProcessing: boolean;
  step: 'upload' | 'crop' | 'threshold' | 'complete';
}

interface ImageProcessingActions {
  setOriginalImage: (imageUrl: string, file: File) => void;
  setCropArea: (area: CropArea) => void;
  setCroppedImage: (imageUrl: string) => void;
  setThresholdValue: (value: number) => void;
  setThresholdImage: (imageUrl: string) => void;
  setPreviewThresholdImage: (imageUrl: string) => void;
  confirmThresholdImage: () => void;
  setStep: (step: ImageProcessingState['step']) => void;
  setProcessing: (processing: boolean) => void;
  reset: () => void;
  processThreshold: () => Promise<void>;
}

interface ImageProcessingStore extends ImageProcessingState {
  actions: ImageProcessingActions;
}

const initialState: ImageProcessingState = {
  originalImage: null,
  originalImageFile: null,
  croppedImage: null,
  cropArea: null,
  thresholdImage: null,
  previewThresholdImage: null,
  thresholdValue: 128,
  isProcessing: false,
  step: 'upload'
};

export const useImageStore = create<ImageProcessingStore>((set, get) => ({
  ...initialState,
  
  actions: {
    setOriginalImage: (imageUrl: string, file: File) => {
      set({
        originalImage: imageUrl,
        originalImageFile: file,
        step: 'crop'
      });
    },
    
    setCropArea: (area: CropArea) => {
      set({ cropArea: area });
    },
    
    setCroppedImage: (imageUrl: string) => {
      set({
        croppedImage: imageUrl,
        step: 'threshold'
      });
    },
    
    setThresholdValue: (value: number) => {
      console.log('📊 Setting threshold value:', value);
      set({ thresholdValue: value });
    },
    
    setThresholdImage: (imageUrl: string) => {
      console.log('🎯 Setting threshold image:', imageUrl.substring(0, 50) + '...');
      set({ thresholdImage: imageUrl });
    },
    
    setPreviewThresholdImage: (imageUrl: string) => {
      console.log('🎯 Setting preview threshold image:', imageUrl.substring(0, 50) + '...');
      set({ previewThresholdImage: imageUrl });
    },
    
    confirmThresholdImage: () => {
      const { previewThresholdImage } = get();
      console.log('✅ Confirming threshold image:', previewThresholdImage?.substring(0, 50) + '...');
      if (previewThresholdImage) {
        set({ 
          thresholdImage: previewThresholdImage,
          step: 'complete'
        });
      }
    },
    
    setStep: (step: ImageProcessingState['step']) => {
      console.log('📋 Step changed to:', step);
      set({ step });
    },
    
    setProcessing: (processing: boolean) => {
      set({ isProcessing: processing });
    },
    
    reset: () => {
      set(initialState);
    },
    
    processThreshold: async () => {
      const { croppedImage, thresholdValue } = get();
      console.log('🔧 processThreshold called with:', { 
        hasCroppedImage: !!croppedImage, 
        thresholdValue 
      });
      
      if (!croppedImage) {
        console.log('❌ No cropped image, aborting threshold processing');
        return;
      }
      
      console.log('⚙️ Starting threshold processing...');
      set({ isProcessing: true });
      
      try {
        // Create canvas for threshold processing
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get canvas context');
        
        // Load image
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = croppedImage;
        });
        
        // Set canvas size
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw image
        ctx.drawImage(img, 0, 0);
        
        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Apply threshold
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          // Convert to grayscale
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          
          // Apply threshold
          const value = gray > thresholdValue ? 255 : 0;
          
          data[i] = value;     // R
          data[i + 1] = value; // G
          data[i + 2] = value; // B
          // Alpha channel stays the same
        }
        
        // Put processed data back
        ctx.putImageData(imageData, 0, 0);
        
        // Convert to data URL
        const processedImageUrl = canvas.toDataURL('image/png');
        
        console.log('✅ Threshold processing completed successfully');
        
        // Use the action to ensure logging
        const actions = get().actions;
        set({ isProcessing: false });
        actions.setPreviewThresholdImage(processedImageUrl);
      } catch (error) {
        console.error('❌ Error processing threshold:', error);
        set({ isProcessing: false });
      }
    }
  }
})); 