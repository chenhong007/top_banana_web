# AI 提示词库管理系统 - 产品需求文档 (PRD)

**版本**: v1.0  
**更新日期**: 2024年12月18日  
**产品名称**: TopAI - 全球最热门 AI 提示词大全  

---

## 1. 产品概述

### 1.1 产品简介

TopAI 是一个现代化的 AI 提示词收集与管理平台，旨在为用户提供优质 AI 提示词的浏览、搜索、管理功能。平台分为前端展示模块和后台管理模块，支持多种数据导入方式，适合个人或团队管理和分享 AI 创作提示词。

### 1.2 目标用户

- **普通用户**: 浏览、搜索、复制 AI 提示词，获取创作灵感
- **内容管理员**: 维护提示词数据库，进行增删改查操作，批量导入数据

### 1.3 产品目标

1. 提供美观易用的提示词展示界面
2. 支持高效的搜索和筛选功能
3. 提供完整的后台管理能力
4. 支持多种数据源的批量导入
5. 保障管理后台的安全访问

---

## 2. 功能模块

### 2.1 前端展示模块

#### 2.1.1 首页展示

| 功能点 | 描述 | 优先级 |
|--------|------|--------|
| 卡片式布局 | 以卡片形式展示提示词，包含图片、标题、描述、标签、提示词内容 | P0 |
| 响应式设计 | 适配桌面端、平板、移动端多种屏幕尺寸 | P0 |
| 暗色主题 | 采用现代深色 UI 设计，黑金/冷蓝风格 | P1 |
| 动效设计 | 卡片悬浮效果、渐变光晕、平滑过渡动画 | P2 |

**卡片内容包含**:

- 效果图片（支持本地/远程图片，含图片代理防盗链）
- 效果标题（effect）
- 详细描述（description）
- AI 模型标签（modelTags）- 显示适用的 AI 模型，如 Midjourney、DALL-E 等
- 场景/用途标签（tags）- 最多显示3个，超出显示数量
- 生成类型徽章（category）- 文生图/文生视频/文生音频等
- 提示词内容（prompt）- 支持展开查看
- 更新时间（updatedAt）
- 来源链接（source）

#### 2.1.2 搜索功能

| 功能点 | 描述 | 优先级 |
|--------|------|--------|
| 全局搜索 | 支持按效果名称、描述、提示词内容进行全文搜索 | P0 |
| 实时搜索 | 输入即搜索，无需点击按钮 | P1 |
| 搜索高亮 | 搜索时自动重置分页到第一页 | P1 |

#### 2.1.3 筛选功能

| 功能点 | 描述 | 优先级 |
|--------|------|--------|
| 生成类型筛选 | 按生成类型（文生图/文生视频/文生音频/其他）筛选 | P0 |
| AI 模型筛选 | 按 AI 模型（Midjourney/DALL-E/Stable Diffusion/DeepSeek 等）筛选 | P0 |
| 场景标签筛选 | 按场景/用途标签快速筛选相关提示词 | P0 |
| 组合筛选 | 支持生成类型+AI模型+场景标签+搜索词同时生效 | P1 |
| 筛选重置 | 切换筛选条件时自动重置分页 | P1 |

#### 2.1.4 分页功能

| 功能点 | 描述 | 优先级 |
|--------|------|--------|
| 智能分页 | 支持大数据量下的分页加载 | P0 |
| 可配置页大小 | 支持 6/12/24/48 条/页 | P1 |
| 页码导航 | 显示当前页码、总页数、总记录数 | P1 |
| 跳转功能 | 支持上一页/下一页/指定页跳转 | P1 |

#### 2.1.5 交互功能

| 功能点 | 描述 | 优先级 |
|--------|------|--------|
| 一键复制 | 点击按钮复制提示词到剪贴板 | P0 |
| 复制反馈 | 复制成功后显示勾选图标反馈 | P1 |
| 来源跳转 | 点击来源链接新窗口打开原始来源 | P2 |

---

### 2.2 后台管理模块

#### 2.2.1 登录认证

| 功能点 | 描述 | 优先级 |
|--------|------|--------|
| 用户名密码登录 | 基于环境变量配置的管理员账号密码 | P0 |
| Token 认证 | 使用 Base64 编码的 Token，有效期7天 | P0 |
| 自动跳转 | 未登录访问管理页自动跳转登录页 | P0 |
| 域名访问控制 | 支持配置允许访问管理后台的域名白名单 | P1 |
| 退出登录 | 支持主动退出，清除认证 Cookie | P1 |

**环境变量配置**:

- `ADMIN_USERNAME`: 管理员用户名（默认: admin）
- `ADMIN_PASSWORD`: 管理员密码（默认: admin123）
- `AUTH_SECRET`: Token 签名密钥
- `NEXT_PUBLIC_SHOW_ADMIN_ENTRY`: 是否显示管理入口
- `NEXT_PUBLIC_ADMIN_ALLOWED_DOMAINS`: 允许访问的域名列表

#### 2.2.2 仪表盘统计

| 功能点 | 描述 | 优先级 |
|--------|------|--------|
| 总提示词数 | 显示数据库中提示词总数 | P1 |
| 标签分类数 | 显示去重后的标签总数 | P1 |
| 最近更新时间 | 显示最近一次数据更新日期 | P1 |

#### 2.2.3 提示词管理 (CRUD)

##### 新建提示词

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| effect | 文本 | ✅ | 效果/标题描述 |
| description | 文本 | ❌ | 详细说明 |
| modelTags | 多选 | ❌ | AI 模型标签（Midjourney/DALL-E/Stable Diffusion 等） |
| tags | 文本数组 | ❌ | 场景/用途标签列表，逗号分隔 |
| prompt | 长文本 | ✅ | 提示词内容 |
| source | URL | ❌ | 来源链接 |
| imageUrl | URL | ❌ | 图片地址 |
| category | 选择 | ❌ | 生成类型（默认: 文生图） |

##### 编辑提示词

- 点击列表中的编辑按钮，加载数据到表单
- 表单自动滚动到可见区域
- 支持修改所有字段
- 保存后列表自动更新

##### 删除提示词

- 点击删除按钮执行删除
- 删除后列表自动刷新

##### 列表展示

| 功能点 | 描述 | 优先级 |
|--------|------|--------|
| 表格展示 | 以表格形式展示所有提示词 | P0 |
| 列表搜索 | 支持在管理列表中搜索 | P1 |
| 快捷操作 | 每行提供编辑、删除按钮 | P0 |
| 时间显示 | 显示更新日期和时间 | P1 |
| 标签徽章 | 不同颜色区分标签 | P2 |

#### 2.2.4 数据导入

##### 导入方式

| 方式 | 描述 | 推荐度 |
|------|------|--------|
| CSV 文件导入 | 上传 CSV 文件或粘贴 CSV 文本 | ⭐⭐⭐ 推荐 |
| JSON 导入 | 粘贴 JSON 数据或上传 JSON 文件 | ⭐⭐ |
| 飞书文档导入 | 自动爬取飞书在线文档数据 | ⭐ |

##### CSV 格式要求

支持以下列名（中英文均可）:

- 效果/effect/标题/title
- 描述/description/详细描述
- AI模型/modelTags/模型标签（多个用逗号分隔，如：Midjourney,DALL-E）
- 标签/tags/评测对象/场景标签（多个用逗号分隔）
- 提示词/prompt
- 来源/source/提示词来源
- 图片/imageUrl/图片URL
- 类别/category/生成类型（文生图/文生视频/文生音频/其他）

##### 导入模式

| 模式 | 描述 |
|------|------|
| merge（合并） | 保留现有数据，追加新数据 |
| replace（替换） | 清空现有数据，导入新数据 |

##### 导入流程

1. 选择导入方式（CSV/JSON/飞书）
2. 上传文件或粘贴数据
3. 选择导入模式（合并/替换）
4. 点击开始导入
5. 显示导入结果（成功数量/失败原因）

---

### 2.3 API 接口

#### 2.3.1 提示词接口

| 接口 | 方法 | 描述 |
|------|------|------|
| `/api/prompts` | GET | 获取所有提示词列表 |
| `/api/prompts` | POST | 创建新提示词 |
| `/api/prompts/[id]` | GET | 获取单个提示词详情 |
| `/api/prompts/[id]` | PUT | 更新提示词 |
| `/api/prompts/[id]` | DELETE | 删除提示词 |

#### 2.3.2 分类标签接口

| 接口 | 方法 | 描述 |
|------|------|------|
| `/api/tags` | GET | 获取所有场景/用途标签列表 |
| `/api/model-tags` | GET | 获取所有 AI 模型标签列表 |
| `/api/categories` | GET | 获取所有生成类型类别列表 |
| `/api/init-categories` | POST | 初始化默认类别 |
| `/api/init-model-tags` | POST | 初始化默认 AI 模型标签 |

#### 2.3.3 导入接口

| 接口 | 方法 | 描述 |
|------|------|------|
| `/api/import` | POST | 通用数据导入接口 |
| `/api/import/csv` | POST | CSV 解析接口 |
| `/api/import/feishu` | POST | 飞书文档爬取接口 |

#### 2.3.4 认证接口

| 接口 | 方法 | 描述 |
|------|------|------|
| `/api/auth/login` | POST | 用户登录 |
| `/api/auth/logout` | POST | 用户登出 |
| `/api/auth/check` | GET | 检查登录状态 |

#### 2.3.5 工具接口

| 接口 | 方法 | 描述 |
|------|------|------|
| `/api/image-proxy` | GET | 图片代理（绕过防盗链） |
| `/api/local-image` | GET | 本地图片访问 |
| `/api/init-db` | POST | 数据库初始化 |

---

## 3. 数据模型

### 3.1 提示词 (Prompt)

```prisma
model Prompt {
  id          String      @id @default(uuid())
  effect      String      // 效果/标题描述
  description String      // 详细说明
  prompt      String      // 提示词内容
  source      String      // 来源链接
  imageUrl    String?     // 图片URL（可选）
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  tags        Tag[]       // 关联场景/用途标签
  category    Category?   @relation(fields: [categoryId], references: [id])
  categoryId  String?     // 关联生成类型类别ID
  modelTags   ModelTag[]  // 关联 AI 模型标签（新增）
}
```

### 3.2 标签 (Tag)

```prisma
model Tag {
  id      String   @id @default(uuid())
  name    String   @unique
  prompts Prompt[] // 多对多关联
}
```

### 3.3 类别 (Category)

```prisma
model Category {
  id        String   @id @default(uuid())
  name      String   @unique
  createdAt DateTime @default(now())
  prompts   Prompt[] // 一对多关联
}
```

**默认生成类型类别**:
- 文生图
- 文生视频
- 文生音频
- 其他

### 3.4 AI 模型标签 (ModelTag) - 新增

```prisma
model ModelTag {
  id        String   @id @default(uuid())
  name      String   @unique      // 模型名称
  icon      String?               // 模型图标 URL（可选）
  color     String?               // 显示颜色（可选）
  createdAt DateTime @default(now())
  prompts   Prompt[] // 多对多关联
}
```

**默认 AI 模型标签**:

- Midjourney
- DALL-E 3
- Stable Diffusion
- Flux
- Runway
- Sora
- Pika
- Kling（可灵）
- DeepSeek
- Banana
- ComfyUI
- Leonardo.AI
- 其他模型

---

## 4. 技术架构

### 4.1 技术栈

| 层级 | 技术选型 |
|------|----------|
| 前端框架 | Next.js 14 (App Router) |
| 编程语言 | TypeScript |
| 样式方案 | Tailwind CSS |
| 图标库 | Lucide React |
| ORM | Prisma |
| 数据库 | PostgreSQL (生产) / SQLite (开发) |
| 部署平台 | Vercel / Docker |

### 4.2 项目结构

```
topai/
├── app/                          # Next.js App Router
│   ├── (frontend)/              # 前端展示模块
│   │   ├── components/          # 前端专用组件
│   │   │   ├── PromptCard.tsx   # 提示词卡片
│   │   │   └── Pagination.tsx   # 分页组件
│   │   ├── HomeClient.tsx       # 首页客户端组件
│   │   ├── layout.tsx           # 前端布局
│   │   └── page.tsx             # 首页
│   ├── (admin)/                 # 后台管理模块
│   │   ├── admin/               # 管理主页面
│   │   ├── login/               # 登录页面
│   │   ├── components/          # 后台专用组件
│   │   │   ├── import/          # 导入相关子组件
│   │   │   ├── AdminHeader.tsx  # 管理头部
│   │   │   ├── PromptForm.tsx   # 表单组件
│   │   │   ├── PromptTable.tsx  # 列表组件
│   │   │   ├── ImportModal.tsx  # 导入弹窗
│   │   │   └── DashboardStats.tsx # 仪表盘统计
│   │   └── layout.tsx           # 后台布局
│   ├── api/                     # API 路由
│   │   ├── auth/                # 认证接口
│   │   ├── prompts/             # 提示词 CRUD
│   │   ├── import/              # 导入接口
│   │   ├── tags/                # 标签接口
│   │   └── categories/          # 类别接口
│   └── globals.css              # 全局样式
├── components/shared/           # 共享通用组件
├── hooks/                       # 自定义 React Hooks
│   ├── useAuth.ts               # 认证状态管理
│   ├── usePrompts.ts            # 提示词数据管理
│   ├── usePromptForm.ts         # 表单状态管理
│   ├── useSearch.ts             # 搜索筛选逻辑
│   ├── usePagination.ts         # 分页逻辑
│   └── useImport.ts             # 导入流程管理
├── lib/                         # 工具库
│   ├── auth.ts                  # 认证工具
│   ├── constants.ts             # 常量定义
│   ├── storage.ts               # 数据存储操作
│   ├── csv-parser.ts            # CSV 解析
│   ├── feishu-scraper.ts        # 飞书爬虫
│   └── styles.ts                # 样式常量
├── services/                    # 服务层
│   ├── prompt.service.ts        # 提示词服务
│   └── import.service.ts        # 导入服务
├── types/                       # 类型定义
├── prisma/                      # 数据库配置
│   ├── schema.prisma            # 数据库 Schema
│   └── migrations/              # 迁移文件
├── middleware.ts                # 中间件（路由保护）
└── scripts/                     # 脚本工具
```

### 4.3 部署方式

| 方式 | 说明 |
|------|------|
| Vercel | 推荐，支持 Postgres 托管 |
| Docker | 提供 Dockerfile 和 docker-compose |
| Node.js | 传统 npm build + npm start |
| GitHub Pages | 仅静态前端展示 |

---

## 5. 非功能性需求

### 5.1 性能要求

- 首页加载时间 < 3秒（首屏）
- 搜索响应时间 < 200ms
- 分页切换无明显延迟
- 支持 1000+ 条数据流畅操作

### 5.2 安全要求

- 管理后台必须认证访问
- 支持域名白名单访问控制
- Token 使用 HTTPOnly Cookie 存储
- 生产环境强制 Secure Cookie

### 5.3 兼容性要求

- 支持现代浏览器（Chrome/Firefox/Safari/Edge 最新版本）
- 移动端 iOS Safari / Android Chrome
- 响应式布局断点：sm(640px) / md(768px) / lg(1024px)

### 5.4 可维护性

- 采用模块化架构，职责分离
- 完整的 TypeScript 类型覆盖
- 集中管理常量和配置
- 统一的错误处理机制

---

## 6. 版本规划

### v1.0 (当前版本)
- ✅ 前端展示页面
- ✅ 搜索和筛选功能
- ✅ 分页功能
- ✅ 管理后台 CRUD
- ✅ 多方式数据导入
- ✅ 登录认证
- ✅ 域名访问控制

### v1.1 (规划中)
- 🔲 AI 模型标签功能（支持按 Midjourney/DALL-E/Stable Diffusion 等模型筛选）
- 🔲 自动标签推断（根据提示词内容自动推荐/填充标签）
- 🔲 标签缺失提醒（导入时提示标签为空的记录）
- 🔲 提示词收藏功能
- 🔲 用户评分系统
- 🔲 提示词详情页
- 🔲 分享功能

### v2.0 (远期规划)
- 🔲 多用户系统
- 🔲 提示词投稿
- 🔲 AI 推荐
- 🔲 API 开放接口

---

## 7. 附录

### 7.1 环境变量清单

| 变量名 | 描述 | 默认值 |
|--------|------|--------|
| `DATABASE_URL` | 数据库连接字符串 | - |
| `ADMIN_USERNAME` | 管理员用户名 | admin |
| `ADMIN_PASSWORD` | 管理员密码 | admin123 |
| `AUTH_SECRET` | Token 签名密钥 | your-secret-key... |
| `NEXT_PUBLIC_SHOW_ADMIN_ENTRY` | 是否显示管理入口 | true |
| `NEXT_PUBLIC_ADMIN_ALLOWED_DOMAINS` | 允许访问的域名 | (全部允许) |

### 7.2 默认 AI 模型标签

| 模型名称 | 类型 | 说明 |
|----------|------|------|
| Midjourney | 文生图 | Discord 机器人形式的 AI 绘画工具 |
| DALL-E 3 | 文生图 | OpenAI 开发的图像生成模型 |
| Stable Diffusion | 文生图 | 开源文生图模型 |
| Flux | 文生图 | Black Forest Labs 开发的开源模型 |
| Leonardo.AI | 文生图 | 在线 AI 图像生成平台 |
| ComfyUI | 文生图 | 节点式图像生成工作流 |
| Runway | 文生视频 | AI 视频生成平台 |
| Sora | 文生视频 | OpenAI 视频生成模型 |
| Pika | 文生视频 | AI 视频生成工具 |
| Kling（可灵）| 文生视频 | 快手 AI 视频生成 |
| Suno | 文生音频 | AI 音乐生成 |
| Udio | 文生音频 | AI 音乐创作 |
| DeepSeek | 多模态 | 深度求索大模型 |
| Banana | 其他 | AI 模型部署平台 |
| 其他模型 | 通用 | 未分类的其他 AI 模型 |

### 7.3 API 响应格式

```typescript
// 成功响应
{
  success: true,
  data: T
}

// 失败响应
{
  success: false,
  error: string
}
```

### 7.4 参考文档

- [快速开始指南](./QUICKSTART.md)
- [部署指南](./DEPLOYMENT.md)
- [导入指南](./IMPORT_GUIDE.md)
- [CSV 格式指南](./CSV_FORMAT_GUIDE.md)
- [分页功能说明](./PAGINATION_GUIDE.md)

---

*文档结束*

