-- CreateTable
CREATE TABLE "ExamResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "score" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "timeTaken" INTEGER NOT NULL,
    "results" TEXT NOT NULL
);
