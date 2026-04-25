import assert from "node:assert/strict";
import test from "node:test";
import type { ParsedBriefByAgentType } from "@agents-marketing/types";
import { executeCreativeStudioPipeline } from "./creative-studio.js";

const mockParsedBrief: ParsedBriefByAgentType<"creative_studio"> = {
  agentType: "creative_studio",
  title: "Lancement Nova Coffee",
  summary: "Créer des visuels premium pour le lancement d'une nouvelle boisson caféinée.",
  objectives: ["Générer de l'engagement", "Mettre en avant le branding"],
  targetAudience: ["Entrepreneurs", "Créateurs de contenu"],
  keyMessages: ["Boost your day", "100% arabica"],
  deliverables: ["Post Instagram", "Logo"],
  constraints: ["Respecter une palette brun moka et crème"],
  references: ["https://cdn.example.com/reference-hero.png"],
  tone: "premium énergique",
  callToAction: "Commandez maintenant",
  locale: "fr-FR",
  budget: null,
  timeline: null,
  successMetrics: ["CTR"],
  missingInformation: [],
  memoryContext: {
    brand: {
      brandId: null,
      brandName: "Nova Coffee",
      websiteUrl: null,
      industry: "Food & Beverage",
      targetAudience: "Entrepreneurs",
      toneOfVoice: "premium énergique",
      brandGuidelines: null
    },
    facts: [],
    preferences: [],
    constraints: [],
    approvedExamples: [],
    entries: []
  },
  agentDetails: {
    subject: "Nova Coffee iced latte",
    desiredStyle: "premium lifestyle studio",
    assetFormats: ["Post Instagram", "Logo"],
    requestedFormats: ["Post Instagram", "Logo"],
    visualDirections: ["Hero produit", "Lifestyle haut de gamme"],
    copyToInclude: ["Boost your day", "Commandez maintenant"],
    brandingColors: ["moka", "crème"],
    brandingNotes: ["Style moderne", "Typographie nette"],
    logoRequested: true,
    deliverableCount: 3,
    visualReferences: ["https://cdn.example.com/reference-hero.png"]
  }
};

test("executeCreativeStudioPipeline génère un package structuré avec variantes et formats", async () => {
  const storedPaths: string[] = [];
  const result = await executeCreativeStudioPipeline(
    {
      jobId: "job-test",
      projectId: "project-test",
      briefId: "brief-test",
      organizationId: "org-test",
      agentType: "creative_studio",
      parsedBrief: mockParsedBrief
    },
    {
      log: {
        info() {},
        warn() {},
        error() {}
      },
      async runTrackedStep(_step, handler) {
        return handler();
      },
      async updateProgress() {},
      async generatePromptPlan() {
        return {
          creativeStrategy: "Mixer branding premium et performance social media.",
          formatPlans: [
            {
              formatId: "instagram_post",
              variants: [
                {
                  formatId: "instagram_post",
                  title: "Hero impact",
                  prompt: "Premium hero visual for Nova Coffee",
                  rationale: "Met le produit en avant.",
                  providerHint: "flux_kontext",
                  textOverlay: ["Boost your day"],
                  logoFocus: false
                },
                {
                  formatId: "instagram_post",
                  title: "Lifestyle créateur",
                  prompt: "Lifestyle creator desk visual for Nova Coffee",
                  rationale: "Montre l'usage quotidien.",
                  providerHint: "seedream",
                  textOverlay: ["Commandez maintenant"],
                  logoFocus: false
                },
                {
                  formatId: "instagram_post",
                  title: "Minimal branding",
                  prompt: "Minimal branding visual for Nova Coffee",
                  rationale: "Focus marque et lisibilité.",
                  providerHint: "seedream",
                  textOverlay: [],
                  logoFocus: false
                }
              ]
            },
            {
              formatId: "logo",
              variants: [
                {
                  formatId: "logo",
                  title: "Logo badge",
                  prompt: "Modern circular logo for Nova Coffee",
                  rationale: "Badge simple.",
                  providerHint: "seedream",
                  textOverlay: [],
                  logoFocus: true
                },
                {
                  formatId: "logo",
                  title: "Logo wordmark",
                  prompt: "Elegant wordmark logo for Nova Coffee",
                  rationale: "Wordmark premium.",
                  providerHint: "seedream",
                  textOverlay: [],
                  logoFocus: true
                },
                {
                  formatId: "logo",
                  title: "Logo monogram",
                  prompt: "Minimal monogram logo for Nova Coffee",
                  rationale: "Monogram mémorable.",
                  providerHint: "seedream",
                  textOverlay: [],
                  logoFocus: true
                }
              ]
            }
          ]
        };
      },
      async generateImage(request) {
        return {
          requestId: `${request.format.id}-${request.variantIndex}`,
          images: [
            {
              url: `https://fal.media/${request.format.id}-${request.variantIndex}.png`,
              width: request.format.width,
              height: request.format.height,
              contentType: "image/png"
            }
          ],
          rawResponse: {}
        };
      },
      async storeImage({ request, image }) {
        const storagePath = `creative-studio/project-test/job-test/${request.format.id}/${request.variantIndex}.png`;
        storedPaths.push(storagePath);
        return {
          bucket: "generated-assets",
          path: storagePath,
          mimeType: image.contentType ?? "image/png",
          sizeBytes: 1024,
          signedUrl: `https://signed.example.com/${request.format.id}/${request.variantIndex}`,
          sourceUrl: image.url,
          width: image.width,
          height: image.height
        };
      },
      async createAssetRecord({ request }) {
        return {
          assetId: `asset-${request.format.id}-${request.variantIndex}`
        };
      }
    }
  );

  assert.equal(result.delivery.type, "creative_package");
  assert.equal(result.delivery.status, "delivered");

  const outputs = result.outputs as {
    logoGenerated: boolean;
    assets: Array<{ provider: string; formatId: string }>;
    assetsByFormat: Record<string, number>;
  };

  assert.equal(outputs.logoGenerated, true);
  assert.equal(outputs.assets.length, 6);
  assert.equal(outputs.assetsByFormat["instagram_post"], 3);
  assert.equal(outputs.assetsByFormat["logo"], 3);
  assert.ok(outputs.assets.some((asset) => asset.provider === "flux_kontext"));
  assert.ok(outputs.assets.some((asset) => asset.formatId === "logo"));
  assert.equal(storedPaths.length, 6);
});