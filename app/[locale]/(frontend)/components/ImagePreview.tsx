'use client';

import { useEffect, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import OptimizedImage from './OptimizedImage';

interface ImagePreviewProps {
  src: string;
  alt: string;
  isModalOpen: boolean;
  onCloseModal: () => void;
  // Hover props are deprecated/removed for performance, but keeping optional to avoid breaking if passed
  isHovering?: boolean;
  hoverPosition?: { x: number; y: number };
}

export default function ImagePreview({
  src,
  alt,
  isModalOpen,
  onCloseModal,
}: ImagePreviewProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

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

  if (!mounted || !isModalOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center transition-opacity duration-300"
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
        className="relative w-[95vw] h-[95vh] animate-scale-in flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative w-full h-full bg-dark-800 rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Low-res placeholder (Cached from card) - Instant Display */}
            <div className="absolute inset-0 flex items-center justify-center">
              <OptimizedImage
                src={src}
                alt={alt}
                fill
                className="object-contain blur-md opacity-50 scale-105"
                sizes="400px"
                objectFit="contain"
                priority
              />
            </div>
            
            {/* High-res Full Image */}
            <div className="relative w-full h-full z-10">
              <OptimizedImage
                src={src}
                alt={alt}
                fill
                className="object-contain"
                objectFit="contain"
                sizes="95vw"
                priority
              />
            </div>
          </div>
          {/* Image caption */}
          {alt && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 pointer-events-none z-20">
              <p className="text-white text-sm font-medium">{alt}</p>
            </div>
          )}
        </div>
      </div>

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
    </div>,
    document.body
  );
}