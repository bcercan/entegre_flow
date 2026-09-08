import { eq } from "drizzle-orm";
import { schema, type TenantAwareDb } from "@entegreflow/db";
import { NotFound, type TenantContext } from "@entegreflow/core";
import { analyzeMessage, type AiCostGuard, type LlmProvider } from "@entegreflow/ai";
import type { Customer, MessageAnalysis } from "@entegreflow/contracts";
import { buildDbCatalogPort } from "./catalog-port";

type CustomerRow = typeof schema.customers.$inferSelect;

function toContractsCustomer(c: CustomerRow): Customer {
  return {
    id: c.id,
    erpCode: c.erpCode,
    name: c.name,
    segment: c.segment,
    balance: { amountMinor: c.balanceMinor, currency: "TRY" },
    creditLimit: { amountMinor: c.creditLimitMinor, currency: "TRY" },
    paymentTerm: c.paymentTerm,
    lastOrderAt: c.lastOrderAt ? c.lastOrderAt.toISOString() : null,
    risk: c.risk,
    overLimit: c.balanceMinor > c.creditLimitMinor,
    syncedAt: c.syncedAt ? c.syncedAt.toISOString() : null,
  };
}

export interface AnalyzeDeps {
  tdb: TenantAwareDb;
  llm: LlmProvider;
  costGuard?: AiCostGuard;
}

/**
 * Load a message + its customer, run the analysis engine (SKU-constrained LLM +
 * server-side stock/price/risk enrichment), and persist the result. Shared by
 * the api sync endpoint and the worker's async `message.analyze` processor —
 * single source of truth for "analyze a message".
 */
export async function analyzeAndPersist(
  messageId: string,
  ctx: TenantContext,
  deps: AnalyzeDeps,
): Promise<MessageAnalysis & { customer: Customer | null }> {
  const loaded = await deps.tdb.withTenant(ctx, async (tx) => {
    const [msg] = await tx
      .select()
      .from(schema.emailMessages)
      .where(eq(schema.emailMessages.id, messageId))
      .limit(1);
    if (!msg) return null;

    let customer: CustomerRow | null = null;
    const [thread] = await tx
      .select()
      .from(schema.emailThreads)
      .where(eq(schema.emailThreads.id, msg.threadId))
      .limit(1);
    if (thread?.customerId) {
      const [c] = await tx
        .select()
        .from(schema.customers)
        .where(eq(schema.customers.id, thread.customerId))
        .limit(1);
      customer = c ?? null;
    }
    return { msg, customer };
  });

  if (!loaded) throw NotFound("İleti bulunamadı");

  const customer = loaded.customer ? toContractsCustomer(loaded.customer) : null;

  const result = await analyzeMessage(
    {
      tenantId: ctx.tenantId,
      subject: loaded.msg.subject,
      body: loaded.msg.bodyText,
      customer,
      companyName: customer?.name,
    },
    { llm: deps.llm, catalog: buildDbCatalogPort(deps.tdb, ctx), costGuard: deps.costGuard },
  );

  const aiStatus = result.warnings.some((w) => w.type === "danger") ? "risk" : "ready";

  const saved = await deps.tdb.withTenant(ctx, async (tx) => {
    const values = {
      tenantId: ctx.tenantId,
      messageId,
      model: result.model,
      promptVersion: result.promptVersion,
      summary: result.summary,
      intents: result.intents,
      lines: result.lines,
      warnings: result.warnings,
      history: result.history,
      draftText: result.draftText,
      inputTokens: result.tokenCost.inputTokens,
      outputTokens: result.tokenCost.outputTokens,
      status: "ready" as const,
    };
    await tx
      .insert(schema.messageAnalyses)
      .values(values)
      .onConflictDoUpdate({ target: schema.messageAnalyses.messageId, set: values });

    await tx
      .update(schema.emailMessages)
      .set({ aiStatus })
      .where(eq(schema.emailMessages.id, messageId));

    const [row] = await tx
      .select()
      .from(schema.messageAnalyses)
      .where(eq(schema.messageAnalyses.messageId, messageId))
      .limit(1);
    return row!;
  });

  return {
    id: saved.id,
    messageId,
    model: result.model,
    promptVersion: result.promptVersion,
    summary: result.summary,
    intents: result.intents,
    lines: result.lines,
    warnings: result.warnings,
    history: result.history,
    draftText: result.draftText,
    tokenCost: result.tokenCost,
    createdAt: saved.createdAt.toISOString(),
    customer,
  };
}
