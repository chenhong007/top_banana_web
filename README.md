# AI 提示词库管理系统

一个现代化的 AI 提示词收集与管理平台，基于 Next.js 14 + TypeScript + Tailwind CSS + Prisma 构建。

## 功能特性

- ✨ 现代化的响应式 UI 设计
- 🔍 强大的搜索和标签筛选功能
- 📄 **智能分页加载**
  - ✅ 可配置的分页大小（6/12/24/48 条/页）
  - ✅ 搜索和筛选时自动重置页码
  - ✅ 提升大数据量下的页面性能
- 📝 完整的 CRUD 管理功能
- 📥 **多种数据导入方式**
  - ✅ CSV 文件导入（推荐）
  - ✅ 飞书文档自动导入
  - ✅ JSON 数据导入
- 📋 一键复制提示词
- 🎨 美观的卡片式布局展示
- 🗄️ PostgreSQL 数据库持久化存储
- 📱 移动端友好的响应式设计
- 🖼️ Cloudflare R2 图片存储支持
- ✅ 完整的测试覆盖 (Vitest)

## 技术栈

- **框架**: Next.js 14 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **图标**: Lucide React
- **ORM**: Prisma
- **数据库**: PostgreSQL
- **数据获取**: React Query (TanStack Query)
- **表单验证**: Zod
- **测试**: Vitest + React Testing Library
- **图片存储**: Cloudflare R2

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `env.example` 为 `.env.local` 并配置：

```bash
cp env.example .env.local
```

主要配置项：
- `DATABASE_URL`: PostgreSQL 数据库连接字符串
- `ADMIN_USERNAME` / `ADMIN_PASSWORD`: 管理员账号密码
- `AUTH_SECRET`: 认证密钥

### 3. 初始化数据库

```bash
npx prisma db push
```

### 4. 启动开发服务器

```bash
npm run dev
```

### 5. 访问应用

- 前端展示页面: http://localhost:3000
- 管理后台: http://localhost:3000/admin

## 项目结构

```
topai/
├── app/                          # Next.js App Router
│   ├── (frontend)/              # 前端展示模块
│   │   ├── components/          # 前端组件
│   │   │   ├── home/            # 首页子组件
│   │   │   ├── PromptCard.tsx
│   │   │   └── Pagination.tsx
│   │   ├── HomeClient.tsx       # 首页客户端组件
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── (admin)/                 # 后台管理模块
│   │   ├── admin/               # 管理页面
│   │   ├── components/          # 后台组件
│   │   └── layout.tsx
│   ├── api/                     # API 路由
│   │   ├── prompts/             # 提示词 CRUD API
│   │   ├── tags/                # 标签 API
│   │   ├── categories/          # 分类 API
│   │   ├── model-tags/          # AI模型标签 API
│   │   ├── images/              # 图片存储 API
│   │   └── import/              # 数据导入 API
│   ├── layout.tsx               # 根布局
│   └── globals.css              # 全局样式
├── config/                      # 配置管理
│   ├── env.ts                   # 环境变量验证 (Zod)
│   ├── theme.ts                 # 主题/颜色配置
│   └── index.ts
├── repositories/                # 数据访问层 (Repository 模式)
│   ├── base.repository.ts       # 基类
│   ├── prompt.repository.ts     # Prompt 数据访问
│   ├── tag.repository.ts        # Tag 数据访问
│   ├── category.repository.ts   # Category 数据访问
│   ├── model-tag.repository.ts  # ModelTag 数据访问
│   ├── image.repository.ts      # Image 数据访问
│   └── index.ts
├── hooks/                       # 自定义 React Hooks
│   ├── queries/                 # React Query Hooks
│   │   ├── usePromptsQuery.ts
│   │   ├── useTagsQuery.ts
│   │   └── ...
│   ├── useSearch.ts
│   ├── usePagination.ts
│   └── useAuth.ts
├── lib/                         # 工具库和核心功能
│   ├── api-utils.ts             # API 响应工具
│   ├── query-client.tsx         # React Query 配置
│   ├── db.ts                    # Prisma 客户端
│   └── constants.ts             # 常量定义
├── services/                    # 前端服务层
│   ├── prompt.service.ts
│   └── import.service.ts
├── types/                       # TypeScript 类型定义
├── prisma/                      # Prisma 数据库配置
│   ├── schema.prisma            # 数据库 Schema
│   └── migrations/              # 数据库迁移
├── __tests__/                   # 测试文件
├── scripts/                     # 构建和部署脚本
├── docker-compose.yml           # Docker Compose 配置
├── Dockerfile                   # Docker 镜像构建
└── vitest.config.ts             # Vitest 测试配置
```

## 架构设计

### Repository 模式

项目采用 Repository 模式分离数据访问逻辑：

```typescript
// 使用示例
import { promptRepository } from '@/repositories';

// 获取所有提示词
const prompts = await promptRepository.findAll();

// 创建新提示词
const newPrompt = await promptRepository.create({
  effect: '标题',
  prompt: '内容',
  // ...
});
```

### React Query 数据获取

使用 React Query 进行客户端数据获取和缓存：

```typescript
import { usePromptsQuery } from '@/hooks/queries';

function MyComponent() {
  const { data: prompts, isLoading, error } = usePromptsQuery();
  // ...
}
```

### API 统一错误处理

所有 API 路由使用统一的响应格式：

```typescript
import { successResponse, errorResponse, handleApiRoute } from '@/lib/api-utils';

export async function GET() {
  return handleApiRoute(async () => {
    const data = await repository.findAll();
    return successResponse(data);
  });
}
```

## 测试

```bash
# 运行测试
npm test

# 运行测试（单次）
npm run test:run

# 运行测试覆盖率
npm run test:coverage
```

## 部署

### 方式一：Vercel 部署（推荐）

1. 在 Vercel Dashboard 创建 PostgreSQL 数据库
2. 连接 GitHub 仓库
3. 配置环境变量
4. 自动部署

### 方式二：Docker 部署

```bash
# 使用 Docker Compose 一键部署
docker-compose up -d

# 或者手动构建和运行
npm run docker:build
npm run docker:run
```

详细部署指南请参考 [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

## 文档

- [快速开始指南](docs/QUICKSTART.md)
- [部署指南](docs/DEPLOYMENT.md)
- [数据导入指南](docs/IMPORT_GUIDE.md)
- [CSV 格式指南](docs/CSV_FORMAT_GUIDE.md)
- [产品需求文档](docs/PRD.md)

## 许可证

MIT
