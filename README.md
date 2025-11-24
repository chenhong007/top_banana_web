# AI 提示词库管理系统

一个现代化的 AI 提示词收集与管理平台，基于 Next.js 14 + TypeScript + Tailwind CSS 构建。

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
- ⚡ 基于文件系统的轻量级数据存储
- 📱 移动端友好的响应式设计

## 技术栈

- **框架**: Next.js 14 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **图标**: Lucide React
- **数据存储**: JSON 文件

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

### 3. 访问应用

- 前端展示页面: http://localhost:3000
- 管理后台: http://localhost:3000/admin

### 4. 导入数据

访问管理后台，点击"导入数据"按钮，支持三种导入方式：

- **CSV 文件**：直接上传从飞书导出的 CSV 文件（推荐）
- **飞书文档**：自动爬取飞书在线文档
- **JSON 数据**：手动粘贴 JSON 格式数据

详细说明请参考：
- [数据导入指南](docs/IMPORT_GUIDE.md)
- [CSV 格式指南](docs/CSV_FORMAT_GUIDE.md)
- [分页功能说明](docs/PAGINATION_GUIDE.md)

## 项目结构

```
topai/
├── app/                          # Next.js App Router
│   ├── (frontend)/              # 前端展示模块
│   │   ├── components/          # 前端组件
│   │   ├── layout.tsx          # 前端布局
│   │   └── page.tsx            # 首页
│   ├── (admin)/                # 后台管理模块
│   │   ├── admin/              # 管理页面
│   │   ├── components/         # 后台组件
│   │   │   ├── import/         # 导入相关子组件
│   │   │   ├── AdminHeader.tsx
│   │   │   ├── PromptForm.tsx
│   │   │   ├── PromptTable.tsx
│   │   │   └── ImportModal.tsx
│   │   └── layout.tsx          # 后台布局
│   ├── api/                     # API 路由
│   │   ├── prompts/            # 提示词 CRUD API
│   │   └── import/             # 数据导入 API
│   ├── layout.tsx              # 根布局
│   └── globals.css             # 全局样式
├── components/                  # 共享组件
│   └── shared/                 # 通用组件
│       ├── LoadingSpinner.tsx
│       ├── EmptyState.tsx
│       ├── Toast.tsx
│       └── ToastContainer.tsx
├── hooks/                       # 自定义 Hooks
│   ├── usePrompts.ts           # 提示词数据管理
│   ├── usePromptForm.ts        # 表单状态管理
│   ├── useSearch.ts            # 搜索过滤逻辑
│   ├── usePagination.ts        # 分页逻辑管理
│   └── useImport.ts            # 导入逻辑管理
├── services/                    # 服务层
│   ├── prompt.service.ts       # 提示词 API 服务
│   └── import.service.ts       # 导入 API 服务
├── types/                       # TypeScript 类型定义
│   ├── index.ts                # 类型导出
│   ├── prompt.ts               # 提示词相关类型
│   ├── api.ts                  # API 相关类型
│   └── import.ts               # 导入相关类型
├── lib/                         # 工具库
│   ├── storage.ts              # 数据存储层
│   ├── constants.ts            # 应用常量
│   ├── styles.ts               # 样式工具
│   ├── error-handler.ts        # 错误处理
│   ├── csv-parser.ts           # CSV 解析
│   └── feishu-scraper.ts       # 飞书爬虫
├── data/                        # 数据目录（自动创建）
│   └── prompts.json            # 提示词数据
├── docs/                        # 文档
│   ├── IMPORT_GUIDE.md         # 导入指南
│   ├── CSV_FORMAT_GUIDE.md     # CSV 格式说明
│   ├── PAGINATION_GUIDE.md     # 分页功能说明
│   └── ARCHITECTURE.md         # 架构设计文档
└── public/                      # 静态资源
```

## 数据模型

每个提示词包含以下字段：

- `effect`: 效果描述
- `description`: 详细说明
- `tags`: 标签数组
- `prompt`: 提示词内容
- `source`: 来源链接
- `imageUrl`: 图片 URL（可选）
- `createdAt`: 创建时间
- `updatedAt`: 更新时间

## API 接口

### 获取所有提示词
```
GET /api/prompts
```

### 获取单个提示词
```
GET /api/prompts/[id]
```

### 创建提示词
```
POST /api/prompts
Content-Type: application/json

{
  "effect": "效果描述",
  "description": "详细说明",
  "tags": ["标签1", "标签2"],
  "prompt": "提示词内容",
  "source": "来源链接",
  "imageUrl": "图片URL（可选）"
}
```

### 更新提示词
```
PUT /api/prompts/[id]
Content-Type: application/json

{
  "effect": "新的效果描述",
  ...
}
```

### 删除提示词
```
DELETE /api/prompts/[id]
```

## 生产环境部署

### 构建项目

```bash
npm run build
```

### 启动生产服务器

```bash
npm start
```

## 架构设计

### 模块化设计

项目采用清晰的模块化架构，遵循 Clean Code 原则：

1. **路由分组 (Route Groups)**
   - `(frontend)`: 用户展示界面
   - `(admin)`: 后台管理界面
   - 清晰的职责分离，避免模块间耦合

2. **服务层 (Services)**
   - `prompt.service.ts`: 封装所有提示词 API 调用
   - `import.service.ts`: 封装所有导入相关 API 调用
   - 统一的错误处理和数据转换

3. **自定义 Hooks**
   - `usePrompts`: 提示词数据管理
   - `usePromptForm`: 表单状态和验证
   - `useSearch`: 搜索和筛选逻辑
   - `usePagination`: 分页逻辑管理
   - `useImport`: 导入流程管理
   - 业务逻辑与 UI 解耦

4. **组件设计**
   - 小型、单一职责的组件
   - 通过 Props 传递数据和回调
   - 最大化可复用性

5. **类型安全**
   - 完整的 TypeScript 类型定义
   - 按功能分类的类型文件
   - 避免 any 类型

6. **常量管理**
   - 集中管理 API 端点
   - 统一的消息文本
   - 配置值集中定义

### 代码规范

- 代码注释使用英文
- 保持代码简洁易懂
- 注意圈复杂度，尽量复用代码
- 遵循模块化设计原则
- 最小化修改范围，避免影响其他模块
- 使用统一的样式类和常量

## 许可证

MIT

