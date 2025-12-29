import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'AI 提示词库 - 发现无限创意可能';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #0f0f23 100%)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* 背景装饰 */}
        <div
          style={{
            position: 'absolute',
            top: '10%',
            left: '10%',
            width: '300px',
            height: '300px',
            background: 'radial-gradient(circle, rgba(255,215,0,0.15) 0%, transparent 70%)',
            borderRadius: '50%',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            right: '10%',
            width: '400px',
            height: '400px',
            background: 'radial-gradient(circle, rgba(147,112,219,0.15) 0%, transparent 70%)',
            borderRadius: '50%',
          }}
        />

        {/* Logo 区域 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '40px',
          }}
        >
          <div
            style={{
              width: '80px',
              height: '80px',
              background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '40px',
            }}
          >
            ✨
          </div>
        </div>

        {/* 主标题 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px',
          }}
        >
          <div
            style={{
              fontSize: '72px',
              fontWeight: 'bold',
              background: 'linear-gradient(90deg, #FFD700, #FFA500, #FFD700)',
              backgroundClip: 'text',
              color: 'transparent',
              textAlign: 'center',
            }}
          >
            AI 提示词库
          </div>
          <div
            style={{
              fontSize: '36px',
              color: '#a0a0c0',
              textAlign: 'center',
              maxWidth: '800px',
            }}
          >
            全球精选 10000+ AI 绘画、视频、音频提示词
          </div>
        </div>

        {/* 标签 */}
        <div
          style={{
            display: 'flex',
            gap: '20px',
            marginTop: '50px',
          }}
        >
          {['Midjourney', 'Stable Diffusion', 'DALL-E', 'Sora'].map((tag) => (
            <div
              key={tag}
              style={{
                padding: '12px 24px',
                background: 'rgba(255, 215, 0, 0.1)',
                border: '1px solid rgba(255, 215, 0, 0.3)',
                borderRadius: '30px',
                color: '#FFD700',
                fontSize: '20px',
              }}
            >
              {tag}
            </div>
          ))}
        </div>

        {/* 网址 */}
        <div
          style={{
            position: 'absolute',
            bottom: '40px',
            fontSize: '24px',
            color: '#606080',
          }}
        >
          www.topai.ink
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
