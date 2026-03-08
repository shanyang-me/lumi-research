-- CreateTable
CREATE TABLE "PipelineTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "stage" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'todo',
    "type" TEXT NOT NULL DEFAULT 'manual',
    "agentRole" TEXT,
    "output" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "projectId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PipelineTask_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "problem" TEXT,
    "successCriteria" TEXT,
    "motivation" TEXT,
    "approach" TEXT,
    "timeline" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "currentStage" TEXT NOT NULL DEFAULT 'define',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Project" ("approach", "createdAt", "description", "id", "motivation", "name", "problem", "status", "successCriteria", "timeline", "updatedAt") SELECT "approach", "createdAt", "description", "id", "motivation", "name", "problem", "status", "successCriteria", "timeline", "updatedAt" FROM "Project";
DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "PipelineTask_projectId_stage_idx" ON "PipelineTask"("projectId", "stage");
