-- Phase 2a: Add 13 new AgentType values, 4 new AssetType values, and 3 new models

-- AlterEnum: AgentType – add 13 new values
ALTER TYPE "AgentType" ADD VALUE 'website_multilang';
ALTER TYPE "AgentType" ADD VALUE 'funnel_builder';
ALTER TYPE "AgentType" ADD VALUE 'agency_delivery';
ALTER TYPE "AgentType" ADD VALUE 'shop_builder';
ALTER TYPE "AgentType" ADD VALUE 'ecommerce_growth';
ALTER TYPE "AgentType" ADD VALUE 'social_automation';
ALTER TYPE "AgentType" ADD VALUE 'facebook_growth';
ALTER TYPE "AgentType" ADD VALUE 'social_engagement';
ALTER TYPE "AgentType" ADD VALUE 'social_monetization';
ALTER TYPE "AgentType" ADD VALUE 'ads_warrior';
ALTER TYPE "AgentType" ADD VALUE 'crm_loyalty';
ALTER TYPE "AgentType" ADD VALUE 'membership_builder';
ALTER TYPE "AgentType" ADD VALUE 'local_growth';

-- AlterEnum: AssetType – add 4 new values
ALTER TYPE "AssetType" ADD VALUE 'video';
ALTER TYPE "AssetType" ADD VALUE 'music';
ALTER TYPE "AssetType" ADD VALUE 'spreadsheet';
ALTER TYPE "AssetType" ADD VALUE 'delivery_pack';

-- CreateTable: social_calendars
CREATE TABLE "social_calendars" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "job_id" UUID,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "platform" TEXT NOT NULL,
    "posts_json" JSONB NOT NULL,
    "hashtags_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_calendars_pkey" PRIMARY KEY ("id")
);

-- CreateTable: product_catalogs
CREATE TABLE "product_catalogs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "job_id" UUID,
    "catalog_name" TEXT NOT NULL,
    "products_json" JSONB NOT NULL,
    "seo_summary_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_catalogs_pkey" PRIMARY KEY ("id")
);

-- CreateTable: membership_plans
CREATE TABLE "membership_plans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "job_id" UUID,
    "plan_name" TEXT NOT NULL,
    "plans_json" JSONB NOT NULL,
    "onboarding_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "membership_plans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "social_calendars_project_id_idx" ON "social_calendars"("project_id");

-- CreateIndex
CREATE INDEX "product_catalogs_project_id_idx" ON "product_catalogs"("project_id");

-- CreateIndex
CREATE INDEX "membership_plans_project_id_idx" ON "membership_plans"("project_id");

-- AddForeignKey
ALTER TABLE "social_calendars" ADD CONSTRAINT "social_calendars_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_catalogs" ADD CONSTRAINT "product_catalogs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_plans" ADD CONSTRAINT "membership_plans_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
