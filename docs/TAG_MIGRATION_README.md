# 标签迁移功能 - 完整文档索引

## 📚 文档目录

### 🚀 快速开始（推荐先看）
- **[VERCEL_DEPLOYMENT_GUIDE.md](./VERCEL_DEPLOYMENT_GUIDE.md)** - Vercel 部署和使用指南
  - 如何部署到 Vercel
  - 如何使用可视化迁移页面
  - 包含页面截图和详细步骤

### 📖 详细文档
- **[TAG_MIGRATION_GUIDE.md](./TAG_MIGRATION_GUIDE.md)** - 完整的迁移指南
  - 标签映射策略详解
  - API 使用方法
  - 注意事项和错误处理

- **[VERCEL_MIGRATION_GUIDE.md](./VERCEL_MIGRATION_GUIDE.md)** - Vercel 环境专用指南
  - 如何在 Vercel 执行迁移
  - 环境变量配置
  - 安全性建议

### ⚡ 快速参考
- **[TAG_MIGRATION_QUICK_START.md](./TAG_MIGRATION_QUICK_START.md)** - 快速使用指南
  - 命令行快速参考
  - 常见问题 FAQ
  - 标签映射示例

- **[TAG_MIGRATION_SUMMARY.md](./TAG_MIGRATION_SUMMARY.md)** - 功能总结
  - 已完成的工作列表
  - 技术细节
  - 验收检查清单

## 🎯 核心功能

### 标签迁移目标
将数据库中 45+ 个英文/混合标签统一为 **20 个中文核心标签**：

```
设计  艺术  卡通  角色  风景  人物  动物  自然  美食  商业
创意  科幻  奇幻  游戏  时尚  极简  复古  未来  数据  代码
```

### 主要特性
- ✅ 自动翻译英文标签为中文
- ✅ 智能合并近义词
- ✅ 保留所有 Prompt 关联关系
- ✅ 支持预览模式（不修改数据）
- ✅ 可视化管理页面
- ✅ 前端自动适配

## 🚀 使用方式

### 方式 1: 可视化页面（推荐）

1. **访问页面**
   ```
   https://your-domain.vercel.app/admin/migrate-tags
   ```

2. **输入密钥**
   - 在页面输入 `IMPORT_SECRET`
   - 可在 Vercel 环境变量中查找

3. **按步骤操作**
   - 查看当前状态
   - 生成迁移计划
   - 预览详情
   - 确认执行

📖 详细说明：[VERCEL_DEPLOYMENT_GUIDE.md](./VERCEL_DEPLOYMENT_GUIDE.md)

### 方式 2: API 调用

```bash
# 1. 查看状态
curl -X GET https://your-domain.vercel.app/api/migrate-tags \
  -H "Authorization: Bearer YOUR_SECRET"

# 2. 预览迁移
curl -X POST https://your-domain.vercel.app/api/migrate-tags \
  -H "Content-Type: application/json" \
  -d '{"secret": "YOUR_SECRET", "dryRun": true}'

# 3. 执行迁移
curl -X POST https://your-domain.vercel.app/api/migrate-tags \
  -H "Content-Type: application/json" \
  -d '{"secret": "YOUR_SECRET", "dryRun": false}'
```

📖 详细说明：[VERCEL_MIGRATION_GUIDE.md](./VERCEL_MIGRATION_GUIDE.md)

## 📂 代码文件

### API 端点
```
app/api/migrate-tags/route.ts
```
- GET: 查看当前标签状态
- POST: 执行标签迁移
- 支持 dryRun 预览模式

### 管理页面
```
app/(admin)/migrate-tags/page.tsx
```
- 可视化迁移界面
- 分步操作流程
- 实时状态显示

### 测试脚本
```
scripts/test-migration.ts
```
- 用于本地测试
- 自动化测试流程

### 文档
```
docs/
  ├── TAG_MIGRATION_GUIDE.md          # 完整指南
  ├── TAG_MIGRATION_SUMMARY.md        # 功能总结
  ├── TAG_MIGRATION_QUICK_START.md    # 快速开始
  ├── VERCEL_MIGRATION_GUIDE.md       # Vercel 指南
  ├── VERCEL_DEPLOYMENT_GUIDE.md      # 部署指南
  └── TAG_MIGRATION_README.md         # 本文档
```

## ⚠️ 重要提示

### 执行前必读

1. **备份数据库**（可选但推荐）
   - 迁移会删除旧标签
   - 操作不可撤销

2. **先预览**
   - 使用 `dryRun: true` 查看计划
   - 确认映射关系正确

3. **低峰时段**
   - 建议在访问量低时执行
   - 减少对用户的影响

4. **环境变量**
   - 确保 `IMPORT_SECRET` 已配置
   - 在 Vercel Dashboard 中设置

### 执行后验证

1. **API 检查**
   ```bash
   curl https://your-domain.vercel.app/api/tags
   ```
   应返回 20 个中文标签

2. **前端检查**
   - 访问首页
   - 查看标签筛选器
   - 应显示中文标签

3. **后台检查**
   - 添加/编辑 Prompt
   - 标签下拉列表显示中文

## 🔄 迁移流程图

```
开始
  ↓
输入 IMPORT_SECRET
  ↓
获取当前标签状态
  ↓
生成迁移计划（预览）
  ↓
确认无误？
  ├─ 否 → 返回修改
  └─ 是 ↓
执行迁移
  ↓
显示迁移结果
  ↓
验证前端/后台
  ↓
完成
```

## 📊 标签映射示例

| 原标签类别 | 英文标签示例 | 中文标签 | 数量 |
|----------|------------|---------|------|
| 设计类 | 3D设计, Logo设计, UI设计, branding, architecture | 设计 | ~120 |
| 艺术类 | illustration, photography, sculpture, clay | 艺术 | ~85 |
| 风格类 | cartoon, pixel, retro, minimalist, sci-fi | 卡通/像素/复古/极简/科幻 | ~180 |
| 主题类 | animal, nature, landscape, portrait, food | 动物/自然/风景/人物/美食 | ~200 |
| 应用类 | gaming, fashion, business, data-viz | 游戏/时尚/商业/数据 | ~150 |

## 🎨 前端自动适配

迁移完成后，以下组件会自动使用新标签：

### 1. 首页标签筛选器
```jsx
<TagFilter tags={['设计', '艺术', '卡通', ...]} />
```
显示中文标签按钮供用户筛选

### 2. Prompt 卡片标签
```jsx
<PromptCard 
  tags={['设计', '艺术', '极简']} 
/>
```
每个卡片显示关联的中文标签

### 3. 后台标签输入
```jsx
<TagInput 
  allTags={['设计', '艺术', ...]} 
/>
```
下拉列表显示所有中文标签

## 🔐 安全性

### 认证机制
- 使用 `IMPORT_SECRET` 环境变量
- 支持 Header 或 Body 传递
- 不匹配则拒绝访问

### 建议
- 使用强随机字符串（32+ 字符）
- 定期更换密钥
- 不要在代码中硬编码
- 不要提交到 Git

### 生成安全密钥
```bash
# 方法 1
openssl rand -hex 32

# 方法 2
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 🐛 故障排查

### 常见问题

1. **404 错误**
   - 确认代码已部署到 Vercel
   - 检查路由是否正确

2. **认证失败**
   - 检查环境变量配置
   - 确认密钥输入正确

3. **迁移超时**
   - API 最大执行时间 300 秒
   - 如超时，联系支持

4. **前端未更新**
   - 清除浏览器缓存
   - 硬刷新页面
   - 等待 CDN 更新

更多问题？查看 [TAG_MIGRATION_GUIDE.md](./TAG_MIGRATION_GUIDE.md#错误处理)

## 📞 获取帮助

### 查看日志
在 Vercel Dashboard 中：
```
Your Project → Deployments → [Latest] → Function Logs
```
搜索 `[MigrateTags]` 查看详细日志

### 文档链接
- 完整指南：[TAG_MIGRATION_GUIDE.md](./TAG_MIGRATION_GUIDE.md)
- 快速开始：[TAG_MIGRATION_QUICK_START.md](./TAG_MIGRATION_QUICK_START.md)
- Vercel 指南：[VERCEL_DEPLOYMENT_GUIDE.md](./VERCEL_DEPLOYMENT_GUIDE.md)

## ✅ 验收清单

迁移前：
- [ ] 代码已提交到 Git
- [ ] Vercel 已完成部署
- [ ] IMPORT_SECRET 已配置
- [ ] 已查看当前状态
- [ ] 已预览迁移计划

迁移后：
- [ ] API 返回 20 个中文标签
- [ ] 前端标签筛选器显示中文
- [ ] Prompt 卡片显示中文标签
- [ ] 后台标签输入正常工作
- [ ] 所有 Prompt 关联正确

## 🎉 开始使用

准备好了？

1. **提交代码**
   ```bash
   git add .
   git commit -m "feat: 添加标签迁移功能"
   git push
   ```

2. **等待部署**
   - 访问 Vercel Dashboard
   - 等待部署完成

3. **访问页面**
   ```
   https://your-domain.vercel.app/admin/migrate-tags
   ```

4. **开始迁移**
   - 输入密钥
   - 按步骤操作
   - 享受新的中文标签体系！

---

**创建日期**: 2025-12-27  
**版本**: 1.0.0  
**状态**: ✅ 生产就绪

**问题反馈**: 查看服务器日志或相关文档
