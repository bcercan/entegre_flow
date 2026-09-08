import type { LlmUsage } from "./provider";

export class AiBudgetExceededError extends Error {
  constructor(message = "AI günlük token bütçesi aşıldı") {
    super(message);
    this.name = "AiBudgetExceededError";
  }
}

/** Pluggable spend store — Redis-backed in the app, in-memory in tests. */
export interface CostGuardStore {
  getSpentToday(tenantId: string): Promise<number>;
  addSpend(tenantId: string, tokens: number): Promise<void>;
}

export class InMemoryCostGuardStore implements CostGuardStore {
  private readonly spent = new Map<string, number>();
  async getSpentToday(tenantId: string): Promise<number> {
    return this.spent.get(tenantId) ?? 0;
  }
  async addSpend(tenantId: string, tokens: number): Promise<void> {
    this.spent.set(tenantId, (this.spent.get(tenantId) ?? 0) + tokens);
  }
}

/**
 * Per-tenant daily token budget. FAIL-CLOSED: if the budget is reached OR the
 * store can't be read, analysis is blocked rather than silently spending.
 */
export class AiCostGuard {
  constructor(
    private readonly store: CostGuardStore,
    private readonly dailyBudget: number,
  ) {}

  async assertWithinBudget(tenantId: string): Promise<void> {
    let spent: number;
    try {
      spent = await this.store.getSpentToday(tenantId);
    } catch {
      // Cannot verify spend → fail closed.
      throw new AiBudgetExceededError("AI bütçesi doğrulanamadı (fail-closed)");
    }
    if (spent >= this.dailyBudget) {
      throw new AiBudgetExceededError();
    }
  }

  async record(tenantId: string, usage: LlmUsage): Promise<void> {
    await this.store.addSpend(tenantId, usage.inputTokens + usage.outputTokens);
  }
}
