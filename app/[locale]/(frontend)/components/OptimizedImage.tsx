'use client';

import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import Image from 'next/image';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  fill?: boolean;
  width?: number;
  height?: number;
  priority?: boolean;
  sizes?: string;
  objectFit?: 'cover' | 'contain';
  onError?: () => void;
}

// R2 CDN URL（客户端环境变量）
const R2_CDN_URL = process.env.NEXT_PUBLIC_R2_CDN_URL || '';

// 使用 useLayoutEffect 在 SSR 时的安全版本
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * 优化的图片组件
 * - 支持懒加载和占位符
 * - 渐进式加载效果
 * - 自动处理不同来源的图片 URL
 * - 使用 Intersection Observer 优化加载
 */
export default function OptimizedImage({
  src,
  alt,
  className = '',
  fill = false,
  width,
  height,
  priority = false,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  objectFit = 'cover',
  onError,
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  // 默认设置为 true，让图片立即开始加载，而不是等待 IntersectionObserver
  const [isInView, setIsInView] = useState(true);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  // 使用 useIsomorphicLayoutEffect 确保尽早检测视口
  useIsomorphicLayoutEffect(() => {
    // priority 图片始终加载
    if (priority) return;

    // 立即检查元素是否在视口中
    if (imgRef.current) {
      const rect = imgRef.current.getBoundingClientRect();
      const isVisible = rect.top < window.innerHeight + 500 && rect.bottom > -500;
      if (isVisible) {
        setIsInView(true);
        return;
      }
    }

    // 对于视口外的图片，使用 IntersectionObserver 进行懒加载
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '500px', // 提前 500px 开始加载，让图片提前预加载
        threshold: 0,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [priority]);

  // 处理图片 URL，转换为可访问的格式
  const getOptimizedUrl = (url: string): string => {
    if (!url) return '';
    
    // 如果是本地相对路径 (./data/image/... 或 data/image/...)
    if (url.startsWith('./data/image') || url.startsWith('data/image')) {
      return `/api/local-image?path=${encodeURIComponent(url)}`;
    }
    
    // 如果是 R2 存储的图片（/api/images/ 开头）
    if (url.startsWith('/api/images/')) {
      // 解码 URL 获取 key
      let key = url.replace('/api/images/', '');
      if (key.includes('%2F') || key.includes('%2f')) {
        key = decodeURIComponent(key);
      }
      
      // 优先使用 R2 CDN 直连（更快）
      if (R2_CDN_URL) {
        return `${R2_CDN_URL}/${key}`;
      }
      return `/api/images/${key}`;
    }
    
    // 如果是 R2 公开 URL，直接返回（CDN 加速）
    if (url.includes('.r2.cloudflarestorage.com') || 
        url.includes('.r2.dev') ||
        (url.includes('images/') && !url.startsWith('http'))) {
      return url;
    }
    
    // 如果是外部 URL，使用代理绕过防盗链
    if (url.startsWith('http') || url.startsWith('//')) {
      const fullUrl = url.startsWith('//') ? `https:${url}` : url;
      return `/api/image-proxy?url=${encodeURIComponent(fullUrl)}`;
    }
    
    return url;
  };

  // 判断是否可以使用 Next.js Image 优化
  const canUseNextImage = (url: string): boolean => {
    // 排除 API 代理路径，这些路径不应该由 next/image 二次处理，直接由浏览器加载更稳定
    if (url.startsWith('/api/')) {
      return false;
    }
    // 本地图片可以直接优化
    if (url.startsWith('/') && !url.startsWith('//')) {
      return true;
    }
    // R2 CDN 直连可以使用 next/image 优化
    if (R2_CDN_URL && url.startsWith(R2_CDN_URL)) {
      return true;
    }
    // R2 公开 URL 可以
    if (url.includes('.r2.dev') || url.includes('.r2.cloudflarestorage.com')) {
      return true;
    }
    // 外部图片（已在 next.config.js 配置的域名）
    if (url.startsWith('https://cdn.nlark.com') ||
        url.includes('.qpic.cn') ||
        url.includes('.zhimg.com')) {
      return true;
    }
    return false;
  };

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  const optimizedSrc = getOptimizedUrl(src);
  const useNextImage = canUseNextImage(src);

  return (
    <div 
      ref={imgRef} 
      className={`relative overflow-hidden ${className}`}
      style={fill ? { width: '100%', height: '100%' } : { width, height }}
    >
      {/* 加载占位符 - 骨架屏动画 */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-gradient-to-r from-dark-800 via-dark-700 to-dark-800 animate-shimmer bg-[length:200%_100%]" />
      )}

      {/* 图片内容 */}
      {isInView && !hasError && (
        useNextImage ? (
          <Image
            src={optimizedSrc}
            alt={alt}
            fill={fill}
            width={!fill ? width : undefined}
            height={!fill ? height : undefined}
            sizes={sizes}
            priority={priority}
            className={`transition-opacity duration-500 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            } ${objectFit === 'contain' ? 'object-contain' : 'object-cover'}`}
            onLoad={handleLoad}
            onError={handleError}
            loading={priority ? 'eager' : 'lazy'}
          />
        ) : (
          // 使用原生 img 标签处理无法优化的图片
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={optimizedSrc}
            alt={alt}
            className={`w-full h-full transition-opacity duration-500 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            } ${objectFit === 'contain' ? 'object-contain' : 'object-cover'}`}
            loading={priority ? 'eager' : 'lazy'}
            referrerPolicy="no-referrer"
            onLoad={handleLoad}
            onError={handleError}
          />
        )
      )}

      {/* 错误状态 */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-dark-800">
          <svg
            className="w-10 h-10 text-dark-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
      )}
    </div>
  );
}

