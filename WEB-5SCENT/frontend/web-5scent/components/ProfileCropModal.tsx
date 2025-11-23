'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, Move } from 'lucide-react';
import { Dialog } from '@headlessui/react';

interface ProfileCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  onSave: (croppedImage: string) => void;
}

export default function ProfileCropModal({ isOpen, onClose, imageSrc, onSave }: ProfileCropModalProps) {
  const [zoom, setZoom] = useState(100);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [maxZoom, setMaxZoom] = useState(200);
  const [minZoom, setMinZoom] = useState(50);
  const [displayedSize, setDisplayedSize] = useState({ width: 0, height: 0 });
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const CROP_SIZE = 200; // Circular crop size in pixels
  const PREVIEW_SIZE = 112; // Preview circle size (w-28 h-28 = 112px)

  // Calculate max zoom and displayed size based on image size - ensure minimum zoom fills the crop circle
  useEffect(() => {
    if (imageRef.current && imageLoaded && containerRef.current) {
      const img = imageRef.current;
      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const containerHeight = containerRect.height;
      
      // Calculate the scale needed to fill the crop circle (cover behavior)
      const imageAspect = img.naturalWidth / img.naturalHeight;
      const containerAspect = containerWidth / containerHeight;
      
      // Calculate minimum zoom to fill the crop circle (cover)
      let minZoomToFill: number;
      if (imageAspect > containerAspect) {
        // Image is wider - need to fit height
        minZoomToFill = (CROP_SIZE / img.naturalHeight) * 100 * (containerHeight / CROP_SIZE);
      } else {
        // Image is taller - need to fit width
        minZoomToFill = (CROP_SIZE / img.naturalWidth) * 100 * (containerWidth / CROP_SIZE);
      }
      
      // Set min zoom to ensure crop circle is always filled
      const calculatedMinZoom = Math.max(50, Math.ceil(minZoomToFill * 0.9));
      const calculatedMaxZoom = Math.min(200, Math.max(calculatedMinZoom + 50, 150));
      
      setMaxZoom(calculatedMaxZoom);
      setMinZoom(calculatedMinZoom);
      
      // Set initial zoom to fill crop area nicely
      const initialZoom = Math.max(calculatedMinZoom, Math.min(100, Math.ceil(minZoomToFill * 1.1)));
      setZoom(initialZoom);
      
      // Calculate initial displayed size
      updateDisplayedSize(initialZoom);
    }
  }, [imageLoaded, imageSize]);

  // Update displayed size based on zoom - maintains aspect ratio
  const updateDisplayedSize = useCallback((zoomValue: number) => {
    if (!imageRef.current || !containerRef.current || !imageLoaded) return;
    
    const img = imageRef.current;
    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;
    
    const imageAspect = img.naturalWidth / img.naturalHeight;
    const containerAspect = containerWidth / containerHeight;
    
    // Calculate displayed dimensions maintaining aspect ratio
    let width: number;
    let height: number;
    
    if (imageAspect > containerAspect) {
      // Image is wider - width is limiting factor
      width = containerWidth * (zoomValue / 100);
      height = width / imageAspect;
    } else {
      // Image is taller - height is limiting factor
      height = containerHeight * (zoomValue / 100);
      width = height * imageAspect;
    }
    
    setDisplayedSize({ width, height });
  }, [imageLoaded]);

  // Update displayed size when zoom changes
  useEffect(() => {
    if (imageLoaded) {
      updateDisplayedSize(zoom);
    }
  }, [zoom, imageLoaded, updateDisplayedSize]);

  // Update preview canvas with proper aspect ratio
  useEffect(() => {
    if (!previewCanvasRef.current || !imageRef.current || !imageLoaded) return;
    
    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = imageRef.current;
    if (!ctx) return;

    canvas.width = PREVIEW_SIZE;
    canvas.height = PREVIEW_SIZE;

    // Clear canvas
    ctx.clearRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);

    // Create circular clipping path
    ctx.beginPath();
    ctx.arc(PREVIEW_SIZE / 2, PREVIEW_SIZE / 2, PREVIEW_SIZE / 2, 0, Math.PI * 2);
    ctx.clip();

    // Calculate the crop area in the displayed image
    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const imgRect = img.getBoundingClientRect();
    
    // Calculate displayed image dimensions
    const displayedWidth = imgRect.width;
    const displayedHeight = imgRect.height;
    
    // Crop circle center in container coordinates
    const cropCenterX = containerRect.width / 2;
    const cropCenterY = containerRect.height / 2;
    const cropRadius = CROP_SIZE / 2;
    
    // Calculate crop area in displayed image coordinates
    const cropLeftInDisplay = cropCenterX - cropRadius - (imgRect.left - containerRect.left);
    const cropTopInDisplay = cropCenterY - cropRadius - (imgRect.top - containerRect.top);
    
    // Convert to original image coordinates
    const scaleX = img.naturalWidth / displayedWidth;
    const scaleY = img.naturalHeight / displayedHeight;
    
    const sourceX = cropLeftInDisplay * scaleX;
    const sourceY = cropTopInDisplay * scaleY;
    const sourceSize = CROP_SIZE * scaleX;
    
    // Calculate source region maintaining aspect ratio (cover behavior)
    const imageAspect = img.naturalWidth / img.naturalHeight;
    let actualSourceX = sourceX;
    let actualSourceY = sourceY;
    let actualSourceWidth = sourceSize;
    let actualSourceHeight = sourceSize;
    
    // Adjust to maintain aspect ratio - use cover behavior
    if (imageAspect > 1) {
      // Image is wider - fit height, crop width
      actualSourceHeight = sourceSize;
      actualSourceWidth = sourceSize * imageAspect;
      actualSourceX = sourceX - (actualSourceWidth - sourceSize) / 2;
    } else {
      // Image is taller - fit width, crop height
      actualSourceWidth = sourceSize;
      actualSourceHeight = sourceSize / imageAspect;
      actualSourceY = sourceY - (actualSourceHeight - sourceSize) / 2;
    }
    
    // Clamp to image bounds
    actualSourceX = Math.max(0, Math.min(actualSourceX, img.naturalWidth - actualSourceWidth));
    actualSourceY = Math.max(0, Math.min(actualSourceY, img.naturalHeight - actualSourceHeight));
    actualSourceWidth = Math.min(actualSourceWidth, img.naturalWidth - actualSourceX);
    actualSourceHeight = Math.min(actualSourceHeight, img.naturalHeight - actualSourceY);
    
    // Draw the cropped portion with cover behavior - render at preview size
    ctx.drawImage(
      img,
      actualSourceX,
      actualSourceY,
      actualSourceWidth,
      actualSourceHeight,
      0,
      0,
      PREVIEW_SIZE,
      PREVIEW_SIZE
    );
  }, [zoom, position, imageLoaded, imageSize]);

  const handleImageLoad = () => {
    if (imageRef.current) {
      setImageSize({
        width: imageRef.current.naturalWidth,
        height: imageRef.current.naturalHeight,
      });
      setImageLoaded(true);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  // Calculate position constraints based on zoom and image size
  const getPositionConstraints = useCallback((zoomValue?: number) => {
    if (!imageRef.current || !containerRef.current || !imageLoaded) {
      return { maxX: 0, maxY: 0 };
    }
    
    const img = imageRef.current;
    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const currentZoom = zoomValue ?? zoom;
    
    // Calculate displayed image size based on zoom
    const baseWidth = img.naturalWidth;
    const baseHeight = img.naturalHeight;
    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;
    
    // Calculate how the image fits in the container at current zoom
    const imageAspect = baseWidth / baseHeight;
    const containerAspect = containerWidth / containerHeight;
    
    let displayedWidth: number;
    let displayedHeight: number;
    
    if (imageAspect > containerAspect) {
      // Image is wider - width is limiting factor
      displayedWidth = containerWidth * (currentZoom / 100);
      displayedHeight = displayedWidth / imageAspect;
    } else {
      // Image is taller - height is limiting factor
      displayedHeight = containerHeight * (currentZoom / 100);
      displayedWidth = displayedHeight * imageAspect;
    }
    
    const maxX = Math.max(0, (displayedWidth - CROP_SIZE) / 2);
    const maxY = Math.max(0, (displayedHeight - CROP_SIZE) / 2);
    
    return { maxX, maxY };
  }, [zoom, imageLoaded]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current || !imageRef.current) return;
    
    const { maxX, maxY } = getPositionConstraints();
    
    let newX = e.clientX - dragStart.x;
    let newY = e.clientY - dragStart.y;
    
    // Constrain to keep crop area within image bounds
    newX = Math.max(-maxX, Math.min(maxX, newX));
    newY = Math.max(-maxY, Math.min(maxY, newY));
    
    setPosition({ x: newX, y: newY });
  }, [isDragging, dragStart, getPositionConstraints]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Attach mouse event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newZoom = Number(e.target.value);
    const oldZoom = zoom;
    setZoom(newZoom);
    
    // Adjust position to keep crop area within bounds after zoom change
    const zoomRatio = newZoom / oldZoom;
    const { maxX, maxY } = getPositionConstraints(newZoom);
    
    setPosition(prev => ({
      x: Math.max(-maxX, Math.min(maxX, prev.x * zoomRatio)),
      y: Math.max(-maxY, Math.min(maxY, prev.y * zoomRatio)),
    }));
  };

  const handleZoomIn = () => {
    const newZoom = Math.min(maxZoom, zoom + 10);
    const oldZoom = zoom;
    setZoom(newZoom);
    
    const zoomRatio = newZoom / oldZoom;
    const { maxX, maxY } = getPositionConstraints(newZoom);
    
    setPosition(prev => ({
      x: Math.max(-maxX, Math.min(maxX, prev.x * zoomRatio)),
      y: Math.max(-maxY, Math.min(maxY, prev.y * zoomRatio)),
    }));
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(minZoom, zoom - 10);
    const oldZoom = zoom;
    setZoom(newZoom);
    
    const zoomRatio = newZoom / oldZoom;
    const { maxX, maxY } = getPositionConstraints(newZoom);
    
    setPosition(prev => ({
      x: Math.max(-maxX, Math.min(maxX, prev.x * zoomRatio)),
      y: Math.max(-maxY, Math.min(maxY, prev.y * zoomRatio)),
    }));
  };

  const handleResetPosition = () => {
    setPosition({ x: 0, y: 0 });
    if (imageRef.current && containerRef.current) {
      const img = imageRef.current;
      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();
      const containerSize = Math.min(containerRect.width, containerRect.height);
      
      const imageAspect = img.naturalWidth / img.naturalHeight;
      let minZoomToFill: number;
      if (imageAspect > 1) {
        minZoomToFill = (CROP_SIZE / img.naturalHeight) * 100 * (containerSize / CROP_SIZE);
      } else {
        minZoomToFill = (CROP_SIZE / img.naturalWidth) * 100 * (containerSize / CROP_SIZE);
      }
      
      const initialZoom = Math.max(minZoom, Math.min(100, Math.ceil(minZoomToFill * 1.1)));
      setZoom(initialZoom);
    }
  };

  const handleSave = () => {
    // Create a canvas to crop the image
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx || !imageRef.current || !containerRef.current || !imageLoaded) return;

    const img = imageRef.current;
    canvas.width = CROP_SIZE;
    canvas.height = CROP_SIZE;

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const imgRect = imageRef.current.getBoundingClientRect();
    
    // Get actual displayed image dimensions
    const displayedWidth = imgRect.width;
    const displayedHeight = imgRect.height;
    
    // Calculate the crop circle center in container coordinates
    const cropCenterX = containerRect.width / 2;
    const cropCenterY = containerRect.height / 2;
    const cropRadius = CROP_SIZE / 2;
    
    // Calculate the crop area in displayed image coordinates
    const cropLeftInDisplay = cropCenterX - cropRadius - (imgRect.left - containerRect.left);
    const cropTopInDisplay = cropCenterY - cropRadius - (imgRect.top - containerRect.top);
    
    // Convert to original image coordinates
    const scaleX = img.naturalWidth / displayedWidth;
    const scaleY = img.naturalHeight / displayedHeight;
    
    const sourceX = cropLeftInDisplay * scaleX;
    const sourceY = cropTopInDisplay * scaleY;
    const sourceSize = CROP_SIZE * scaleX;
    
    // Calculate source region with cover behavior to maintain aspect ratio
    const imageAspect = img.naturalWidth / img.naturalHeight;
    let actualSourceX = sourceX;
    let actualSourceY = sourceY;
    let actualSourceWidth = sourceSize;
    let actualSourceHeight = sourceSize;
    
    if (imageAspect > 1) {
      // Image is wider - fit height, crop width
      actualSourceHeight = sourceSize;
      actualSourceWidth = sourceSize * imageAspect;
      actualSourceX = sourceX - (actualSourceWidth - sourceSize) / 2;
    } else {
      // Image is taller - fit width, crop height
      actualSourceWidth = sourceSize;
      actualSourceHeight = sourceSize / imageAspect;
      actualSourceY = sourceY - (actualSourceHeight - sourceSize) / 2;
    }
    
    // Clamp to image bounds
    actualSourceX = Math.max(0, Math.min(actualSourceX, img.naturalWidth - actualSourceWidth));
    actualSourceY = Math.max(0, Math.min(actualSourceY, img.naturalHeight - actualSourceHeight));
    actualSourceWidth = Math.min(actualSourceWidth, img.naturalWidth - actualSourceX);
    actualSourceHeight = Math.min(actualSourceHeight, img.naturalHeight - actualSourceY);
    
    // Draw circular mask
    ctx.beginPath();
    ctx.arc(CROP_SIZE / 2, CROP_SIZE / 2, CROP_SIZE / 2, 0, Math.PI * 2);
    ctx.clip();
    
    // Draw image with cover behavior
    ctx.drawImage(
      img,
      actualSourceX,
      actualSourceY,
      actualSourceWidth,
      actualSourceHeight,
      0,
      0,
      CROP_SIZE,
      CROP_SIZE
    );

    // Convert to blob and create object URL - preserve original format
    const mimeType = imageSrc.startsWith('data:') 
      ? imageSrc.split(';')[0].split(':')[1] 
      : 'image/png';
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        onSave(url);
        onClose();
      }
    }, mimeType === 'image/jpeg' ? 'image/jpeg' : 'image/png');
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      {/* Dark Overlay */}
      <div className="fixed inset-0 bg-black/60" aria-hidden="true" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <Dialog.Title className="text-2xl font-header font-bold text-gray-900">
                Crop Profile Photo
              </Dialog.Title>
              <p className="text-sm text-gray-600 mt-1 flex items-center gap-2">
                <Move className="w-4 h-4" />
                Drag the image to position it, then adjust the zoom to fit
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Image Cropping Area */}
          <div className="flex-1 p-6 flex items-center justify-center bg-gray-50">
            <div
              ref={containerRef}
              className="relative w-full max-w-md h-96 bg-gray-100 rounded-lg overflow-hidden"
              style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
            >
              {/* Image */}
              <img
                ref={imageRef}
                src={imageSrc}
                alt="Profile crop"
                className="absolute select-none z-0"
                style={{
                  width: displayedSize.width > 0 ? `${displayedSize.width}px` : 'auto',
                  height: displayedSize.height > 0 ? `${displayedSize.height}px` : 'auto',
                  maxWidth: 'none',
                  maxHeight: 'none',
                  objectFit: 'contain',
                  left: '50%',
                  top: '50%',
                  transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
                  transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                }}
                onMouseDown={handleMouseDown}
                onLoad={handleImageLoad}
                draggable={false}
              />

              {/* Dark overlay outside crop circle */}
              <div 
                className="absolute inset-0 z-20 pointer-events-none"
                style={{
                  background: 'radial-gradient(circle at center, transparent 100px, rgba(0, 0, 0, 0.5) 100px)'
                }}
              />

              {/* Circular Crop Overlay - Above image */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                <div className="w-[200px] h-[200px] rounded-full border-4 border-white shadow-2xl" />
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="p-6 border-t border-gray-200 bg-white">
            <div className="flex items-start gap-6 mb-6">
              {/* Preview Section */}
              <div className="flex flex-col gap-2">
                <span className="text-sm text-gray-700 font-medium">Preview</span>
                <div className="w-28 h-28 rounded-full bg-gray-100 overflow-hidden border-2 border-gray-300 flex items-center justify-center relative">
                  <canvas
                    ref={previewCanvasRef}
                    className="w-full h-full"
                    style={{ display: imageLoaded ? 'block' : 'none' }}
                  />
                  {!imageLoaded && (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                      <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
              </div>

              {/* Zoom Section - Compact */}
              <div className="flex-1 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 font-medium">Zoom</span>
                  <span className="text-sm text-gray-600 font-medium">{zoom}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleZoomOut}
                    className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <input
                    type="range"
                    min={minZoom}
                    max={maxZoom}
                    value={zoom}
                    onChange={handleZoomChange}
                    className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
                    style={{
                      background: `linear-gradient(to right, #000 0%, #000 ${((zoom - minZoom) / (maxZoom - minZoom)) * 100}%, #e5e7eb ${((zoom - minZoom) / (maxZoom - minZoom)) * 100}%, #e5e7eb 100%)`
                    }}
                  />
                  <button
                    onClick={handleZoomIn}
                    className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </div>
                {/* Reset Position Button - below slider, compact */}
                <button
                  onClick={handleResetPosition}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors font-medium text-xs w-full"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset Position
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex-1 px-6 py-2.5 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors"
              >
                Save Photo
              </button>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
