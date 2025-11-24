@echo off
REM Deploy script for GitHub Pages (manual deployment) - Windows version

echo 🚀 开始部署到 GitHub Pages...

REM Check if git is initialized
if not exist .git (
  echo ❌ 错误：当前目录不是 Git 仓库
  exit /b 1
)

REM Build the site
echo 📦 构建静态页面...
call npm run build:frontend
if errorlevel 1 (
  echo ❌ 构建失败
  exit /b 1
)

REM Check if build succeeded
if not exist out (
  echo ❌ 构建失败：out 目录不存在
  exit /b 1
)

REM Add .nojekyll file
echo 📝 添加 .nojekyll 文件...
type nul > out\.nojekyll

REM Store current branch
for /f "tokens=*" %%i in ('git branch --show-current') do set CURRENT_BRANCH=%%i

REM Check if gh-pages branch exists
git show-ref --verify --quiet refs/heads/gh-pages 2>nul
if errorlevel 1 (
  echo 📌 创建 gh-pages 分支...
  git checkout --orphan gh-pages
  git rm -rf . 2>nul
) else (
  echo 📌 切换到 gh-pages 分支...
  git checkout gh-pages
  git rm -rf . 2>nul
)

REM Copy built files
echo 📂 复制构建文件...
xcopy /E /I /Y out\* .
copy /Y out\.nojekyll .

REM Commit and push
echo 💾 提交更改...
git add .
git commit -m "Deploy to GitHub Pages - %date% %time%"

echo 🚀 推送到 GitHub...
git push origin gh-pages --force

REM Switch back to original branch
echo 🔄 切换回 %CURRENT_BRANCH% 分支...
git checkout %CURRENT_BRANCH%

echo ✅ 部署完成！
echo 📱 访问你的网站：
echo    https://YOUR_USERNAME.github.io/YOUR_REPO/

