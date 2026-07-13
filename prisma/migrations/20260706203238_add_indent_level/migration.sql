-- AlterTable
ALTER TABLE "activity_schedule_lines" ADD COLUMN     "indentLevel" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "assessment_lines" ADD COLUMN     "indentLevel" INTEGER NOT NULL DEFAULT 0;
