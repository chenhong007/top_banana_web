# Vercel 环境标签迁移指南

## 📋 概述

由于本地无法执行迁移，本指南说明如何在 Vercel 生产环境中执行标签迁移。

## 🌐 访问迁移页面

### 方法 1: 使用管理页面（推荐）

1. **部署到 Vercel**
   ```bash
   git add .
   git commit -m "Add tag migration feature"
   git push
   ```

2. **访问迁移页面**
   ```
   https://your-domain.com/admin/migrate-tags
   ```

3. **输入 IMPORT_SECRET**
   - 在页面中输入 Vercel 环境变量中的 `IMPORT_SECRET` 值
   - 可以在 Vercel 项目设置中查找

4. **按步骤操作**
   - 步骤 1: 查看当前标签状态
   - 步骤 2: 生成迁移计划
   - 步骤 3: 预览迁移详情
   - 步骤 4: 最终确认
   - 步骤 5: 查看迁移结果

### 方法 2: 使用 API（适合技术用户）

#### 1. 获取 IMPORT_SECRET

在 Vercel 项目中查找：
```
Vercel Dashboard → Your Project → Settings → Environment Variables
```

找到 `IMPORT_SECRET` 的值。

#### 2. 查看当前状态

```bash
curl -X GET https://your-domain.com/api/migrate-tags \
  -H "Authorization: Bearer YOUR_IMPORT_SECRET"
```

#### 3. 预览迁移（推荐先运行）

```bash
curl -X POST https://your-domain.com/api/migrate-tags \
  -H "Content-Type: application/json" \
  -d '{
    "secret": "YOUR_IMPORT_SECRET",
    "dryRun": true
  }'
```

#### 4. 执行迁移

确认预览结果后：

```bash
curl -X POST https://your-domain.com/api/migrate-tags \
  -H "Content-Type: application/json" \
  -d '{
    "secret": "YOUR_IMPORT_SECRET",
    "dryRun": false
  }'
```

## 🔒 安全性

### 获取 IMPORT_SECRET

#### 在 Vercel Dashboard 中：

1. 登录 [Vercel Dashboard](https://vercel.com)
2. 选择您的项目
3. 进入 **Settings** → **Environment Variables**
4. 找到 `IMPORT_SECRET` 变量
5. 点击 **Show** 查看值

#### 如果没有设置：

在 Vercel 项目设置中添加环境变量：

```
Key: IMPORT_SECRET
Value: your-secure-random-string
Environment: Production, Preview, Development
```

**生成安全密钥：**
```bash
# 方法 1: 使用 openssl
openssl rand -hex 32

# 方法 2: 使用 Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## ⚠️ 重要注意事项

### 执行前检查清单

- [ ] 已在 Vercel 中配置 `IMPORT_SECRET`
- [ ] 已查看当前标签状态
- [ ] 已预览迁移计划（`dryRun: true`）
- [ ] 已备份数据库（可选，但强烈推荐）
- [ ] 在低流量时段执行
- [ ] 准备好在迁移后验证结果

### 数据库备份

如果使用 Vercel Postgres：

```bash
# 使用 Vercel CLI 导出数据
vercel env pull .env.local
npx prisma db pull
```

或者在 Vercel Postgres 控制台中创建快照。

## 📊 20个核心标签

迁移后将得到以下中文标签：

```
1. 设计    2. 艺术    3. 卡通    4. 角色    5. 风景
6. 人物    7. 动物    8. 自然    9. 美食    10. 商业
11. 创意   12. 科幻   13. 奇幻   14. 游戏   15. 时尚
16. 极简   17. 复古   18. 未来   19. 数据   20. 代码
```

## 🔍 迁移示例

### 标签合并规则

| 原标签 | 合并到 |
|--------|--------|
| 3D设计, Logo设计, UI设计, branding, architecture | 设计 |
| illustration, photography, sculpture | 艺术 |
| character | 角色 |
| landscape | 风景 |
| portrait | 人物 |
| animal | 动物 |
| sci-fi | 科幻 |
| fantasy | 奇幻 |
| gaming | 游戏 |

## ✅ 验证迁移结果

### 1. 检查 API

```bash
curl https://your-domain.com/api/tags
```

应该返回 20 个中文标签。

### 2. 检查前端

1. 访问首页
2. 查看顶部标签筛选器
3. 应该显示中文标签按钮

### 3. 检查后台

1. 访问 `/admin`
2. 添加或编辑 Prompt
3. 标签下拉列表应显示中文标签

## 🐛 故障排查

### 问题 1: 认证失败

**错误：** `认证失败: Token 不匹配`

**解决：**
1. 检查 Vercel 环境变量 `IMPORT_SECRET` 是否正确
2. 确保输入的值没有多余空格
3. 重新部署项目使环境变量生效

### 问题 2: 页面 404

**错误：** 访问 `/admin/migrate-tags` 返回 404

**解决：**
1. 确保已提交并推送代码
2. 等待 Vercel 部署完成
3. 检查构建日志是否有错误

### 问题 3: 迁移超时

**错误：** Function execution timeout

**解决：**
1. 标签迁移 API 已设置 `maxDuration = 300` (5分钟)
2. 如果标签数量特别多，可能需要分批迁移
3. 检查 Vercel 项目的函数执行时间限制

### 问题 4: 前端仍显示旧标签

**解决：**
1. 清除浏览器缓存
2. 硬刷新页面（Ctrl+Shift+R 或 Cmd+Shift+R）
3. 等待几分钟让 CDN 缓存更新

## 📝 迁移后任务

### 立即执行

1. **验证标签数量**
   ```bash
   curl https://your-domain.com/api/tags
   ```

2. **检查前端显示**
   - 访问首页
   - 查看标签筛选器
   - 点击几个标签测试筛选功能

3. **检查后台功能**
   - 添加新 Prompt
   - 编辑现有 Prompt
   - 验证标签保存正常

### 后续维护

1. **监控标签使用**
   - 定期检查哪些标签使用最多
   - 考虑是否需要调整标签体系

2. **新标签管理**
   - 尽量使用现有的 20 个核心标签
   - 如需新标签，考虑是否可以合并到现有标签

3. **文档更新**
   - 更新用户文档，说明新的标签体系
   - 通知团队成员标签已更改

## 🔐 安全建议

1. **保护 IMPORT_SECRET**
   - 不要在公开仓库中提交
   - 定期更换密钥
   - 使用强随机字符串

2. **限制访问**
   - 迁移完成后，考虑禁用迁移 API
   - 或添加额外的访问控制

3. **审计日志**
   - 迁移操作会在服务器日志中记录
   - 在 Vercel Dashboard 中查看执行日志

## 📞 需要帮助？

如遇问题：

1. **查看服务器日志**
   ```
   Vercel Dashboard → Your Project → Deployments → [Latest] → Function Logs
   ```
   搜索 `[MigrateTags]` 查看详细日志

2. **查看文档**
   - `docs/TAG_MIGRATION_GUIDE.md` - 完整指南
   - `docs/TAG_MIGRATION_QUICK_START.md` - 快速开始

3. **API 测试**
   使用 `/admin/migrate-tags` 页面进行可视化操作

## 🎉 迁移完成后

恭喜！您的标签系统已升级为统一的中文标签体系：

✅ 标签从 45+ 个减少到 20 个核心标签
✅ 所有标签统一为中文
✅ 近义词已合并
✅ 前端自动更新
✅ 后台继续正常工作

---

**创建日期**: 2025-12-27
**适用环境**: Vercel Production
**版本**: 1.0.0
