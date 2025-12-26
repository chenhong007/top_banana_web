'use client';

import { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import OptimizedImage from './OptimizedImage';

interface ImagePreviewProps {
  src: string;
  alt: string;
  isHovering: boolean;
  isModalOpen: boolean;
  onCloseModal: () => void;
  hoverPosition?: { x: number; y: number };
}

export default function ImagePreview({
  src,
  alt,
  isHovering,
  isModalOpen,
  onCloseModal,
  hoverPosition,
}: ImagePreviewProps) {
  // Handle ESC key to close modal
  const handleEscKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && isModalOpen) {
      onCloseModal();
    }
  }, [isModalOpen, onCloseModal]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleEscKey);
    } else {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleEscKey);
    }

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isModalOpen, handleEscKey]);

  return (
    <>
      {/* Hover Overlay Preview */}
      {isHovering && !isModalOpen && (
        <div
          className="fixed pointer-events-none z-50 transition-opacity duration-300"
          style={{
            left: hoverPosition?.x ? `${hoverPosition.x}px` : '50%',
            top: hoverPosition?.y ? `${hoverPosition.y}px` : '50%',
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className="relative bg-dark-800 rounded-xl shadow-2xl border border-white/10 overflow-hidden backdrop-blur-xl">
            <div className="relative" style={{ width: '500px', maxWidth: '90vw' }}>
              <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
                <OptimizedImage
                  src={src}
                  alt={alt}
                  fill
                  className="w-full h-full"
                  sizes="500px"
                  priority
                />
              </div>
              {/* Subtle glow effect */}
              <div className="absolute inset-0 bg-gradient-to-t from-dark-900/50 to-transparent pointer-events-none" />
            </div>
          </div>
        </div>
      )}

      {/* Full Modal Preview */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center transition-opacity duration-300"
          onClick={onCloseModal}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" />

          {/* Close button */}
          <button
            onClick={onCloseModal}
            className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all duration-200 backdrop-blur-sm z-10 group"
            aria-label="Close preview"
          >
            <X className="w-6 h-6 text-white group-hover:rotate-90 transition-transform duration-300" />
          </button>

          {/* Image container */}
          <div
            className="relative max-w-[1200px] max-h-[90vh] w-[80vw] animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative bg-dark-800 rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
              <div className="relative w-full h-full">
                <OptimizedImage
                  src={src}
                  alt={alt}
                  width={1200}
                  height={800}
                  className="w-full h-auto max-h-[85vh] object-contain"
                  sizes="80vw"
                  priority
                />
              </div>
              {/* Image caption */}
              {alt && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                  <p className="text-white text-sm font-medium">{alt}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }
      `}</style>
    </>
  );
}

