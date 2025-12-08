/*
  Warnings:

  - You are about to drop the column `author` on the `Ad` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Ad" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "imageUrls" TEXT NOT NULL DEFAULT '[]',
    "videoUrls" TEXT NOT NULL DEFAULT '[]',
    "targetUrl" TEXT NOT NULL,
    "price" DECIMAL NOT NULL,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "likes" INTEGER NOT NULL DEFAULT 0,
    "category" TEXT NOT NULL DEFAULT '其他',
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "userId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Ad_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Ad" ("category", "clicks", "createdAt", "description", "id", "imageUrls", "likes", "price", "status", "targetUrl", "title", "updatedAt", "userId", "videoUrls") SELECT "category", "clicks", "createdAt", "description", "id", "imageUrls", "likes", "price", "status", "targetUrl", "title", "updatedAt", "userId", "videoUrls" FROM "Ad";
DROP TABLE "Ad";
ALTER TABLE "new_Ad" RENAME TO "Ad";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
