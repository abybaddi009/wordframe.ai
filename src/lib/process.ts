import {
  env,
  AutoModel,
  AutoProcessor,
  RawImage,
  PreTrainedModel,
  Processor
} from "@huggingface/transformers";

// Configure transformers environment for browser
env.allowRemoteModels = true;
env.remoteHost = "https://huggingface.co";
env.remotePathTemplate = "{model}/resolve/{revision}/";

// Check for SharedArrayBuffer support and configure accordingly
const hasSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined';
const isStaticBuild = !import.meta.env.DEV;
console.log('SharedArrayBuffer available:', hasSharedArrayBuffer);
console.log('Static build environment:', isStaticBuild);

// Configure WASM backend settings
try {
  if (env.backends?.onnx?.wasm) {
    const wasmConfig = env.backends.onnx.wasm as any;
    // Use CDN for WASM files
    wasmConfig.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/";
    
    // For static builds or when SharedArrayBuffer is not available, use single-threaded mode
    if (!hasSharedArrayBuffer || isStaticBuild) {
      console.log('Configuring single-threaded WASM mode for static/limited environment');
      wasmConfig.numThreads = 1;
      wasmConfig.simd = false;
      wasmConfig.proxy = true;
    } else {
      console.log('Using multi-threaded WASM mode');
    }
  }
} catch (error) {
  console.warn("Could not configure WASM paths:", error);
}

// Initialize different model configurations
const WEBGPU_MODEL_ID = "Xenova/modnet";
const FALLBACK_MODEL_ID = "briaai/RMBG-1.4";

interface ModelState {
  model: PreTrainedModel | null;
  processor: Processor | null;
  isWebGPUSupported: boolean;
  currentModelId: string;
  isIOS: boolean;
}

interface ModelInfo {
  currentModelId: string;
  isWebGPUSupported: boolean;
  isIOS: boolean;
}

// iOS detection
const isIOS = () => {
  return [
    'iPad Simulator',
    'iPhone Simulator',
    'iPod Simulator',
    'iPad',
    'iPhone',
    'iPod'
  ].includes(navigator.platform)
  || (navigator.userAgent.includes("Mac") && "ontouchend" in document);
};

const state: ModelState = {
  model: null,
  processor: null,
  isWebGPUSupported: false,
  currentModelId: FALLBACK_MODEL_ID,
  isIOS: isIOS()
};

// Initialize WebGPU with proper error handling
async function initializeWebGPU() {
  const gpu = (navigator as any).gpu;
  if (!gpu) {
    return false;
  }

  try {
    // Test if we can actually create an adapter
    const adapter = await gpu.requestAdapter();
    if (!adapter) {
      return false;
    }

    // Configure environment for WebGPU
    env.allowLocalModels = false;
    if (env.backends?.onnx?.wasm) {
      env.backends.onnx.wasm.proxy = false;
    }

    // Wait for WebAssembly initialization
    await new Promise(resolve => setTimeout(resolve, 100));

    // Initialize model with WebGPU
    state.model = await AutoModel.from_pretrained(WEBGPU_MODEL_ID, {
      device: "webgpu"
    });
    state.processor = await AutoProcessor.from_pretrained(WEBGPU_MODEL_ID, {});
    state.isWebGPUSupported = true;
    return true;
  } catch (error) {
    console.error("WebGPU initialization failed:", error);
    return false;
  }
}

// Initialize the model based on the selected model ID
export async function initializeModel(forceModelId?: string): Promise<boolean> {
  try {
    console.log('🚀 Initializing model with environment check...');
    console.log('WebAssembly support:', typeof WebAssembly !== 'undefined');
    console.log('SharedArrayBuffer support:', typeof SharedArrayBuffer !== 'undefined');
    console.log('Current backends config:', env.backends);

    // Always use RMBG-1.4 for iOS
    if (state.isIOS) {
      console.log('iOS detected, using RMBG-1.4 model');
      env.allowLocalModels = false;
      if (env.backends?.onnx?.wasm) {
        env.backends.onnx.wasm.proxy = true;
      }

      state.model = await AutoModel.from_pretrained(FALLBACK_MODEL_ID);

      state.processor = await AutoProcessor.from_pretrained(FALLBACK_MODEL_ID, {
        config: {
          do_normalize: true,
          do_pad: false,
          do_rescale: true,
          do_resize: true,
          image_mean: [0.5, 0.5, 0.5],
          feature_extractor_type: "ImageFeatureExtractor",
          image_std: [1, 1, 1],
          resample: 2,
          rescale_factor: 0.00392156862745098,
          size: { width: 1024, height: 1024 },
        }
      });

      state.currentModelId = FALLBACK_MODEL_ID;
      return true;
    }

    // Non-iOS flow remains the same
    const selectedModelId = forceModelId || FALLBACK_MODEL_ID;
    
    // Try WebGPU if requested
    if (selectedModelId === WEBGPU_MODEL_ID) {
      const webGPUSuccess = await initializeWebGPU();
      if (webGPUSuccess) {
        state.currentModelId = WEBGPU_MODEL_ID;
        return true;
      }
      // If WebGPU fails, fall through to fallback model without error
    }
    
    // Use fallback model
    env.allowLocalModels = false;
    if (env.backends?.onnx?.wasm) {
      env.backends.onnx.wasm.proxy = true;
    }
    
    state.model = await AutoModel.from_pretrained(FALLBACK_MODEL_ID, {
      progress_callback: (progress: any) => {
        if (progress && typeof progress === 'object' && 'progress' in progress) {
          const percent = Math.round((progress.progress || 0) * 100);
          console.log(`Loading model: ${percent}%`);
        } else if (typeof progress === 'number') {
          const percent = Math.round(progress * 100);
          console.log(`Loading model: ${percent}%`);
        } else {
          console.log('Loading model...', progress);
        }
      }
    });
    
    state.processor = await AutoProcessor.from_pretrained(FALLBACK_MODEL_ID, {
      revision: "main",
      config: {
        do_normalize: true,
        do_pad: true,
        do_rescale: true,
        do_resize: true,
        image_mean: [0.5, 0.5, 0.5],
        feature_extractor_type: "ImageFeatureExtractor",
        image_std: [0.5, 0.5, 0.5],
        resample: 2,
        rescale_factor: 0.00392156862745098,
        size: { width: 1024, height: 1024 }
      }
    });
    
    state.currentModelId = FALLBACK_MODEL_ID;
    
    if (!state.model || !state.processor) {
      throw new Error("Failed to initialize model or processor");
    }
    
    state.currentModelId = selectedModelId;
    return true;
  } catch (error) {
    console.error("Error initializing model:", error);
    console.error("Error details:", {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    if (forceModelId === WEBGPU_MODEL_ID) {
      console.log("Falling back to cross-browser model...");
      return initializeModel(FALLBACK_MODEL_ID);
    }
    
    // Additional fallback: try with different WASM settings
    if (!state.model && !forceModelId) {
      console.log("🔄 Trying fallback initialization with proxy disabled...");
      try {
        env.allowLocalModels = false;
        if (env.backends?.onnx?.wasm) {
          env.backends.onnx.wasm.proxy = false;
        }
        
                 state.model = await AutoModel.from_pretrained(FALLBACK_MODEL_ID, {
           progress_callback: (progress: any) => {
             if (progress && typeof progress === 'object' && 'progress' in progress) {
               const percent = Math.round((progress.progress || 0) * 100);
               console.log(`Loading model (fallback): ${percent}%`);
             } else if (typeof progress === 'number') {
               const percent = Math.round(progress * 100);
               console.log(`Loading model (fallback): ${percent}%`);
             } else {
               console.log('Loading model (fallback)...', progress);
             }
           }
         });
        
        state.processor = await AutoProcessor.from_pretrained(FALLBACK_MODEL_ID, {
          config: {
            do_normalize: true,
            do_pad: true,
            do_rescale: true,
            do_resize: true,
            image_mean: [0.5, 0.5, 0.5],
            feature_extractor_type: "ImageFeatureExtractor",
            image_std: [0.5, 0.5, 0.5],
            resample: 2,
            rescale_factor: 0.00392156862745098,
            size: { width: 1024, height: 1024 }
          }
        });
        state.currentModelId = FALLBACK_MODEL_ID;
        
        console.log("✅ Fallback initialization successful");
        return true;
      } catch (fallbackError) {
        console.error("❌ Fallback initialization also failed:", fallbackError);
      }
    }
    
    throw new Error(error instanceof Error ? error.message : "Failed to initialize background removal model");
  }
}

// Get current model info
export function getModelInfo(): ModelInfo {
  return {
    currentModelId: state.currentModelId,
    isWebGPUSupported: Boolean((navigator as any).gpu),
    isIOS: state.isIOS
  };
}

export async function processImage(image: File): Promise<File> {
  if (!state.model || !state.processor) {
    throw new Error("Model not initialized. Call initializeModel() first.");
  }

  const img = await RawImage.fromURL(URL.createObjectURL(image));
  
  try {
    // Pre-process image
    const { pixel_values } = await state.processor(img);
    
    // Predict alpha matte
    const { output } = await state.model({ input: pixel_values });

    // Resize mask back to original size
    const maskData = (
      await RawImage.fromTensor(output[0].mul(255).to("uint8")).resize(
        img.width,
        img.height,
      )
    ).data;

    // Create new canvas
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    if(!ctx) throw new Error("Could not get 2d context");
    
    // Draw original image output to canvas
    ctx.drawImage(img.toCanvas(), 0, 0);

    // Update alpha channel and set background to white
    const pixelData = ctx.getImageData(0, 0, img.width, img.height);
    for (let i = 0; i < maskData.length; ++i) {
      const alpha = maskData[i];
      pixelData.data[4 * i + 3] = 255; // Keep alpha at 255 (fully opaque)
      
      // If the mask indicates background (low alpha), set pixel to white
      if (alpha < 128) { // Background pixel
        pixelData.data[4 * i] = 255;     // R = white
        pixelData.data[4 * i + 1] = 255; // G = white
        pixelData.data[4 * i + 2] = 255; // B = white
      }
      // Otherwise keep the original pixel color (foreground)
    }
    ctx.putImageData(pixelData, 0, 0);
    
    // Convert canvas to blob
    const blob = await new Promise<Blob>((resolve, reject) => 
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error("Failed to create blob")), 
        "image/png"
      )
    );
    
    const [fileName] = image.name.split(".");
    const processedFile = new File([blob], `${fileName}-bg-removed.png`, { type: "image/png" });
    return processedFile;
  } catch (error) {
    console.error("Error processing image:", error);
    throw new Error("Failed to process image");
  }
}

export async function processImages(images: File[]): Promise<File[]> {
  console.log("Processing images...");
  const processedFiles: File[] = [];
  
  for (const image of images) {
    try {
      const processedFile = await processImage(image);
      processedFiles.push(processedFile);
      console.log("Successfully processed image", image.name);
    } catch (error) {
      console.error("Error processing image", image.name, error);
    }
  }
  
  console.log("Processing images done");
  return processedFiles;
}

// Helper function to process image from URL (for data URLs)
export async function processImageFromDataURL(dataURL: string): Promise<string> {
  if (!state.model || !state.processor) {
    throw new Error("Model not initialized. Call initializeModel() first.");
  }

  const img = await RawImage.fromURL(dataURL);
  
  try {
    // Pre-process image
    const { pixel_values } = await state.processor(img);
    
    // Predict alpha matte
    const { output } = await state.model({ input: pixel_values });

    // Resize mask back to original size
    const maskData = (
      await RawImage.fromTensor(output[0].mul(255).to("uint8")).resize(
        img.width,
        img.height,
      )
    ).data;

    // Create new canvas
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    if(!ctx) throw new Error("Could not get 2d context");
    
    // Draw original image output to canvas
    ctx.drawImage(img.toCanvas(), 0, 0);

    // Update alpha channel and set background to white
    const pixelData = ctx.getImageData(0, 0, img.width, img.height);
    for (let i = 0; i < maskData.length; ++i) {
      const alpha = maskData[i];
      pixelData.data[4 * i + 3] = 255; // Keep alpha at 255 (fully opaque)
      
      // If the mask indicates background (low alpha), set pixel to white
      if (alpha < 128) { // Background pixel
        pixelData.data[4 * i] = 255;     // R = white
        pixelData.data[4 * i + 1] = 255; // G = white
        pixelData.data[4 * i + 2] = 255; // B = white
      }
      // Otherwise keep the original pixel color (foreground)
    }
    ctx.putImageData(pixelData, 0, 0);
    
    // Convert canvas to data URL
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error("Error processing image:", error);
    throw new Error("Failed to process image");
  }
}

// Simple canvas-based background removal fallback
export async function simpleBackgroundRemoval(imageDataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get canvas context');
        
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw original image
        ctx.drawImage(img, 0, 0);
        
        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Simple background removal using edge detection and color similarity
        // This is a basic implementation - identifies likely background pixels
        const processedData = new Uint8ClampedArray(data);
        
        // Calculate average color of corners (likely background)
        const cornerSamples = [
          [0, 0], [img.width - 1, 0], [0, img.height - 1], [img.width - 1, img.height - 1]
        ];
        
        let avgR = 0, avgG = 0, avgB = 0;
        cornerSamples.forEach(([x, y]) => {
          const idx = (y * img.width + x) * 4;
          avgR += data[idx];
          avgG += data[idx + 1];
          avgB += data[idx + 2];
        });
        avgR /= cornerSamples.length;
        avgG /= cornerSamples.length;
        avgB /= cornerSamples.length;
        
        // Remove pixels similar to background color
        const threshold = 80; // Color similarity threshold
        
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          // Calculate color distance from background
          const distance = Math.sqrt(
            Math.pow(r - avgR, 2) + 
            Math.pow(g - avgG, 2) + 
            Math.pow(b - avgB, 2)
          );
          
          // If pixel is similar to background, make it white
          if (distance < threshold) {
            processedData[i] = 255;     // R
            processedData[i + 1] = 255; // G
            processedData[i + 2] = 255; // B
            processedData[i + 3] = 255; // A
          } else {
            // Keep original pixel
            processedData[i] = r;
            processedData[i + 1] = g;
            processedData[i + 2] = b;
            processedData[i + 3] = 255;
          }
        }
        
        // Put processed data back
        const newImageData = new ImageData(processedData, canvas.width, canvas.height);
        ctx.putImageData(newImageData, 0, 0);
        
        // Return as data URL
        resolve(canvas.toDataURL('image/png'));
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageDataUrl;
  });
}
