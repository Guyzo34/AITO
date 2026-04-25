import { parseJSON } from "@agents-marketing/ai";
import { Prisma, prisma } from "@agents-marketing/db";
import type { ParsedBriefByAgentType } from "@agents-marketing/types";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { AgentPipeline, AgentPipelineContext, AgentPipelineResult } from "./types.js";

// ─── Constants ────────────────────────────────────────────────────────────────

const paidMediaDocumentsBucket = "paid-media-documents";
const openAiModel = "gpt-5.4-mini";

// ─── Type aliases ─────────────────────────────────────────────────────────────

type PaidMediaContext = AgentPipelineContext<"paid_media">;
type PaidMediaParsedBrief = ParsedBriefByAgentType<"paid_media">;

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const marketingAngleSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  hook: z.string().trim().min(1),
  rationale: z.string().trim().min(1),
  targetSegment: z.string().trim().min(1),
  emotionalTrigger: z.string().trim().min(1),
  keyBenefit: z.string().trim().min(1)
});

const campaignAdSchema = z.object({
  name: z.string().trim().min(1),
  format: z.string().trim().min(1),
  angleId: z.string().trim().min(1)
});

const campaignAdSetSchema = z.object({
  name: z.string().trim().min(1),
  targeting: z.string().trim().min(1),
  audienceInsights: z.array(z.string().trim().min(1)).default([]),
  ads: z.array(campaignAdSchema).default([])
});

const campaignSchema = z.object({
  name: z.string().trim().min(1),
  platform: z.string().trim().min(1),
  objective: z.string().trim().min(1),
  budget: z.string().trim().min(1),
  adSets: z.array(campaignAdSetSchema).default([])
});

const marketingStrategySchema = z.object({
  globalStrategy: z.string().trim().min(1),
  angles: z.array(marketingAngleSchema).min(3).max(5),
  campaignStructure: z.object({
    campaigns: z.array(campaignSchema).default([]),
    targetingRecommendations: z.array(z.string().trim().min(1)).default([])
  })
});

const abVariantSchema = z.object({
  variant: z.enum(["A", "B"]),
  headline: z.string().trim().min(1),
  description: z.string().trim().min(1)
});

const adCopySchema = z.object({
  angleId: z.string().trim().min(1),
  platform: z.string().trim().min(1),
  format: z.string().trim().min(1),
  headlines: z.array(z.string().trim().min(1)).min(3),
  descriptions: z.array(z.string().trim().min(1)).min(2),
  cta: z.string().trim().min(1),
  primaryText: z.string().trim().min(1),
  abVariants: z.array(abVariantSchema).min(2)
});

const adCopiesSchema = z.object({
  copies: z.array(adCopySchema).default([])
});

const creativeBriefSchema = z.object({
  angleId: z.string().trim().min(1),
  visualDescription: z.string().trim().min(1),
  format: z.string().trim().min(1),
  platform: z.string().trim().min(1),
  colorDirections: z.array(z.string().trim().min(1)).default([]),
  copyToInclude: z.array(z.string().trim().min(1)).default([]),
  moodAndStyle: z.string().trim().min(1)
});

const creativeBriefsSchema = z.object({
  briefs: z.array(creativeBriefSchema).default([])
});

const testSchema = z.object({
  testName: z.string().trim().min(1),
  hypothesis: z.string().trim().min(1),
  whatToTest: z.string().trim().min(1),
  budgetAllocation: z.string().trim().min(1),
  kpis: z.array(z.string().trim().min(1)).min(2),
  duration: z.string().trim().min(1),
  successCriteria: z.string().trim().min(1)
});

const testPlanSchema = z.object({
  tests: z.array(testSchema).min(3),
  totalTestBudget: z.string().trim().min(1),
  learningObjectives: z.array(z.string().trim().min(1)).default([])
});

type MarketingStrategy = z.infer<typeof marketingStrategySchema>;
type AdCopies = z.infer<typeof adCopiesSchema>;
type CreativeBriefs = z.infer<typeof creativeBriefsSchema>;
type TestPlan = z.infer<typeof testPlanSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function getSupabaseAdminClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis pour stocker les documents de campagne."
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

async function resolveOrganizationId(projectId: string): Promise<string> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { organizationId: true }
  });

  if (!project) {
    throw new Error(`Projet introuvable: ${projectId}`);
  }

  return project.organizationId;
}

async function createAgentRun(jobId: string, modelName: string) {
  return prisma.agentRun.create({
    data: {
      jobId,
      agentType: "paid_media",
      modelProvider: "openai",
      modelName,
      status: "running",
      startedAt: new Date()
    }
  });
}

async function completeAgentRun(
  runId: string,
  status: "completed" | "failed",
  data?: Partial<{ inputTokens: number; outputTokens: number }>
): Promise<void> {
  await prisma.agentRun.update({
    where: { id: runId },
    data: {
      status,
      finishedAt: new Date(),
      ...(typeof data?.inputTokens === "number" ? { inputTokens: data.inputTokens } : {}),
      ...(typeof data?.outputTokens === "number" ? { outputTokens: data.outputTokens } : {})
    }
  });
}

// ─── Prompt builders ──────────────────────────────────────────────────────────

function buildBriefContext(parsedBrief: PaidMediaParsedBrief): string {
  const offer = parsedBrief.agentDetails.offerOrProduct ?? parsedBrief.title;
  const objective =
    parsedBrief.agentDetails.campaignObjective ?? parsedBrief.objectives[0] ?? "awareness";
  const platforms =
    parsedBrief.agentDetails.platforms.join(", ") || "Facebook, Instagram";
  const budget = parsedBrief.budget ?? "non précisé";
  const audienceList = [
    ...parsedBrief.targetAudience,
    ...parsedBrief.agentDetails.audienceInsights
  ];
  const audience = audienceList.join(", ") || "non précisée";
  const formats = parsedBrief.agentDetails.adFormats.join(", ") || "image, vidéo, carrousel";
  const landingPage = parsedBrief.agentDetails.landingPageUrl ?? "non précisée";
  const messages = parsedBrief.keyMessages.join(", ") || "non précisés";
  const constraints = parsedBrief.constraints.join(", ") || "aucune";
  const tone = parsedBrief.tone ?? "professionnel";

  return [
    `Offre/Produit: ${offer}`,
    `Objectif de campagne: ${objective}`,
    `Plateformes: ${platforms}`,
    `Budget total: ${budget}`,
    `Audience cible: ${audience}`,
    `Formats publicitaires: ${formats}`,
    `URL landing page: ${landingPage}`,
    `Résumé: ${parsedBrief.summary}`,
    `Messages clés: ${messages}`,
    `Contraintes: ${constraints}`,
    `Ton: ${tone}`
  ].join("\n");
}

function buildMarketingStrategyPrompt(parsedBrief: PaidMediaParsedBrief): string {
  return [
    buildBriefContext(parsedBrief),
    "",
    "Instructions pour la stratégie marketing:",
    "- Génère 3 à 5 angles marketing distincts, chacun ciblant un segment ou déclencheur émotionnel différent.",
    "- Chaque angle doit avoir un hook percutant, un bénéfice clé unique et un rationale clair.",
    "- Crée une structure de campagne complète par plateforme: campaigns, ad sets avec ciblage, ads.",
    "- Inclus des recommandations de ciblage précises et actionnables (intérêts, comportements, lookalikes).",
    "- La stratégie doit être alignée avec l'objectif et le budget définis.",
    "- Utilise des IDs d'angles courts: angle_1, angle_2, etc."
  ].join("\n");
}

function buildAdCopiesPrompt(
  parsedBrief: PaidMediaParsedBrief,
  strategy: MarketingStrategy
): string {
  const anglesJson = JSON.stringify(strategy.angles, null, 2);
  const platforms =
    parsedBrief.agentDetails.platforms.length > 0
      ? parsedBrief.agentDetails.platforms
      : ["Facebook", "Instagram"];

  return [
    buildBriefContext(parsedBrief),
    "",
    "Angles marketing générés:",
    anglesJson,
    "",
    `Plateformes cibles: ${platforms.join(", ")}`,
    "",
    "Instructions pour les copies publicitaires:",
    "- Pour chaque angle × plateforme, génère: 3+ headlines, 2+ descriptions, 1 CTA fort, 1 primary text.",
    "- Crée 2 variantes A/B par combinaison (variant: 'A' et variant: 'B').",
    "- Les copies doivent être prêtes à l'emploi, sans placeholder ni crochets.",
    "- Adapte le format et la longueur aux spécificités de chaque plateforme.",
    "- Facebook/Instagram: primary text impactant, max 125 caractères pour la préview.",
    "- Google Ads: headlines max 30 caractères, descriptions max 90 caractères.",
    "- TikTok: ton conversationnel, court, punchy, accrocher dès les 2 premières secondes.",
    "- Les CTAs doivent être spécifiques à l'offre et à l'objectif de conversion."
  ].join("\n");
}

function buildCreativeBriefsPrompt(
  parsedBrief: PaidMediaParsedBrief,
  strategy: MarketingStrategy
): string {
  const anglesJson = JSON.stringify(strategy.angles, null, 2);
  const brandName =
    parsedBrief.memoryContext.brand.brandName ?? parsedBrief.title;
  const brandTone = parsedBrief.memoryContext.brand.toneOfVoice ?? parsedBrief.tone ?? "professionnel";

  return [
    buildBriefContext(parsedBrief),
    `Marque: ${brandName}`,
    `Ton de marque: ${brandTone}`,
    "",
    "Angles marketing:",
    anglesJson,
    "",
    "Instructions pour les briefs créatifs (destinés au Creative Studio):",
    "- Pour chaque angle, génère un brief visuel complet et précis.",
    "- La description visuelle doit détailler: composition, sujet principal, éclairage, couleurs, typographie.",
    "- Inclus les couleurs de marque et directions stylistiques spécifiques.",
    "- Spécifie le texte exact à intégrer dans le visuel (headline ou CTA).",
    "- Le mood doit correspondre au déclencheur émotionnel de l'angle.",
    "- Précise la plateforme et le format pour adapter les proportions et la lisibilité."
  ].join("\n");
}

function buildTestPlanPrompt(
  parsedBrief: PaidMediaParsedBrief,
  strategy: MarketingStrategy
): string {
  const budget = parsedBrief.budget ?? "non précisé";
  const existingTestIdeas = parsedBrief.agentDetails.testIdeas;
  const angleNames = strategy.angles.map((a) => a.name).join(", ");

  return [
    buildBriefContext(parsedBrief),
    "",
    `Idées de tests existantes: ${existingTestIdeas.join(", ") || "aucune"}`,
    `Angles disponibles: ${angleNames}`,
    `Budget total: ${budget}`,
    "",
    "Instructions pour le plan de test:",
    "- Génère 3 à 5 tests A/B concrets et actionnables.",
    "- Chaque test doit avoir: nom clair, hypothèse précise, quoi tester, budget alloué, KPIs mesurables.",
    "- Inclus durée recommandée et critères de succès chiffrés quand possible.",
    "- Priorise les tests à fort impact et faible risque en premier.",
    "- Le plan doit couvrir plusieurs dimensions: angles créatifs, copies, audiences et formats.",
    "- Alloue un budget de test réaliste par rapport au budget total annoncé.",
    "- Le totalTestBudget doit représenter 20-30% du budget total si connu."
  ].join("\n");
}

// ─── Readable summary ─────────────────────────────────────────────────────────

function buildReadableSummary(
  parsedBrief: PaidMediaParsedBrief,
  strategy: MarketingStrategy,
  adCopies: AdCopies,
  creativeBriefs: CreativeBriefs,
  testPlan: TestPlan
): string {
  const offer = parsedBrief.agentDetails.offerOrProduct ?? parsedBrief.title;
  const platforms =
    parsedBrief.agentDetails.platforms.join(", ") || "Facebook, Instagram";
  const objective =
    parsedBrief.agentDetails.campaignObjective ??
    parsedBrief.objectives[0] ??
    "awareness";
  const budget = parsedBrief.budget ?? "non précisé";

  const anglesLines = strategy.angles
    .map((a, i) => `  ${i + 1}. **${a.name}** — "${a.hook}" (${a.keyBenefit})`)
    .join("\n");

  const testNames = testPlan.tests.map((t) => t.testName).join(", ");

  const targetingLines = strategy.campaignStructure.targetingRecommendations
    .map((r) => `- ${r}`)
    .join("\n");

  return [
    `## Plan de campagne: ${offer}`,
    ``,
    `**Objectif:** ${objective} | **Budget:** ${budget} | **Plateformes:** ${platforms}`,
    ``,
    `### Stratégie globale`,
    strategy.globalStrategy,
    ``,
    `### ${strategy.angles.length} Angles marketing`,
    anglesLines,
    ``,
    `### Copies publicitaires`,
    `${adCopies.copies.length} ensembles de copies générés (headlines, descriptions, CTAs, variantes A/B).`,
    ``,
    `### Briefs créatifs`,
    `${creativeBriefs.briefs.length} briefs visuels prêts pour le Creative Studio.`,
    ``,
    `### Plan de test`,
    `${testPlan.tests.length} tests planifiés: ${testNames}.`,
    `Budget total de test: ${testPlan.totalTestBudget}.`,
    ``,
    `### Recommandations de ciblage`,
    targetingLines || "- Voir la structure de campagne pour les recommandations de ciblage détaillées."
  ].join("\n");
}

// ─── Pipeline execution ───────────────────────────────────────────────────────

export async function executePaidMediaPipeline(
  context: PaidMediaContext
): Promise<AgentPipelineResult> {
  const parsedBrief = context.parsedBrief;
  const offer = parsedBrief.agentDetails.offerOrProduct ?? parsedBrief.title;

  // Step 1: Generate marketing strategy (angles + campaign structure + targeting)
  const strategyRun = await createAgentRun(context.jobId, openAiModel);
  let strategy: MarketingStrategy;

  try {
    strategy = await parseJSON(
      buildMarketingStrategyPrompt(parsedBrief),
      marketingStrategySchema,
      {
        model: openAiModel,
        temperature: 0.7,
        maxOutputTokens: 2_500,
        systemPrompt:
          "Tu es un stratège Paid Media senior. Tu crées des plans de campagne publicitaire complets, précis et directement actionnables."
      }
    );
    await completeAgentRun(strategyRun.id, "completed", {
      inputTokens: Math.ceil(buildMarketingStrategyPrompt(parsedBrief).length / 4),
      outputTokens: Math.ceil(JSON.stringify(strategy).length / 4)
    });
  } catch (error) {
    await completeAgentRun(strategyRun.id, "failed");
    throw error;
  }

  // Step 2: Generate ad copies (headlines, descriptions, CTAs, A/B variants per platform)
  const copiesRun = await createAgentRun(context.jobId, openAiModel);
  let adCopies: AdCopies;

  try {
    adCopies = await parseJSON(
      buildAdCopiesPrompt(parsedBrief, strategy),
      adCopiesSchema,
      {
        model: openAiModel,
        temperature: 0.75,
        maxOutputTokens: 3_500,
        systemPrompt:
          "Tu es un copywriter expert en publicité digitale. Tu écris des copies percutantes, prêtes à déployer sur les plateformes paid media, sans aucun placeholder."
      }
    );
    await completeAgentRun(copiesRun.id, "completed", {
      inputTokens: Math.ceil(buildAdCopiesPrompt(parsedBrief, strategy).length / 4),
      outputTokens: Math.ceil(JSON.stringify(adCopies).length / 4)
    });
  } catch (error) {
    await completeAgentRun(copiesRun.id, "failed");
    throw error;
  }

  // Step 3: Generate creative briefs (visual recommendations for Creative Studio)
  const creativeBriefsRun = await createAgentRun(context.jobId, openAiModel);
  let creativeBriefs: CreativeBriefs;

  try {
    creativeBriefs = await parseJSON(
      buildCreativeBriefsPrompt(parsedBrief, strategy),
      creativeBriefsSchema,
      {
        model: openAiModel,
        temperature: 0.6,
        maxOutputTokens: 2_000,
        systemPrompt:
          "Tu es un directeur artistique spécialisé en publicité digitale. Tu écris des briefs créatifs précis et détaillés pour la génération d'images publicitaires."
      }
    );
    await completeAgentRun(creativeBriefsRun.id, "completed", {
      inputTokens: Math.ceil(buildCreativeBriefsPrompt(parsedBrief, strategy).length / 4),
      outputTokens: Math.ceil(JSON.stringify(creativeBriefs).length / 4)
    });
  } catch (error) {
    await completeAgentRun(creativeBriefsRun.id, "failed");
    throw error;
  }

  // Step 4: Generate test plan (what to test, budget per test, KPIs)
  const testPlanRun = await createAgentRun(context.jobId, openAiModel);
  let testPlan: TestPlan;

  try {
    testPlan = await parseJSON(
      buildTestPlanPrompt(parsedBrief, strategy),
      testPlanSchema,
      {
        model: openAiModel,
        temperature: 0.5,
        maxOutputTokens: 2_000,
        systemPrompt:
          "Tu es un growth marketer expert en tests paid media. Tu crées des plans de test structurés avec des critères de succès mesurables et des allocations de budget réalistes."
      }
    );
    await completeAgentRun(testPlanRun.id, "completed", {
      inputTokens: Math.ceil(buildTestPlanPrompt(parsedBrief, strategy).length / 4),
      outputTokens: Math.ceil(JSON.stringify(testPlan).length / 4)
    });
  } catch (error) {
    await completeAgentRun(testPlanRun.id, "failed");
    throw error;
  }

  // Step 5: Compile the full campaign document (JSON + readable summary)
  const readableSummary = buildReadableSummary(
    parsedBrief,
    strategy,
    adCopies,
    creativeBriefs,
    testPlan
  );

  const campaignDocument = {
    metadata: {
      title: parsedBrief.title,
      offerOrProduct: offer,
      platforms: parsedBrief.agentDetails.platforms,
      objective:
        parsedBrief.agentDetails.campaignObjective ??
        parsedBrief.objectives[0] ??
        "awareness",
      totalBudget: parsedBrief.budget ?? "non précisé",
      generatedAt: new Date().toISOString()
    },
    globalStrategy: strategy.globalStrategy,
    marketingAngles: strategy.angles,
    campaignStructure: strategy.campaignStructure,
    adCopies: adCopies.copies,
    creativeBriefs: creativeBriefs.briefs,
    testPlan,
    readableSummary
  };

  // Step 6: Store document in Supabase Storage
  const supabase = getSupabaseAdminClient();
  const documentContent = JSON.stringify(campaignDocument, null, 2);
  const documentBuffer = Buffer.from(documentContent, "utf8");
  const filePath = [
    "paid-media",
    context.projectId,
    context.jobId,
    "campaign-document.json"
  ].join("/");

  const uploadResult = await supabase.storage
    .from(paidMediaDocumentsBucket)
    .upload(filePath, documentBuffer, {
      contentType: "application/json",
      upsert: true
    });

  if (uploadResult.error) {
    throw new Error(
      `Échec upload Supabase Storage: ${uploadResult.error.message}`
    );
  }

  const signedUrlResult = await supabase.storage
    .from(paidMediaDocumentsBucket)
    .createSignedUrl(filePath, 60 * 60 * 24 * 7);

  const signedUrl = signedUrlResult.data?.signedUrl ?? null;

  // Step 7: Create asset record in DB
  const organizationId = await resolveOrganizationId(context.projectId);

  const asset = await prisma.asset.create({
    data: {
      organizationId,
      projectId: context.projectId,
      jobId: context.jobId,
      assetType: "document",
      storageBucket: paidMediaDocumentsBucket,
      storagePath: filePath,
      mimeType: "application/json",
      sizeBytes: BigInt(documentBuffer.byteLength),
      metadataJson: toJsonValue({
        agentType: "paid_media",
        documentType: "campaign_document",
        offer: campaignDocument.metadata.offerOrProduct,
        platforms: campaignDocument.metadata.platforms,
        objective: campaignDocument.metadata.objective,
        anglesCount: strategy.angles.length,
        copiesCount: adCopies.copies.length,
        creativeBriefsCount: creativeBriefs.briefs.length,
        testsCount: testPlan.tests.length,
        signedUrl
      })
    },
    select: { id: true }
  });

  return {
    summary: `Plan de campagne Paid Media généré pour "${offer}": ${strategy.angles.length} angles, ${adCopies.copies.length} copies, ${creativeBriefs.briefs.length} briefs créatifs, ${testPlan.tests.length} tests.`,
    outputs: {
      documentAssetId: asset.id,
      documentPath: filePath,
      documentUrl: signedUrl,
      offer,
      platforms: parsedBrief.agentDetails.platforms,
      objective: campaignDocument.metadata.objective,
      budget: campaignDocument.metadata.totalBudget,
      globalStrategy: strategy.globalStrategy,
      angles: strategy.angles,
      campaignStructure: strategy.campaignStructure,
      adCopies: adCopies.copies,
      creativeBriefs: creativeBriefs.briefs,
      testPlan,
      readableSummary
    },
    qaChecklist: [
      "Vérifier la cohérence des angles marketing avec l'offre et l'objectif",
      "Vérifier que toutes les plateformes demandées sont couvertes dans les copies",
      "Vérifier la qualité des copies: pas de placeholders, copies prêtes à l'emploi",
      "Vérifier la présence de variantes A/B pour chaque combinaison angle/plateforme",
      "Vérifier que les KPIs des tests sont mesurables et les critères de succès chiffrés",
      "Vérifier l'alignement des briefs créatifs avec les déclencheurs émotionnels des angles"
    ],
    executionMetadata: {
      modelProvider: "openai",
      modelName: openAiModel
    },
    delivery: {
      type: "paid_media_campaign_document",
      status: "delivered",
      summaryText: `Document de campagne complet livré: ${strategy.angles.length} angles marketing, ${adCopies.copies.length} copies publicitaires, ${creativeBriefs.briefs.length} briefs créatifs, ${testPlan.tests.length} tests planifiés.`
    }
  };
}

// ─── Pipeline definition ──────────────────────────────────────────────────────

export const paidMediaPipeline: AgentPipeline<"paid_media"> = {
  agentType: "paid_media",
  steps: [
    {
      key: "angle_generation",
      label: "Génération des angles",
      description:
        "Crée 3-5 angles marketing distincts avec stratégie globale et recommandations de ciblage."
    },
    {
      key: "campaign_structuring",
      label: "Structuration campagne",
      description:
        "Génère les copies publicitaires (headlines, descriptions, CTAs, A/B) et les briefs créatifs visuels."
    },
    {
      key: "delivery_packaging",
      label: "Plan de test & livraison",
      description:
        "Produit le plan de test structuré, compile le document de campagne et livre les assets en DB."
    }
  ],
  async execute(context) {
    return executePaidMediaPipeline(context);
  }
};
