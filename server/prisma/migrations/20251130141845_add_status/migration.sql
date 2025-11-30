-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Ad" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL DEFAULT '匿名用户',
    "description" TEXT NOT NULL,
    "imageUrls" TEXT NOT NULL DEFAULT '[]',
    "videoUrls" TEXT NOT NULL DEFAULT '[]',
    "targetUrl" TEXT NOT NULL,
    "price" DECIMAL NOT NULL,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Ad" ("author", "clicks", "createdAt", "description", "id", "imageUrls", "price", "targetUrl", "title", "updatedAt", "videoUrls") SELECT "author", "clicks", "createdAt", "description", "id", "imageUrls", "price", "targetUrl", "title", "updatedAt", "videoUrls" FROM "Ad";
DROP TABLE "Ad";
ALTER TABLE "new_Ad" RENAME TO "Ad";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
