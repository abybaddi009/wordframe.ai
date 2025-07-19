import { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import { Upload, ImageIcon, Crop as CropIcon, Sliders, Check, X, ArrowLeft, Scissors } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Slider } from './ui/slider';
import { useImageStore } from '@/lib/image-store';
import 'react-image-crop/dist/ReactCrop.css';

interface ImageProcessorProps {
  onComplete?: (processedImage: string) => void;
  onCancel?: () => void;
  aspectRatio?: number;
}

export function ImageProcessor({ onComplete, onCancel, aspectRatio }: ImageProcessorProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  
  const {
    originalImage,
    backgroundRemovedImage,
    isInitializingBgRemoval,
    croppedImage,
    thresholdImage,
    previewThresholdImage,
    thresholdValue,
    isProcessing,
    step,
    error,
    actions
  } = useImageStore();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string;
        actions.setOriginalImage(imageUrl, file);
      };
      reader.readAsDataURL(file);
    }
  }, [actions]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': []
    },
    multiple: false
  });

  const handleCropComplete = useCallback(async () => {
    if (!completedCrop || !imgRef.current) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
    const scaleY = imgRef.current.naturalHeight / imgRef.current.height;

    canvas.width = completedCrop.width * scaleX;
    canvas.height = completedCrop.height * scaleY;

    ctx.drawImage(
      imgRef.current,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    );

    const croppedImageUrl = canvas.toDataURL('image/png');
    actions.setCroppedImage(croppedImageUrl);
  }, [completedCrop, actions]);

  const handleThresholdChange = useCallback((value: number[]) => {
    console.log('🎛️ Threshold slider changed:', value[0]);
    actions.setThresholdValue(value[0]);
  }, [actions]);



  const handleConfirm = useCallback(() => {
    console.log('🔄 handleConfirm triggered:', { 
      previewThresholdImage: !!previewThresholdImage, 
      step, 
      isProcessing 
    });
    
    if (previewThresholdImage) {
      actions.confirmThresholdImage();
      onComplete?.(previewThresholdImage);
    }
  }, [previewThresholdImage, onComplete, actions]);

  const handleCancel = useCallback(() => {
    actions.reset();
    onCancel?.();
  }, [actions, onCancel]);

  const handleBack = useCallback(() => {
    switch (step) {
      case 'bg-removal':
        actions.setStep('upload');
        break;
      case 'crop':
        actions.setStep('bg-removal');
        break;
      case 'threshold':
        actions.setStep('crop');
        break;
      case 'complete':
        actions.setStep('threshold');
        break;
    }
  }, [step, actions]);

  // Auto-process threshold when step changes to threshold (initial load only)
  useEffect(() => {
    console.log('🔄 Step change useEffect triggered:', { 
      step, 
      croppedImage: !!croppedImage, 
      isProcessing
    });
    
    // Initial processing is now handled by the thresholdValue useEffect
    // No need for separate auto-processing logic
  }, [step, croppedImage, isProcessing, actions, thresholdValue]);

  // Manual threshold processing when user changes the value
  useEffect(() => {
    console.log('🎚️ Threshold value change useEffect triggered:', { 
      thresholdValue, 
      step,
      hasPreviewThresholdImage: !!previewThresholdImage,
      isProcessing
    });
    
    // Only process if we're on threshold step, have a cropped image, and not currently processing
    if (step === 'threshold' && croppedImage && !isProcessing) {
      console.log('⏱️ Manual threshold change - setting timeout for 300ms');
      const timer = setTimeout(() => {
        console.log('🚀 Processing threshold after manual change with value:', thresholdValue);
        actions.processThreshold();
      }, 300);
      return () => {
        console.log('🧹 Clearing manual threshold processing timeout');
        clearTimeout(timer);
      };
    }
  }, [thresholdValue, step, croppedImage, actions]);

  // Log threshold step state
  useEffect(() => {
    if (step === 'threshold') {
      console.log('🖼️ Threshold step rendered with:', { 
        thresholdValue, 
        hasPreviewThresholdImage: !!previewThresholdImage, 
        isProcessing,
        hasCroppedImage: !!croppedImage
      });
    }
  }, [step, thresholdValue, previewThresholdImage, isProcessing, croppedImage]);

  // Determine the image to use for cropping
  const imageForCropping = backgroundRemovedImage || originalImage;

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center space-x-2">
          {step !== 'upload' && (
            <Button variant="ghost" className="text-white" size="sm" onClick={handleBack}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <div className="flex items-center space-x-2">
            {step === 'upload' && <Upload className="w-5 h-5 text-purple-600" />}
            {step === 'bg-removal' && <Scissors className="w-5 h-5 text-purple-600" />}
            {step === 'crop' && <CropIcon className="w-5 h-5 text-purple-600" />}
            {step === 'threshold' && <Sliders className="w-5 h-5 text-purple-600" />}
            {step === 'complete' && <Check className="w-5 h-5 text-green-600" />}
            
            <CardTitle className="text-lg">
              {step === 'upload' && 'Upload Image'}
              {step === 'bg-removal' && 'Background Removal'}
              {step === 'crop' && 'Crop Image'}
              {step === 'threshold' && 'Adjust Threshold'}
              {step === 'complete' && 'Image Ready'}
            </CardTitle>
          </div>
        </div>
        
        <Button variant="ghost" className="text-white" size="sm" onClick={handleCancel}>
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Upload Step */}
        {step === 'upload' && (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-purple-300 bg-purple-50' : 'border-gray-300 hover:bg-gray-50'
            }`}
          >
            <input {...getInputProps()} />
            <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-700 mb-2">
              {isDragActive ? 'Drop your image here' : 'Upload an image'}
            </p>
            <p className="text-sm text-gray-500">
              Drag and drop an image file, or click to browse
            </p>
            <Button className="mt-4 text-white" variant="secondary">
              <Upload className="w-4 h-4 mr-2" />
              Choose File
            </Button>
          </div>
        )}

        {/* Background Removal Step */}
        {step === 'bg-removal' && originalImage && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Original Image</h4>
                <img
                  src={originalImage}
                  alt="Original"
                  className="w-full h-48 object-contain border rounded"
                />
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2">Background Removed</h4>
                <div className="w-full h-48 border rounded flex items-center justify-center bg-gray-50 bg-[radial-gradient(circle_at_center,_transparent_1px,_#e5e7eb_1px)] bg-[length:10px_10px]">
                  {isProcessing ? (
                    <div className="flex flex-col items-center space-y-2">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-600"></div>
                      <div className="text-sm text-gray-600">
                        {isInitializingBgRemoval ? 'Loading model...' : 'Removing background...'}
                      </div>
                    </div>
                  ) : backgroundRemovedImage ? (
                    <img
                      src={backgroundRemovedImage}
                      alt="Background removed"
                      className="w-full h-full object-contain"
                    />
                  ) : error ? (
                    <div className="text-center p-4">
                      <div className="text-red-600 text-sm font-medium mb-2">
                        {error}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          actions.setError(null);
                          actions.processBackgroundRemoval();
                        }}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        Try Again
                      </Button>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">Click process to remove background</div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={actions.skipBackgroundRemoval}
                disabled={isProcessing}
              >
                Skip Background Removal
              </Button>
              <div className="space-x-2">
                {backgroundRemovedImage ? (
                  <Button 
                    onClick={() => actions.setStep('crop')}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    Continue to Crop
                  </Button>
                ) : (
                  <Button 
                    onClick={actions.processBackgroundRemoval}
                    disabled={isProcessing}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    <Scissors className="w-4 h-4 mr-2" />
                    Remove Background
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Crop Step */}
        {step === 'crop' && imageForCropping && (
          <div className="space-y-4">
            <div className="flex justify-center">
                <ReactCrop
                 crop={crop}
                 onChange={(_: Crop, percentCrop: Crop) => setCrop(percentCrop)}
                 onComplete={(c: PixelCrop) => setCompletedCrop(c)}
                 aspect={aspectRatio}
                 className="max-w-full max-h-96"
               >
                <img
                  ref={imgRef}
                  src={imageForCropping}
                  alt="Crop preview"
                  className="max-w-full max-h-96 object-contain"
                />
              </ReactCrop>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="secondary" className="text-white" onClick={() => actions.setStep('bg-removal')}>
                Back
              </Button>
              <Button 
                onClick={handleCropComplete}
                disabled={!completedCrop}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                Apply Crop
              </Button>
            </div>
          </div>
        )}

        {/* Threshold Step */}
        {step === 'threshold' && croppedImage && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Original</h4>
                <img
                  src={croppedImage}
                  alt="Cropped preview"
                  className="w-full h-48 object-contain border rounded"
                />
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2">Threshold</h4>
                <div className="w-full h-48 border rounded flex items-center justify-center bg-gray-50">
                  {isProcessing ? (
                    <div className="text-sm text-gray-500">Processing...</div>
                  ) : previewThresholdImage ? (
                    <img
                      src={previewThresholdImage}
                      alt="Threshold preview"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="text-sm text-gray-500">Adjust threshold</div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Threshold: {thresholdValue}
              </label>
              <div className="space-y-2">
                <Slider
                  value={[thresholdValue]}
                  onValueChange={handleThresholdChange}
                  max={255}
                  min={0}
                  step={1}
                  className="w-full"
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>0 (Dark)</span>
                <span>255 (Light)</span>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="secondary" className="text-white" onClick={() => actions.setStep('crop')}>
                Back
              </Button>
              <Button 
                onClick={handleConfirm}
                disabled={!previewThresholdImage || isProcessing}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Use This Image
              </Button>
            </div>
          </div>
        )}

        {/* Complete Step */}
        {step === 'complete' && thresholdImage && (
          <div className="text-center space-y-4">
            <div className="w-full max-w-sm mx-auto">
              <img
                src={thresholdImage}
                alt="Final processed image"
                className="w-full border rounded"
              />
            </div>
            <p className="text-sm text-gray-600">
              Image processed successfully! It will appear in the preview.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 