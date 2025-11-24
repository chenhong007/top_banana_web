# 项目架构说明

## 概览

本项目是一个基于 Next.js 14 的现代化 Web 应用，采用 Clean Code 原则进行重构，实现了前后端分离、业务逻辑解耦、类型安全等最佳实践。

## 技术栈

- **框架**: Next.js 14 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **状态管理**: React Hooks
- **数据存储**: 文件系统 (JSON)

## 分层架构

```
┌─────────────────────────────────────┐
│         Presentation Layer          │  UI 组件层
│    (Components, Pages, Layouts)     │
├─────────────────────────────────────┤
│         Business Logic Layer        │  业务逻辑层
│           (Custom Hooks)            │
├─────────────────────────────────────┤
│          Service Layer              │  服务层
│    (API Services, Data Access)      │
├─────────────────────────────────────┤
│          Infrastructure             │  基础设施层
│  (Storage, Constants, Utilities)    │
└─────────────────────────────────────┘
```

## 核心设计模式

### 1. 模块化设计 (Route Groups)

使用 Next.js 的路由分组功能实现模块隔离：

```
app/
├── (frontend)/      # 前端展示模块
└── (admin)/         # 后台管理模块
```

**优势**：
- 清晰的职责分离
- 独立的布局和样式
- 避免模块间耦合
- 便于团队协作

### 2. 服务层模式 (Service Layer)

所有 API 调用都通过服务层封装：

```typescript
// services/prompt.service.ts
class PromptService {
  async getAll(): Promise<PromptItem[]> { }
  async create(data: CreatePromptRequest): Promise<PromptItem> { }
  async update(id: string, data: Partial<CreatePromptRequest>): Promise<PromptItem> { }
  async delete(id: string): Promise<void> { }
}
```

**优势**：
- 统一的错误处理
- 集中管理 API 端点
- 易于测试和维护
- 减少代码重复

### 3. 自定义 Hooks 模式

将业务逻辑从组件中提取到自定义 Hooks：

```typescript
// hooks/usePrompts.ts
export function usePrompts() {
  const [prompts, setPrompts] = useState<PromptItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Business logic here
  
  return { prompts, loading, refetch, setPrompts };
}
```

**优势**：
- UI 与业务逻辑分离
- 提高可复用性
- 便于单元测试
- 降低组件复杂度

### 4. 组件拆分原则

遵循单一职责原则，拆分大型组件：

**Before**: `admin/page.tsx` (296 行)
**After**: 
- `AdminHeader.tsx` (40 行)
- `PromptForm.tsx` (149 行)
- `PromptTable.tsx` (80 行)
- `admin/page.tsx` (106 行)

**原则**：
- 每个组件专注于单一功能
- 组件大小控制在 150 行以内
- 通过 Props 传递数据
- 避免深层嵌套

### 5. 类型安全

按功能分类管理类型定义：

```
types/
├── index.ts      # 中央导出
├── prompt.ts     # 提示词类型
├── api.ts        # API 类型
└── import.ts     # 导入类型
```

**优势**：
- 避免循环依赖
- 便于维护和扩展
- 提高代码可读性
- 编译时类型检查

### 6. 常量管理

集中管理应用常量：

```typescript
// lib/constants.ts
export const API_ENDPOINTS = {
  PROMPTS: '/api/prompts',
  IMPORT_CSV: '/api/import/csv',
  // ...
} as const;

export const MESSAGES = {
  SUCCESS: {
    IMPORT: (count: number) => `成功导入 ${count} 条数据！`,
  },
  ERROR: {
    IMPORT: '导入失败',
  },
} as const;
```

**优势**：
- 消除魔法字符串
- 统一修改配置
- 便于国际化
- 类型安全的常量

### 7. 样式工具化

统一管理样式类：

```typescript
// lib/styles.ts
export const BUTTON_STYLES = {
  primary: 'px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 ...',
  secondary: 'px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg ...',
} as const;
```

**优势**：
- 避免样式重复
- 统一视觉风格
- 便于主题切换
- 减少代码量

### 8. 错误处理

集中的错误处理和用户提示：

```typescript
// lib/error-handler.ts
export function formatErrorMessage(error: unknown): string { }
export function logError(error: unknown, context?: string): void { }

// components/shared/ToastContainer.tsx
export function useToast() {
  return {
    showSuccess: (message: string) => { },
    showError: (message: string) => { },
  };
}
```

**优势**：
- 统一的错误格式
- 友好的用户提示
- 便于错误追踪
- 提升用户体验

## 数据流

```
User Action
    ↓
Component (UI)
    ↓
Custom Hook (Business Logic)
    ↓
Service Layer (API Call)
    ↓
API Route (Backend)
    ↓
Storage Layer (File System)
    ↓
Response
    ↓
Update UI
```

## 目录职责

| 目录 | 职责 | 依赖规则 |
|------|------|---------|
| `app/` | 路由和页面 | 可依赖所有层 |
| `components/` | UI 组件 | 仅依赖 hooks, types, lib |
| `hooks/` | 业务逻辑 | 可依赖 services, types, lib |
| `services/` | API 调用 | 可依赖 types, lib |
| `lib/` | 工具函数 | 可依赖 types |
| `types/` | 类型定义 | 不依赖其他模块 |

## 重构历程

### 阶段一：目录结构重构
- 使用 Route Groups 分离前后端
- 组件按模块组织
- 共享组件独立目录

### 阶段二：服务层和错误处理
- 创建 API 服务层
- 实现 Toast 通知系统
- 集中错误处理逻辑

### 阶段三：业务逻辑抽取
- 提取自定义 Hooks
- 拆分大型组件
- 降低组件复杂度

### 阶段四：类型和常量管理
- 类型定义分类
- 创建常量管理文件
- 消除魔法字符串

### 阶段五：样式和文档
- 统一样式类
- 完善项目文档
- 代码注释优化

## 性能优化

1. **代码分割**: 使用动态导入减少初始加载
2. **缓存策略**: 合理使用 React 状态缓存
3. **组件优化**: 避免不必要的重渲染
4. **打包优化**: Tree shaking 和代码压缩

## 测试策略

- **单元测试**: Hooks 和工具函数
- **集成测试**: API 路由
- **E2E 测试**: 关键用户流程

## 未来扩展

1. **数据库支持**: 替换文件存储为数据库
2. **用户认证**: 添加用户系统
3. **权限管理**: 实现角色权限控制
4. **国际化**: 支持多语言
5. **主题切换**: 支持暗黑模式
6. **性能监控**: 集成性能分析工具

## 最佳实践

1. 始终使用 TypeScript 类型
2. 组件保持小而专注
3. 业务逻辑放在 Hooks 中
4. 使用服务层调用 API
5. 常量和样式统一管理
6. 保持代码注释清晰
7. 遵循命名规范
8. 编写可测试的代码

## 参考资料

- [Next.js Documentation](https://nextjs.org/docs)
- [React Hooks](https://react.dev/reference/react)
- [Clean Code Principles](https://www.amazon.com/Clean-Code-Handbook-Software-Craftsmanship/dp/0132350882)
- [TypeScript Best Practices](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)

