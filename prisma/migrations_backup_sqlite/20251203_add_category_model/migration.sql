-- 创建 Category 表（生成类型类别）
CREATE TABLE IF NOT EXISTS "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- 创建 ModelTag 表（AI模型标签）
CREATE TABLE IF NOT EXISTS "ModelTag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "color" TEXT,
    "type" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModelTag_pkey" PRIMARY KEY ("id")
);

-- 创建 Prompt 和 ModelTag 的多对多关联表
CREATE TABLE IF NOT EXISTS "_ModelTagToPrompt" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- 添加 categoryId 到 Prompt 表
ALTER TABLE "Prompt" ADD COLUMN IF NOT EXISTS "categoryId" TEXT;

-- 创建唯一索引
CREATE UNIQUE INDEX IF NOT EXISTS "Category_name_key" ON "Category"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "ModelTag_name_key" ON "ModelTag"("name");

-- 创建关联表索引
CREATE UNIQUE INDEX IF NOT EXISTS "_ModelTagToPrompt_AB_unique" ON "_ModelTagToPrompt"("A", "B");
CREATE INDEX IF NOT EXISTS "_ModelTagToPrompt_B_index" ON "_ModelTagToPrompt"("B");

-- 添加外键约束
ALTER TABLE "Prompt" ADD CONSTRAINT "Prompt_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "_ModelTagToPrompt" ADD CONSTRAINT "_ModelTagToPrompt_A_fkey" FOREIGN KEY ("A") REFERENCES "ModelTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_ModelTagToPrompt" ADD CONSTRAINT "_ModelTagToPrompt_B_fkey" FOREIGN KEY ("B") REFERENCES "Prompt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

