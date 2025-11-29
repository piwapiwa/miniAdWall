/*
  Warnings:

  - You are about to drop the column `imageUrl` on the `Ad` table. All the data in the column will be lost.
  - You are about to drop the column `videoUrl` on the `Ad` table. All the data in the column will be lost.

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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Ad" ("clicks", "createdAt", "description", "id", "price", "targetUrl", "title", "updatedAt") SELECT "clicks", "createdAt", "description", "id", "price", "targetUrl", "title", "updatedAt" FROM "Ad";
DROP TABLE "Ad";
ALTER TABLE "new_Ad" RENAME TO "Ad";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
