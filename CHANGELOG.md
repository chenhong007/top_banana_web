# Changelog

## [Unreleased]

### 新增
- 标签管理 API `/api/tags` (CRUD)
- `TagInput` 标签选择组件 - 支持选择、搜索、新建、编辑、删除标签

### 修复
- 修复后台新建/编辑提示词时 AI 模型标签列表无法显示和选择的问题
  - 原因：`/api/model-tags` 接口返回的是字符串数组而非完整对象
  - 解决：改用 `findAllWithDetails()` 返回包含 id、name、color、type 的完整模型标签数据

### 改进
- 后台提示词表单标签输入改为下拉选择器，与前端保持一致

---

## [1.0.0] - 初始版本

- 提示词 CRUD 和列表展示
- 搜索和标签过滤
- CSV/JSON/飞书导入
- 分页和管理后台认证
