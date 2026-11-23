-- AlterTable
ALTER TABLE "announcements" ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "isPinned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "publishOn" TEXT DEFAULT 'Today';

-- AlterTable
ALTER TABLE "portal_settings" ADD COLUMN     "allowRetakes" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "defaultLanguage" TEXT NOT NULL DEFAULT 'English',
ADD COLUMN     "detectTabSwitching" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "requireAdminApproval" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "restrictOrgEmails" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "sendDeadlineReminders" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "timeZone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
ALTER COLUMN "portalName" SET DEFAULT 'Capacity Connect - India Meteorological Department';
