
import fs from 'fs';
import path from 'path';

// 1. Define the 20 Global Tags
const TAGS = [
  "UI设计",
  "插画绘制",
  "海报设计",
  "数据可视化",
  "摄影艺术",
  "Logo设计",
  "教育科普",
  "编程开发",
  "文案写作",
  "市场营销",
  "游戏娱乐",
  "建筑设计",
  "时尚设计",
  "3D设计",
  "语言翻译",
  "商业办公",
  "动漫风格",
  "图标设计",
  "壁纸背景",
  "创意脑洞"
] as const;

type Tag = typeof TAGS[number];

// 2. Define Keyword Mappings (Heuristic)
const KEYWORDS: Record<Tag, string[]> = {
  "UI设计": ["UI", "界面", "interface", "app", "web", "网页", "大屏", "原型", "dashboard", "UX", "mobile", "website"],
  "插画绘制": ["插画", "illustration", "drawing", "绘本", "painting", "art", "sketch", "连环画", "comic", "book"],
  "海报设计": ["海报", "poster", "banner", "宣传", "flyer", "advertisement", "活动", "promotion"],
  "数据可视化": ["数据", "chart", "graph", "diagram", "visualization", "infographic", "图表", "分析图", "结构图", "原理图"],
  "摄影艺术": ["摄影", "photo", "camera", "portrait", "realistic", "写实", "lens", "shot", "dslr", "4k", "hd", "照片"],
  "Logo设计": ["logo", "icon", "symbol", "brand", "mark", "标志", "商标", "徽章"],
  "教育科普": ["科普", "education", "explain", "history", "teaching", "learn", "study", "diagram", "解释", "教程", "题", "answer"],
  "编程开发": ["code", "coding", "script", "function", "html", "css", "js", "python", "java", "api", "bug", "开发", "程序"],
  "文案写作": ["write", "writing", "article", "story", "poem", "text", "essay", "blog", "copy", "写作", "文章", "故事", "诗"],
  "市场营销": ["marketing", "seo", "social media", "ad", "campaign", "sales", "营销", "推广", "文案", "小红书"],
  "游戏娱乐": ["game", "gaming", "character", "map", "level", "sprite", "rpg", "游戏", "角色", "英雄联盟"],
  "建筑设计": ["architecture", "interior", "exterior", "building", "house", "room", "design", "建筑", "室内", "装修", "空间"],
  "时尚设计": ["fashion", "clothing", "dress", "jewelry", "accessory", "style", "outfit", "时尚", "服装", "穿搭"],
  "3D设计": ["3d", "render", "blender", "c4d", "model", "sculpt", "texture", "渲染", "三维", "模型"],
  "语言翻译": ["translate", "translation", "language", "english", "chinese", "japanese", "翻译", "英语", "中文"],
  "商业办公": ["business", "resume", "plan", "presentation", "ppt", "report", "analysis", "商业", "简历", "汇报", "办公"],
  "动漫风格": ["anime", "manga", "cartoon", "chibi", "comic", "动漫", "二次元", "卡通"],
  "图标设计": ["icon", "vector", "svg", "glyph", "symbol", "图标", "矢量"],
  "壁纸背景": ["wallpaper", "background", "landscape", "scenery", "view", "desktop", "phone", "壁纸", "背景", "风景"],
  "创意脑洞": ["creative", "abstract", "surreal", "funny", "meme", "idea", "concept", "创意", "脑洞", "艺术"]
};

// 3. Helper to score tags
function getTags(text: string): Tag[] {
  const lowerText = text.toLowerCase();
  const scores: { tag: Tag, score: number }[] = [];

  for (const tag of TAGS) {
    let score = 0;
    const keywords = KEYWORDS[tag];
    for (const kw of keywords) {
      if (lowerText.includes(kw.toLowerCase())) {
        score += 1;
      }
    }
    if (score > 0) {
      scores.push({ tag, score });
    }
  }

  // Sort by score desc
  scores.sort((a, b) => b.score - a.score);

  // If no matches, verify if text looks like code or specific things, else default
  if (scores.length === 0) {
    // Simple fallbacks
    if (lowerText.length < 20) return ["创意脑洞"];
    return ["创意脑洞"];
  }

  // Take top 1-3
  const count = Math.min(Math.floor(Math.random() * 3) + 1, scores.length); // Randomly 1-3 if enough matches? 
  // Better: Take top 1. If others have close scores (within 50% of top), take them too, up to 3.
  
  const topScore = scores[0].score;
  const result: Tag[] = [scores[0].tag];
  
  for (let i = 1; i < scores.length && result.length < 3; i++) {
    if (scores[i].score >= topScore * 0.5) {
      result.push(scores[i].tag);
    }
  }

  return result;
}

// 4. Main Execution
const DATA_PATH = path.join(process.cwd(), 'data', 'prompts.json');

async function main() {
  try {
    const rawData = fs.readFileSync(DATA_PATH, 'utf-8');
    const prompts = JSON.parse(rawData);

    if (!Array.isArray(prompts)) {
      throw new Error("Data is not an array");
    }

    console.log(`Processing ${prompts.length} prompts...`);

    let updatedCount = 0;

    const newPrompts = prompts.map((item: any) => {
      const textToAnalyze = `${item.prompt || ''} ${item.description || ''} ${item.effect || ''}`;
      const newTags = getTags(textToAnalyze);
      
      // Update tags
      item.tags = newTags;
      
      // Ensure other fields are preserved
      return item;
    });

    fs.writeFileSync(DATA_PATH, JSON.stringify(newPrompts, null, 2), 'utf-8');
    
    console.log(`Successfully updated ${newPrompts.length} prompts with normalized tags.`);
    console.log("Sample updates:");
    newPrompts.slice(0, 5).forEach((p: any) => {
      console.log(`[${p.effect}] -> ${p.tags.join(', ')}`);
    });

  } catch (error) {
    console.error("Error processing file:", error);
  }
}

main();

