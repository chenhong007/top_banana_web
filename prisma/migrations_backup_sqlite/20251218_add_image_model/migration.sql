-- CreateTable
CREATE TABLE "Image" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "originalUrl" TEXT,
    "url" TEXT NOT NULL,
    "fileName" TEXT,
    "contentType" TEXT,
    "size" INTEGER,
    "promptId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Image_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Image_key_key" ON "Image"("key");

-- CreateIndex
CREATE INDEX "Image_promptId_idx" ON "Image"("promptId");

-- CreateIndex
CREATE INDEX "Image_status_idx" ON "Image"("status");

