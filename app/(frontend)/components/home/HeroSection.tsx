'use client';

/**
 * HeroSection Component
 * Displays the main hero section with title and description
 */

export default function HeroSection() {
  return (
    <div className="text-center mb-12 space-y-4">
      <h2 className="text-4xl md:text-5xl font-bold text-white animate-float tracking-tight drop-shadow-xl">
        探索无限创意
      </h2>
      <p className="text-gray-400 text-lg max-w-2xl mx-auto font-light">
        精选优质 AI 提示词，激发你的创作灵感
      </p>
    </div>
  );
}

