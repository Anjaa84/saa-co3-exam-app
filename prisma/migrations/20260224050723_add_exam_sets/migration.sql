/*
  Warnings:

  - Added the required column `examSetId` to the `ExamResult` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "ExamSet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "setNumber" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL,
    "questionIds" TEXT NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ExamResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "score" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "timeTaken" INTEGER NOT NULL,
    "results" TEXT NOT NULL,
    "examSetId" TEXT NOT NULL,
    CONSTRAINT "ExamResult_examSetId_fkey" FOREIGN KEY ("examSetId") REFERENCES "ExamSet" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ExamResult" ("date", "id", "results", "score", "timeTaken", "total") SELECT "date", "id", "results", "score", "timeTaken", "total" FROM "ExamResult";
DROP TABLE "ExamResult";
ALTER TABLE "new_ExamResult" RENAME TO "ExamResult";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "ExamSet_setNumber_key" ON "ExamSet"("setNumber");
