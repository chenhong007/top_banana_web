# 数据导入指南

本文档介绍如何从飞书文档导入数据到系统中。

## 方式一：通过管理后台导入（推荐）

### 1. 访问管理后台

打开浏览器访问：http://localhost:3000/admin

### 2. 点击"导入数据"按钮

在页面右上角点击绿色的"导入数据"按钮。

### 3. 选择导入方式

#### 方式 A：CSV 文件导入（推荐）

1. 选择"CSV 文件"选项卡
2. 点击上传区域选择您的 CSV 文件
3. 系统会自动预览文件内容
4. 选择导入模式（合并/替换）
5. 点击"开始导入"

**CSV 格式要求：**
- 第一行必须是标题行（字段名）
- 支持的字段名：
  - 效果 / effect（必填）
  - 描述 / description（必填）
  - 提示词 / prompt（必填）
  - 引用来源 / 来源 / source（必填）
  - 评测对象 / tags / 标签（可选，用逗号分隔）
  - 参考图 / imageUrl / 图片（可选）
  - 创建时间 / createdAt（可选）
  - 最后更新时间 / updatedAt（可选）

### 方式 B：飞书文档直接导入

1. 选择"飞书文档"选项卡
2. 输入飞书文档链接：
   ```
   https://u55dyuejxc.feishu.cn/wiki/S5nowuX3uiHXq4kNPb3c7cPpngh?table=tblJT29vyAEQmZzq&view=vewBBRuwm1
   ```

3. **如果文档需要登录**：
   - 在浏览器中打开飞书文档并登录
   - 按 F12 打开开发者工具
   - 进入 Application (Chrome) 或 Storage (Firefox) 标签
   - 在 Cookies 部分找到 `feishu.cn` 的 Cookie
   - 复制整个 Cookie 字符串粘贴到"Cookie"输入框

4. 选择导入模式：
   - **合并**：只导入不重复的数据（根据"效果"字段判断）
   - **替换**：清空现有数据后导入

5. 点击"开始导入"

#### 方式 C：JSON 数据导入

如果飞书文档无法直接访问，可以手动导出数据：

1. 在飞书文档中，导出表格数据
2. 转换为以下 JSON 格式：

```json
[
  {
    "效果": "生成产品营销文案",
    "描述": "帮助你快速生成吸引人的产品营销文案",
    "标签": "营销,文案,电商",
    "提示词": "请为以下产品生成一段吸引人的营销文案...",
    "来源": "https://example.com",
    "图片": "https://example.com/image.jpg"
  }
]
```

3. 选择"JSON 数据"选项卡
4. 粘贴 JSON 数据
5. 选择导入模式并点击"开始导入"

## 方式二：使用命令行脚本

### 1. 导出飞书数据

从飞书文档手动导出表格数据，保存为 `scripts/feishu-data.json`

### 2. 运行导入脚本

```bash
npm install
npx tsx scripts/import-feishu.ts
```

## 数据字段说明

系统支持以下字段名（中英文皆可）：

| 字段 | 别名 | 是否必填 | 说明 |
|------|------|---------|------|
| effect / 效果 | title | ✅ 必填 | 提示词效果/标题 |
| description / 描述 | desc | ✅ 必填 | 详细描述 |
| prompt / 提示词 | content | ✅ 必填 | 提示词内容 |
| source / 来源 | 提示词来源 | ✅ 必填 | 来源链接 |
| tags / 标签 | 评测对象 | 可选 | 标签（数组或逗号分隔字符串） |
| imageUrl / 图片 | image | 可选 | 图片 URL |
| createdAt / 创建时间 | - | 可选 | 创建时间（ISO 格式） |
| updatedAt / 更新时间 | - | 可选 | 更新时间（ISO 格式） |

## 示例数据格式

### 中文字段

```json
[
  {
    "效果": "代码审查助手",
    "描述": "帮助开发者进行代码审查，识别潜在问题",
    "标签": "开发,代码审查,技术",
    "提示词": "请对以下代码进行详细审查...",
    "来源": "https://example.com",
    "图片": ""
  }
]
```

### 英文字段

```json
[
  {
    "effect": "Code Review Assistant",
    "description": "Help developers review code and identify potential issues",
    "tags": ["development", "code-review", "tech"],
    "prompt": "Please review the following code...",
    "source": "https://example.com",
    "imageUrl": ""
  }
]
```

## 常见问题

### Q: 导入后为什么看不到数据？

A: 检查导入结果提示，可能是因为：
- 数据格式不正确
- 必填字段缺失
- 选择了"合并"模式但数据已存在（效果字段重复）

### Q: 飞书文档需要登录怎么办？

A: 有两种方法：
1. 提供 Cookie（参考上面的步骤）
2. 手动导出数据使用 JSON 导入

### Q: 导入的数据可以批量修改吗？

A: 可以。导出现有数据，修改后重新导入（选择"替换"模式）。

### Q: 如何导出当前数据？

A: 访问 http://localhost:3000/api/prompts 获取 JSON 格式的所有数据。

## 技术支持

如有问题，请查看：
- 项目 README.md
- API 文档
- 控制台错误信息

