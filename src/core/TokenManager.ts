import { EventEmitter } from 'events';

export interface TokenBudget {
  maxTokens: number;
  warningThreshold: number;
  abortThreshold: number;
}

export interface TokenUsage {
  used: number;
  remaining: number;
  cost: number;
  breakdown: { phase: string; tokens: number; model: string }[];
}

export class TokenManager extends EventEmitter {
  private budget: TokenBudget;
  private usage: TokenUsage;

  constructor(budget: Partial<TokenBudget> = {}) {
    super();
    
    this.budget = {
      maxTokens: budget.maxTokens || 5000,
      warningThreshold: budget.warningThreshold || 0.8,
      abortThreshold: budget.abortThreshold || 1.0,
    };

    this.usage = {
      used: 0,
      remaining: this.budget.maxTokens,
      cost: 0,
      breakdown: [],
    };
  }

  canUseTokens(amount: number): boolean {
    return this.usage.used + amount <= this.budget.maxTokens * this.budget.abortThreshold;
  }

  consume(tokens: number, model: string, phase: string = 'default'): void {
    this.usage.used += tokens;
    this.usage.remaining = Math.max(0, this.budget.maxTokens - this.usage.used);
    
    // 估算成本（简化计算）
    const costPer1K = this.getModelCost(model);
    this.usage.cost += (tokens / 1000) * costPer1K;
    
    this.usage.breakdown.push({ phase, tokens, model });

    // 检查阈值
    const ratio = this.usage.used / this.budget.maxTokens;
    if (ratio >= this.budget.warningThreshold && ratio < this.budget.abortThreshold) {
      this.emit('warning', this.usage);
    }
    
    if (ratio >= this.budget.abortThreshold) {
      this.emit('exhausted', this.usage);
    }
  }

  getUsage(): TokenUsage {
    return { ...this.usage };
  }

  private getModelCost(model: string): number {
    const costs: Record<string, number> = {
      'gpt-4': 0.03,
      'gpt-4-turbo': 0.01,
      'gpt-3.5-turbo': 0.0015,
      'claude-opus': 0.015,
      'claude-sonnet': 0.003,
      'default': 0.01,
    };
    return costs[model] || costs.default;
  }
}
