/*
  Warnings:

  - You are about to drop the column `description` on the `tasks` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."tasks" DROP COLUMN "description",
ADD COLUMN     "subtitle" TEXT;
