# ⚡ Vercel Timeout 快速修复指南

## 🎯 问题
```
Error: FUNCTION_INVOCATION_TIMEOUT
Task timed out after 300 seconds
```

## ✅ 已完成的优化

### 1️⃣ 批次大小：50 → 20
📁 `scripts/remote-import.js`
```javascript
const BATCH_SIZE = 20;
```

### 2️⃣ 相似度检查：全量 → 限制 100 条
📁 `app/api/import/json/route.ts`
```typescript
const maxCheck = Math.min(100, existingPrompts.length);
```

### 3️⃣ 图片上传：串行 → 并行
📁 `app/api/import/json/route.ts`
```typescript
const results = await Promise.all(uploadPromises);
```

### 4️⃣ 添加进度监控
📁 `app/api/import/json/route.ts`
```typescript
console.log(`进度: ${processed}/${total}, 预计剩余=${eta}秒`);
```

### 5️⃣ Vercel 配置
📁 `vercel.json`
```json
{
  "functions": {
    "app/api/import/json/route.ts": {
      "maxDuration": 300
    }
  }
}
```

## 🚀 部署

```bash
git add .
git commit -m "fix: optimize import API timeout"
git push
```

## 📊 预期效果

| 指标 | 优化前 | 优化后 |
|------|--------|--------|
| 单批次时间 | 300+ 秒 ❌ | 60-120 秒 ✅ |
| 超时错误 | 频繁 | 基本消除 |

## 🔧 如果还超时

### 临时方案（按优先级）

1. **减小批次** → `BATCH_SIZE = 10`
2. **跳过 R2** → `skipR2: true`
3. **禁用相似度** → 注释检查代码

### 长期方案

- 使用任务队列（Redis/BullMQ）
- 拆分成 Cron Jobs
- 升级 Vercel Enterprise（900秒）

## 📝 监控

Vercel Dashboard → Functions → `/api/import/json`

查看日志中的进度输出：
```
[API v1.1] 进度: 15/20, 成功=12, 预计剩余=45秒
```

---

**Date**: 2025-12-27
**Status**: ✅ Fixed

