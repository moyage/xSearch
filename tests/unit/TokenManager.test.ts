import { TokenManager } from '../../src/core/TokenManager';

describe('TokenManager', () => {
  let tokenManager: TokenManager;

  beforeEach(() => {
    tokenManager = new TokenManager({
      maxTokens: 1000,
      warningThreshold: 0.8,
      abortThreshold: 1.0,
    });
  });

  describe('canUseTokens', () => {
    it('should return true when tokens are available', () => {
      expect(tokenManager.canUseTokens(500)).toBe(true);
    });

    it('should return false when exceeding budget', () => {
      tokenManager.consume(900, 'gpt-4');
      expect(tokenManager.canUseTokens(200)).toBe(false);
    });
  });

  describe('consume', () => {
    it('should track token usage', () => {
      tokenManager.consume(100, 'gpt-4');
      const usage = tokenManager.getUsage();
      
      expect(usage.used).toBe(100);
      expect(usage.remaining).toBe(900);
      expect(usage.breakdown).toHaveLength(1);
    });

    it('should calculate cost correctly', () => {
      tokenManager.consume(1000, 'gpt-4');
      const usage = tokenManager.getUsage();
      
      expect(usage.cost).toBeGreaterThan(0);
    });

    it('should emit warning when threshold reached', () => {
      const warningSpy = jest.fn();
      tokenManager.on('warning', warningSpy);
      
      tokenManager.consume(850, 'gpt-4'); // 85% of 1000
      
      expect(warningSpy).toHaveBeenCalled();
    });
  });

  describe('getUsage', () => {
    it('should return copy of usage data', () => {
      tokenManager.consume(100, 'gpt-4');
      const usage1 = tokenManager.getUsage();
      const usage2 = tokenManager.getUsage();
      
      expect(usage1).toEqual(usage2);
      expect(usage1).not.toBe(usage2);
    });
  });
});
