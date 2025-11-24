# 快速 GitHub Pages 部署指南

## 第一步：检查 basePath 配置

**重要**：根据你的 GitHub 仓库类型，可能需要配置 basePath。

### 情况 1：用户站点（不需要 basePath）
如果你的仓库名是 `YOUR_USERNAME.github.io`：
- ✅ 当前配置已经可以使用
- 访问地址：`https://YOUR_USERNAME.github.io/`

### 情况 2：项目站点（需要 basePath）
如果你的仓库名是其他名称（如 `topai`）：
- ⚠️ 需要修改 `next.config.js`
- 访问地址：`https://YOUR_USERNAME.github.io/REPO_NAME/`

**修改方法**：在 `next.config.js` 中添加：

```javascript
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  basePath: '/YOUR_REPO_NAME',  // 添加这一行，替换为你的仓库名
  trailingSlash: true,
  // ... 其他配置保持不变
}
```

## 第二步：执行部署命令

```bash
# 1. 添加所有文件
git add .

# 2. 创建初始提交
git commit -m "Initial commit: Add TopAI project"

# 3. 添加远程仓库（替换为你的仓库地址）
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# 4. 推送到 GitHub（如果分支是 master）
git push -u origin master

# 或者如果分支是 main
# git branch -M main
# git push -u origin main
```

## 第三步：配置 GitHub Pages

1. 打开你的 GitHub 仓库页面
2. 点击 `Settings` → `Pages`
3. 在 `Source` 下选择 `GitHub Actions`
4. 保存

## 第四步：触发部署

GitHub Actions 会自动运行，或者手动触发：
1. 进入 `Actions` 标签页
2. 点击 `Deploy to GitHub Pages`
3. 点击 `Run workflow`

## 快速命令（复制后替换参数）

```bash
# 一次性执行（替换 YOUR_USERNAME 和 YOUR_REPO_NAME）
git add . && \
git commit -m "Initial commit: Add TopAI project" && \
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git && \
git push -u origin master
```

## 验证部署

访问：`https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/`

如果是用户站点：`https://YOUR_USERNAME.github.io/`

