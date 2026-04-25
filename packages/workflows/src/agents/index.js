import { agencyDeliveryPipeline } from "./agency-delivery.js";
import { adsWarriorPipeline } from "./ads-warrior.js";
import { crmLoyaltyPipeline } from "./crm-loyalty.js";
import { creativeStudioPipeline } from "./creative-studio.js";
import { ecommerceGrowthPipeline } from "./ecommerce-growth.js";
import { facebookGrowthPipeline } from "./facebook-growth.js";
import { funnelBuilderPipeline } from "./funnel-builder.js";
import { localGrowthPipeline } from "./local-growth.js";
import { membershipBuilderPipeline } from "./membership-builder.js";
import { paidMediaPipeline } from "./paid-media.js";
import { shopBuilderPipeline } from "./shop-builder.js";
import { socialAutomationPipeline } from "./social-automation.js";
import { socialEngagementPipeline } from "./social-engagement.js";
import { socialMonetizationPipeline } from "./social-monetization.js";
import { voiceoverPipeline } from "./voiceover.js";
import { websiteBuilderPipeline } from "./website-builder.js";
import { websiteMultilangPipeline } from "./website-multilang.js";
const pipelineRegistry = {
    // Phase 1
    creative_studio: creativeStudioPipeline,
    website_builder: websiteBuilderPipeline,
    voiceover: voiceoverPipeline,
    paid_media: paidMediaPipeline,
    // Phase 2a – Family C: Web & E-commerce
    website_multilang: websiteMultilangPipeline,
    funnel_builder: funnelBuilderPipeline,
    agency_delivery: agencyDeliveryPipeline,
    shop_builder: shopBuilderPipeline,
    ecommerce_growth: ecommerceGrowthPipeline,
    // Phase 2a – Family D: Social Media
    social_automation: socialAutomationPipeline,
    facebook_growth: facebookGrowthPipeline,
    social_engagement: socialEngagementPipeline,
    social_monetization: socialMonetizationPipeline,
    // Phase 2a – Family E: Ads & CRM
    ads_warrior: adsWarriorPipeline,
    crm_loyalty: crmLoyaltyPipeline,
    // Phase 2a – Family H: Membership & Local
    membership_builder: membershipBuilderPipeline,
    local_growth: localGrowthPipeline
};
export function getAgentPipeline(agentType) {
    return pipelineRegistry[agentType];
}
export { 
// Phase 1
creativeStudioPipeline, paidMediaPipeline, voiceoverPipeline, websiteBuilderPipeline, 
// Phase 2a
agencyDeliveryPipeline, adsWarriorPipeline, crmLoyaltyPipeline, ecommerceGrowthPipeline, facebookGrowthPipeline, funnelBuilderPipeline, localGrowthPipeline, membershipBuilderPipeline, shopBuilderPipeline, socialAutomationPipeline, socialEngagementPipeline, socialMonetizationPipeline, websiteMultilangPipeline };
