import { promptRepository } from '@/repositories';
import { setRequestLocale } from 'next-intl/server';
import HomeClient from './HomeClient';
import { PaginatedResponse } from '@/services/prompt.service';
import { PromptItem } from '@/types';
import SeoJsonLd, { CollectionJsonLd } from '@/components/seo/JsonLd';

// Use ISR (Incremental Static Regeneration)
// 从环境变量获取缓存时间，Vercel 后台可配置 REVALIDATE_SECONDS
// 导入数据后会自动调用 revalidatePath 触发重新生成
export const revalidate = Number(process.env.REVALIDATE_SECONDS) || 60;

type Props = {
  params: Promise<{ locale: string }>;
};

// R2 CDN URL for image optimization
const R2_CDN_URL = process.env.NEXT_PUBLIC_R2_CDN_URL || '';

/**
 * 获取优化后的图片 URL（服务端版本）
 */
function getOptimizedImageUrl(url: string): string {
  if (!url) return '';
  
  // 如果是 R2 存储的图片（/api/images/ 开头）
  if (url.startsWith('/api/images/')) {
    let key = url.replace('/api/images/', '');
    if (key.includes('%2F') || key.includes('%2f')) {
      key = decodeURIComponent(key);
    }
    // 优先使用 R2 CDN 直连
    if (R2_CDN_URL) {
      return `${R2_CDN_URL}/${key}`;
    }
  }
  
  return url;
}

export default async function Home({ params }: Props) {
  const { locale } = await params;
  
  // Enable static rendering
  setRequestLocale(locale);

  // Read prompts from database using repository (Paginated: fetch first 20)
  // 添加优雅降级：构建时如果数据库不可用，返回空数据，运行时通过 ISR 获取真实数据
  let paginatedResult: {
    data: PromptItem[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  
  try {
    const result = await promptRepository.findAllPaginated(1, 20);
    paginatedResult = {
      data: result.data as unknown as PromptItem[],
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
    };
  } catch (error) {
    console.warn('[Home] Database unavailable during build, using empty data. ISR will fetch real data at runtime.');
    paginatedResult = {
      data: [],
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 0,
    };
  }
  
  const prompts = paginatedResult.data;

  // Transform PaginatedResult to PaginatedResponse for client component
  const initialPagination: PaginatedResponse<PromptItem> = {
    success: true,
    data: prompts as unknown as PromptItem[],
    pagination: {
      page: paginatedResult.page,
      pageSize: paginatedResult.pageSize,
      total: paginatedResult.total,
      totalPages: paginatedResult.totalPages,
      hasNext: paginatedResult.page < paginatedResult.totalPages,
      hasPrev: paginatedResult.page > 1
    }
  };

  // 预加载首屏前12张图片（服务端渲染时注入 link preload）
  const preloadImages = prompts
    .slice(0, 12)
    .map(p => getOptimizedImageUrl(p.imageUrl || ''))
    .filter(Boolean);

  // 准备结构化数据的集合项目
  const collectionItems = prompts.slice(0, 10).map(p => ({
    name: p.effect,
    description: p.description || p.prompt.slice(0, 160),
    image: p.imageUrl ? getOptimizedImageUrl(p.imageUrl) : undefined,
  }));

  const collectionName = locale === 'zh' 
    ? 'AI 提示词精选集' 
    : 'Curated AI Prompts Collection';
  
  const collectionDescription = locale === 'zh'
    ? '精选优质 AI 提示词，涵盖 Midjourney、Stable Diffusion、DALL-E 等主流模型'
    : 'Curated AI prompts covering Midjourney, Stable Diffusion, DALL-E and more';

  return (
    <>
      {/* JSON-LD 结构化数据 */}
      <SeoJsonLd locale={locale as 'zh' | 'en'} />
      <CollectionJsonLd 
        name={collectionName}
        description={collectionDescription}
        items={collectionItems}
        locale={locale as 'zh' | 'en'}
      />
      
      {/* 首屏图片预加载 - 服务端渲染时注入 */}
      {preloadImages.map((imgUrl, index) => (
        <link
          key={imgUrl}
          rel="preload"
          as="image"
          href={imgUrl}
          // 前6张最高优先级
          // @ts-expect-error fetchPriority is valid for link preload
          fetchpriority={index < 6 ? 'high' : 'low'}
        />
      ))}
      <HomeClient initialPrompts={prompts as unknown as PromptItem[]} initialPagination={initialPagination} />
    </>
  );
}
