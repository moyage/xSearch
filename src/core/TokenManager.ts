import { EventEmitter } from 'events';

export type EnforcementMode = 'permissive' | 'strict' | 'block';

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
  private enforcementMode: EnforcementMode;

  constructor(budget: Partial<TokenBudget> & { enforcementMode?: EnforcementMode } = {}) {
    super();
    
    this.budget = {
      maxTokens: budget.maxTokens || 5000,
      warningThreshold: budget.warningThreshold || 0.8,
      abortThreshold: budget.abortThreshold || 1.0,
    };

    this.enforcementMode = budget.enforcementMode || 'permissive';

    this.usage = {
      used: 0,
      remaining: this.budget.maxTokens,
      cost: 0,
      breakdown: [],
    };
  }

  canUseTokens(amount: number): boolean {
    if (this.enforcementMode === 'strict') {
      return this.usage.used + amount <= this.budget.maxTokens;
    }
    return this.usage.used + amount <= this.budget.maxTokens * this.budget.abortThreshold;
  }

  consume(tokens: number, model: string, phase: string = 'default'): void {
    if (this.enforcementMode === 'strict' && !this.canUseTokens(tokens)) {
      throw new Error(`Token quota exceeded: requested ${tokens}, available ${this.budget.maxTokens - this.usage.used}`);
    }

    this.usage.used += tokens;
    this.usage.remaining = Math.max(0, this.budget.maxTokens - this.usage.used);
    
    const costPer1K = this.getModelCost(model);
    this.usage.cost += (tokens / 1000) * costPer1K;
    
    this.usage.breakdown.push({ phase, tokens, model });

    const ratio = this.usage.used / this.budget.maxTokens;
    if (ratio >= this.budget.warningThreshold && ratio < this.budget.abortThreshold) {
      this.emit('warning', this.usage);
    }
    
    if (ratio >= this.budget.abortThreshold) {
      this.emit('exhausted', this.usage);
    }
  }

  tryConsume(tokens: number, model: string, phase: string = 'default'): boolean {
    if (!this.canUseTokens(tokens)) {
      if (this.enforcementMode === 'block') {
        this.emit('blocked', { tokens, model, phase, available: this.usage.remaining });
        return false;
      }
    }
    
    this.consume(tokens, model, phase);
    return true;
  }

  getUsage(): TokenUsage {
    return { ...this.usage };
  }

  getBudget(): TokenBudget {
    return { ...this.budget };
  }

  getEnforcementMode(): EnforcementMode {
    return this.enforcementMode;
  }

  setEnforcementMode(mode: EnforcementMode): void {
    this.enforcementMode = mode;
  }

  reset(): void {
    this.usage = {
      used: 0,
      remaining: this.budget.maxTokens,
      cost: 0,
      breakdown: [],
    };
  }

  renderUsagePanel(): string {
    const used = this.usage.used;
    const max = this.budget.maxTokens;
    const remaining = this.usage.remaining;
    const percentage = (used / max) * 100;
    const cost = this.usage.cost;

    const barWidth = 40;
    const filled = Math.round((percentage / 100) * barWidth);
    const empty = barWidth - filled;

    const barColor = percentage >= 90 ? 'red' 
                   : percentage >= 70 ? 'yellow' 
                   : percentage >= 50 ? 'cyan' 
                   : 'green';

    const colorCodes: Record<string, string> = {
      red: '\x1b[31m',
      yellow: '\x1b[33m',
      cyan: '\x1b[36m',
      green: '\x1b[32m',
      reset: '\x1b[0m',
      bold: '\x1b[1m',
    };

    const color = colorCodes[barColor] || colorCodes.reset;
    const bold = colorCodes.bold;
    const reset = colorCodes.reset;

    const bar = `${color}${'█'.repeat(filled)}${'░'.repeat(empty)}${reset}`;
    
    const lines = [
      `${bold}╔════════════════════════════════════════════════════════════╗${reset}`,
      `${bold}║                    TOKEN USAGE PANEL                        ║${reset}`,
      `${bold}╠════════════════════════════════════════════════════════════╣${reset}`,
      `${bold}║${reset}  ${bar}  ${bold}║${reset}`,
      `${bold}║${reset}  Used: ${color}${used.toString().padStart(6)}${reset} / ${max.toString().padStart(6)}  (${color}${percentage.toFixed(1).padStart(5)}%${reset})  ${bold}║${reset}`,
      `${bold}║${reset}  Remaining: ${color}${remaining.toString().padStart(6)}${reset} tokens                          ${bold}║${reset}`,
      `${bold}║${reset}  Cost: $${cost.toFixed(4)}                                       ${bold}║${reset}`,
      `${bold}╠════════════════════════════════════════════════════════════╣${reset}`,
      `${bold}║  BREAKDOWN BY PHASE                                       ║${reset}`,
    ];

    for (const entry of this.usage.breakdown.slice(-5)) {
      lines.push(`${bold}║${reset}  ${entry.phase.padEnd(15)} ${entry.tokens.toString().padStart(6)} tokens (${entry.model})`);
    }

    lines.push(`${bold}╚════════════════════════════════════════════════════════════╝${reset}`);

    return lines.join('\n');
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
