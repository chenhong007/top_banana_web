#!/bin/bash
# Deploy script for GitHub Pages (manual deployment)

set -e

echo "🚀 开始部署到 GitHub Pages..."

# Check if git is initialized
if [ ! -d .git ]; then
  echo "❌ 错误：当前目录不是 Git 仓库"
  exit 1
fi

# Build the site
echo "📦 构建静态页面..."
npm run build:frontend

# Check if build succeeded
if [ ! -d out ]; then
  echo "❌ 构建失败：out 目录不存在"
  exit 1
fi

# Add .nojekyll file
echo "📝 添加 .nojekyll 文件..."
touch out/.nojekyll

# Store current branch
CURRENT_BRANCH=$(git branch --show-current)

# Check if gh-pages branch exists
if git show-ref --verify --quiet refs/heads/gh-pages; then
  echo "📌 切换到 gh-pages 分支..."
  git checkout gh-pages
  
  # Remove old files (keep .git)
  git rm -rf . 2>/dev/null || true
  git clean -fxd
else
  echo "📌 创建 gh-pages 分支..."
  git checkout --orphan gh-pages
  git rm -rf . 2>/dev/null || true
fi

# Copy built files
echo "📂 复制构建文件..."
cp -r out/* .
cp out/.nojekyll .

# Commit and push
echo "💾 提交更改..."
git add .
git commit -m "Deploy to GitHub Pages - $(date '+%Y-%m-%d %H:%M:%S')"

echo "🚀 推送到 GitHub..."
git push origin gh-pages --force

# Switch back to original branch
echo "🔄 切换回 $CURRENT_BRANCH 分支..."
git checkout $CURRENT_BRANCH

echo "✅ 部署完成！"
echo "📱 访问你的网站："
echo "   https://YOUR_USERNAME.github.io/YOUR_REPO/"

