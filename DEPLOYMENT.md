# GitHub Pages 部署指南

本指南将帮助你将 TopAI 项目部署到 GitHub Pages。

## 前提条件

- GitHub 账号
- Git 已安装
- Node.js 18+ 已安装

## 一键部署步骤

### 1. 创建 GitHub 仓库

1. 登录 GitHub
2. 点击右上角的 `+` -> `New repository`
3. 填写仓库名称（例如：`topai`）
4. 选择 `Public` 或 `Private`
5. **不要**勾选任何初始化选项（README, .gitignore, license）
6. 点击 `Create repository`

### 2. 推送代码到 GitHub

在项目根目录下执行以下命令：

```bash
# 添加所有文件到 Git
git add .

# 创建初始提交
git commit -m "Initial commit"

# 添加远程仓库（替换为你的仓库地址）
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# 推送到 GitHub
git branch -M master
git push -u origin master
```

### 3. 配置 GitHub Pages

1. 进入你的 GitHub 仓库页面
2. 点击 `Settings` (设置)
3. 在左侧菜单找到 `Pages`
4. 在 `Source` 下选择 `GitHub Actions`
5. 保存设置

### 4. 触发自动部署

GitHub Actions 会在你推送代码到 master 分支时自动触发。你也可以：

1. 进入仓库的 `Actions` 标签页
2. 选择 `Deploy to GitHub Pages` 工作流
3. 点击右侧的 `Run workflow` 按钮
4. 选择 `master` 分支
5. 点击 `Run workflow`

### 5. 查看部署结果

- 在 `Actions` 标签页可以看到部署进度
- 部署成功后，你的网站将在以下地址可访问：
  - `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/`

## 本地构建测试

在推送到 GitHub 之前，建议先在本地测试构建：

```bash
# 安装依赖
npm install

# 构建前端静态站点
npm run build:frontend

# 预览构建结果
npm run preview
```

## 自定义域名（可选）

如果你有自己的域名：

1. 在 GitHub Pages 设置中添加你的自定义域名
2. 在你的 DNS 提供商处添加 CNAME 记录指向 `YOUR_USERNAME.github.io`
3. 等待 DNS 生效（可能需要几分钟到几小时）

## 故障排查

### 问题 1：GitHub Actions 构建失败

- 检查 Actions 标签页的错误日志
- 确保 `package.json` 中所有依赖都已正确安装
- 确认 Node.js 版本兼容（需要 18+）

### 问题 2：页面显示 404

- 检查 GitHub Pages 设置是否正确
- 确认 `Source` 设置为 `GitHub Actions`
- 等待几分钟让 GitHub Pages 生效

### 问题 3：页面样式丢失

- 检查 `next.config.js` 中的 `basePath` 配置
- 确保 `trailingSlash: true` 已启用
- 检查 `out/.nojekyll` 文件是否存在

### 问题 4：需要设置 basePath

如果你的仓库名不是 `YOUR_USERNAME.github.io`，需要在 `next.config.js` 中添加 basePath：

```javascript
const nextConfig = {
  basePath: '/YOUR_REPO_NAME',
  // ... 其他配置
}
```

**注意**：当前配置已经支持无 basePath 的部署。如果你的 URL 是子路径形式（如 `/topai`），需要手动添加上述配置。

## 环境变量

- `NEXT_PUBLIC_DEPLOY_ENV`: 部署环境标识（自动设置为 `frontend`）

## 更新部署

每次推送代码到 master 分支时，GitHub Actions 会自动重新构建和部署：

```bash
git add .
git commit -m "Update: your changes"
git push
```

## 项目结构

- `.github/workflows/deploy.yml`: GitHub Actions 工作流配置
- `scripts/build-frontend.js`: 前端构建脚本
- `next.config.js`: Next.js 配置
- `out/`: 构建输出目录（会被 Git 忽略）

## 注意事项

1. **静态导出限制**：
   - Admin 和 API 路由在静态导出时会被临时移除
   - 只有前端页面会被部署到 GitHub Pages
   - 数据来自 `data/prompts.json` 静态文件

2. **构建过程**：
   - `build-frontend.js` 会临时移动 `app/(admin)` 和 `app/api` 目录
   - 构建完成后会自动恢复这些目录

3. **GitHub Pages 限制**：
   - 免费版有 100GB/月的带宽限制
   - 仓库大小建议不超过 1GB
   - 构建时间限制为 10 分钟

## 手动部署（备用方案）

如果 GitHub Actions 无法使用，可以手动部署：

```bash
# 构建静态站点
npm run build:frontend

# 使用 gh-pages 分支部署
npm run deploy:manual
```

## 相关链接

- [Next.js Static Export 文档](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)
- [GitHub Pages 文档](https://docs.github.com/pages)
- [GitHub Actions 文档](https://docs.github.com/actions)

