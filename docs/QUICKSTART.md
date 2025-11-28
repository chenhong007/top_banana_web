# 🚀 快速开始指南

## 📋 部署前准备

### 1. 构建静态页面
```bash
npm run build:frontend
```

### 2. 本地预览（推荐）
```bash
npm run preview
```
然后访问：http://localhost:8080

确认页面显示正常后再部署！

---

## 🌐 部署方式

### 方式一：GitHub Pages（推荐，免费）

**自动部署（最简单）：**

1. 创建 GitHub 仓库并推送代码
2. 在仓库 Settings > Pages > Source 选择 "GitHub Actions"
3. 推送代码后自动部署

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

✅ 优点：自动化、免费、支持自定义域名  
📖 详细说明：[GITHUB_DEPLOY.md](./GITHUB_DEPLOY.md)

---

### 方式二：Vercel（推荐，免费）

1. 访问 [vercel.com](https://vercel.com)
2. 导入 GitHub 仓库
3. 构建命令设置为：`npm run build:frontend`
4. 输出目录设置为：`out`
5. 部署！

✅ 优点：速度快、自动 HTTPS、全球 CDN

---

### 方式三：Netlify（简单，免费）

**方式 A - 拖拽部署：**
1. 构建：`npm run build:frontend`
2. 访问 [netlify.com](https://netlify.com)
3. 将 `out` 目录拖拽到页面

**方式 B - Git 部署：**
1. 连接 GitHub 仓库
2. 构建命令：`npm run build:frontend`
3. 发布目录：`out`

✅ 优点：简单易用、自动 HTTPS

---

### 方式四：自建 Nginx 服务器

1. 构建静态页面：
```bash
npm run build:frontend
```

2. 上传到服务器：
```bash
scp -r out/* user@your-server:/var/www/topai/
```

3. 配置 Nginx（见 [DEPLOYMENT.md](./DEPLOYMENT.md)）

✅ 优点：完全控制、适合企业内网

---

### 方式五：Docker 部署

```bash
# 构建静态页面
npm run build:frontend

# 构建 Docker 镜像
docker build -f Dockerfile.frontend -t topai-frontend .

# 运行容器
docker run -d -p 80:80 topai-frontend
```

✅ 优点：环境一致、易于迁移

---

## ⚙️ 配置 basePath（重要！）

如果你的网站不在根路径（如 GitHub Pages 项目页面），需要配置 `basePath`：

编辑 `next.config.js`：

```javascript
const nextConfig = {
  basePath: '/YOUR_REPO_NAME',  // 添加这一行
  // ... 其他配置
}
```

然后重新构建。

---

## 🔄 更新内容

修改 `data/prompts.json` 后：

**GitHub Pages（自动部署）：**
```bash
git add data/prompts.json
git commit -m "Update data"
git push
```

**手动部署：**
```bash
npm run build:frontend
# 然后重新上传或运行部署脚本
```

---

## 🛠️ 常用命令

```bash
# 开发模式（包含管理后台）
npm run dev

# 构建前端静态页面
npm run build:frontend

# 本地预览静态页面
npm run preview

# 部署到 GitHub Pages（手动）
bash scripts/deploy-gh-pages.sh
```

---

## ❓ 常见问题

### Q: 页面空白或样式丢失？

1. ✅ 确保使用 `npm run preview` 预览，不要直接双击 HTML
2. ✅ 检查是否需要配置 `basePath`
3. ✅ 确保 `.nojekyll` 文件存在（GitHub Pages）

### Q: 数据没有显示？

1. ✅ 确认 `data/prompts.json` 文件存在且有内容
2. ✅ 重新构建：`npm run build:frontend`
3. ✅ 检查浏览器控制台是否有错误

### Q: 图片无法显示？

- 图片使用外部 CDN，需要网络连接
- 或将图片放到 `public` 目录并更新路径

---

## 📞 获取帮助

- 部署问题：查看 [DEPLOYMENT.md](./DEPLOYMENT.md)
- GitHub Pages：查看 [GITHUB_DEPLOY.md](./GITHUB_DEPLOY.md)
- 项目说明：查看 [README.md](./README.md)

---

## 🎉 部署成功后

- 📱 测试移动端访问
- 🔍 提交到搜索引擎（Google、Bing）
- 🚀 分享你的网站！

**祝你部署顺利！** 🎊

