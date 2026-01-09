'use client';

import { useState, useEffect, useRef, useLayoutEffect, useMemo } from 'react';
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

// 全局图片加载缓存 - 记录已加载的图片，避免重复动画
const loadedImages = new Set<string>();

/**
 * 优化的图片组件
 * - 支持懒加载和占位符
 * - 极速渐进式加载效果（100ms 过渡）
 * - 自动处理不同来源的图片 URL
 * - 使用 Intersection Observer 优化加载
 * - 缓存已加载图片状态，避免闪烁
 * - 支持图片代理失败时自动回退到原图
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
  // Use src for key, not optimizedSrc since it changes
  const alreadyLoaded = loadedImages.has(src);

  // priority 图片或已加载过的图片跳过加载动画
  const [isLoaded, setIsLoaded] = useState(alreadyLoaded);
  // priority 图片立即在视口中，其他图片默认也是 true 以便快速开始加载
  const [isInView, setIsInView] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryWithOriginal, setRetryWithOriginal] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  // 处理图片 URL - 提前计算避免重复
  const optimizedSrc = useMemo(() => {
    if (!src) return '';
    
    // 如果重试原图，直接返回原链接
    if (retryWithOriginal && (src.startsWith('http') || src.startsWith('//'))) {
      return src;
    }
    
    // 如果是本地相对路径 (./data/image/... 或 data/image/...)
    if (src.startsWith('./data/image') || src.startsWith('data/image')) {
      return `/api/local-image?path=${encodeURIComponent(src)}`;
    }
    
    // 如果是 R2 存储的图片（/api/images/ 开头）
    if (src.startsWith('/api/images/')) {
      let key = src.replace('/api/images/', '');
      if (key.includes('%2F') || key.includes('%2f')) {
        key = decodeURIComponent(key);
      }
      // 优先使用 R2 CDN 直连（更快）
      if (R2_CDN_URL) {
        // 移除可能存在的开头的斜杠，避免双重斜杠
        const cleanKey = key.startsWith('/') ? key.slice(1) : key;
        return `${R2_CDN_URL}/${cleanKey}`;
      }
      return `/api/images/${key}`;
    }
    
    // 如果是 R2 公开 URL (r2.dev 或 r2.cloudflarestorage.com)，尝试替换为自定义 CDN
    if (src.includes('.r2.cloudflarestorage.com') || src.includes('.r2.dev')) {
      if (R2_CDN_URL) {
        try {
          // 提取路径部分
          const urlObj = new URL(src);
          const path = urlObj.pathname;
          // 移除开头的斜杠
          const cleanPath = path.startsWith('/') ? path.slice(1) : path;
          return `${R2_CDN_URL}/${cleanPath}`;
        } catch (e) {
          // 如果解析失败，返回原链接
          return src;
        }
      }
      return src;
    }

    // 其他 images/ 路径处理
    if (src.includes('images/') && !src.startsWith('http')) {
      return src;
    }
    
    // 如果是外部 URL，使用代理绕过防盗链
    if (src.startsWith('http') || src.startsWith('//')) {
      const fullUrl = src.startsWith('//') ? `https:${src}` : src;
      return `/api/image-proxy?url=${encodeURIComponent(fullUrl)}`;
    }
    
    return src;
  }, [src, retryWithOriginal]);

  // 判断是否可以使用 Next.js Image 优化
  const useNextImage = useMemo(() => {
    // 允许 API 代理路径使用 Next.js Image 优化
    // Next.js Image 会调用这些 API 获取原图并进行压缩/格式转换
    if (src.startsWith('/api/')) {
      return true;
    }
    // 本地图片可以直接优化
    if (src.startsWith('/') && !src.startsWith('//')) {
      return true;
    }
    // R2 CDN 直连可以使用 next/image 优化
    if (R2_CDN_URL && optimizedSrc.startsWith(R2_CDN_URL)) {
      return true;
    }
    // R2 公开 URL 可以
    if (src.includes('.r2.dev') || src.includes('.r2.cloudflarestorage.com')) {
      return true;
    }
    // 外部图片（已在 next.config.js 配置的域名）
    if (src.startsWith('https://cdn.nlark.com') ||
        src.includes('.qpic.cn') ||
        src.includes('.zhimg.com')) {
      return true;
    }
    return false;
  }, [src, optimizedSrc]);

  // 使用 useIsomorphicLayoutEffect 确保尽早检测视口（仅用于非优先图片的懒加载）
  useIsomorphicLayoutEffect(() => {
    // priority 图片始终立即加载
    if (priority) return;

    // 立即检查元素是否在视口中
    if (imgRef.current) {
      const rect = imgRef.current.getBoundingClientRect();
      // 放大检测范围到 600px，让图片更早开始加载
      const isVisible = rect.top < window.innerHeight + 600 && rect.bottom > -100;
      if (isVisible) {
        setIsInView(true);
        return;
      }
      // 不在视口中时设为 false，等待 IntersectionObserver
      setIsInView(false);
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
        rootMargin: '600px', // 提前 600px 开始加载
        threshold: 0,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [priority]);

  const handleLoad = () => {
    setIsLoaded(true);
    // 缓存已加载的图片
    loadedImages.add(src);
  };

  const handleError = () => {
    // 如果是代理链接加载失败，且尚未重试，尝试回退到原图
    if (!retryWithOriginal && (src.startsWith('http') || src.startsWith('//'))) {
      setRetryWithOriginal(true);
      setIsLoaded(false);
      setHasError(false);
      return;
    }

    setHasError(true);
    onError?.();
  };

  // Priority 图片不需要任何过渡效果，直接显示
  const imageClassName = priority
    ? `${objectFit === 'contain' ? 'object-contain' : 'object-cover'}`
    : `transition-opacity duration-150 ${isLoaded ? 'opacity-100' : 'opacity-0'} ${objectFit === 'contain' ? 'object-contain' : 'object-cover'}`;

  return (
    <div 
      ref={imgRef} 
      className={`relative overflow-hidden ${className}`}
      style={fill ? { width: '100%', height: '100%' } : { width, height }}
    >
      {/* 骨架屏加载效果 - 所有未加载完成的图片都显示 */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-muted/20">
           <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent bg-[length:200%_100%] animate-shimmer" />
        </div>
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
            className={imageClassName}
            onLoad={handleLoad}
            onError={handleError}
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'}
          />
        ) : (
          // 使用原生 img 标签处理无法优化的图片
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={optimizedSrc}
            alt={alt}
            className={`w-full h-full ${imageClassName}`}
            loading={priority ? 'eager' : 'lazy'}
            // @ts-expect-error fetchpriority is a valid HTML attribute
            fetchpriority={priority ? 'high' : 'auto'}
            decoding={priority ? 'sync' : 'async'}
            referrerPolicy="no-referrer"
            onLoad={handleLoad}
            onError={handleError}
          />
        )
      )}

      {/* 错误状态 */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
          <svg
            className="w-10 h-10 text-muted-foreground/30"
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
