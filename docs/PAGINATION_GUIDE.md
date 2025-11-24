# 前台分页功能说明

## 功能概述

前台页面现已支持分页加载功能，提升大数据量下的页面性能和用户体验。

## 主要特性

### 1. 分页加载
- **默认每页显示数量**: 12 条
- **可配置的分页大小**: 用户可以在 6、12、24、48 条之间切换
- **智能分页导航**: 
  - 显示当前页码
  - 提供上一页/下一页按钮
  - 智能省略中间页码（显示省略号）
  - 始终显示首页和尾页

### 2. 标签筛选
- 搜索框下方显示所有可用标签
- 点击标签可筛选对应内容
- "全部"按钮清除标签筛选
- 切换标签时自动重置到第一页

### 3. 搜索功能
- 支持搜索提示词、效果或描述
- 实时过滤结果
- 搜索时自动重置到第一页

### 4. 性能优化
- 只渲染当前页的卡片，减少 DOM 节点
- 图片懒加载（已有）
- 筛选和分页逻辑通过 useMemo 优化

## 配置说明

### 修改默认分页大小

在 `lib/constants.ts` 文件中修改：

```typescript
export const DEFAULTS = {
  // ... 其他配置
  PAGE_SIZE: 12, // 修改此值可更改默认每页显示数量
  PAGE_SIZE_OPTIONS: [6, 12, 24, 48], // 修改此数组可更改可选的分页大小
} as const;
```

### 推荐配置

- **小型数据集（< 100 条）**: PAGE_SIZE: 12
- **中型数据集（100-500 条）**: PAGE_SIZE: 24
- **大型数据集（> 500 条）**: PAGE_SIZE: 48

## 组件说明

### 1. `usePagination` Hook
位置：`hooks/usePagination.ts`

负责管理分页状态和逻辑：
- 当前页码
- 每页大小
- 总页数计算
- 分页数据切片
- 页码跳转逻辑

### 2. `Pagination` 组件
位置：`app/(frontend)/components/Pagination.tsx`

提供分页 UI：
- 页码显示和跳转
- 上一页/下一页按钮
- 每页显示数量选择器
- 总条数显示

### 3. `useSearch` Hook 增强
位置：`hooks/useSearch.ts`

新增特性：
- 支持筛选变更回调
- 与分页配合使用

## 使用示例

```typescript
import { usePagination } from '@/hooks/usePagination';
import { useSearch } from '@/hooks/useSearch';
import Pagination from '@/components/Pagination';

function MyComponent() {
  const { prompts, loading } = usePrompts();
  const { filteredPrompts, /* ... */ } = useSearch(prompts);
  const pagination = usePagination(filteredPrompts); // 使用默认配置
  // 或者
  const pagination = usePagination(filteredPrompts, 24); // 自定义初始大小

  return (
    <>
      {/* 显示当前页数据 */}
      <div className="grid grid-cols-3 gap-6">
        {pagination.paginatedItems.map(item => (
          <Card key={item.id} data={item} />
        ))}
      </div>

      {/* 分页控件 */}
      <Pagination
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        totalItems={pagination.totalItems}
        pageSize={pagination.pageSize}
        onPageChange={pagination.goToPage}
        onPageSizeChange={pagination.changePageSize}
        hasNextPage={pagination.hasNextPage}
        hasPreviousPage={pagination.hasPreviousPage}
      />
    </>
  );
}
```

## 用户交互流程

1. **页面加载**
   - 加载所有数据
   - 应用搜索和标签筛选
   - 显示第一页内容

2. **搜索/筛选**
   - 输入搜索词或点击标签
   - 自动重置到第一页
   - 更新分页控件

3. **切换页码**
   - 点击页码或上下页按钮
   - 平滑切换到对应页面
   - 保持筛选条件

4. **调整每页大小**
   - 选择不同的每页显示数量
   - 自动重置到第一页
   - 重新计算总页数

## 性能优化建议

1. **图片优化**
   - 确保图片使用 `loading="lazy"` 属性
   - 使用适当的图片尺寸和格式

2. **虚拟滚动**
   - 如果单页数据量超过 100 条，考虑实现虚拟滚动

3. **服务端分页**
   - 数据量超过 1000 条时，建议实现服务端分页
   - 修改 API 支持分页参数

## 未来改进方向

- [ ] URL 参数同步（支持页码书签）
- [ ] 服务端分页支持
- [ ] 虚拟滚动优化
- [ ] 预加载相邻页数据
- [ ] 分页状态持久化

