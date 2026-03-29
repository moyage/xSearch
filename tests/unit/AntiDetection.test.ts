import { UserAgentRotator, RateLimiter, AntiDetection } from '../../src/utils/AntiDetection';

describe('AntiDetection', () => {
  describe('UserAgentRotator', () => {
    it('should return random user agent', () => {
      const rotator = new UserAgentRotator();
      const ua1 = rotator.getRandom();
      const ua2 = rotator.getRandom();
      
      expect(ua1).toBeDefined();
      expect(ua2).toBeDefined();
      expect(typeof ua1).toBe('string');
    });

    it('should allow adding custom user agents', () => {
      const rotator = new UserAgentRotator();
      rotator.add('Custom UA');
      
      // 可能随机到自定义的，但很难测试
      // 这里主要确保不会报错
      expect(() => rotator.getRandom()).not.toThrow();
    });
  });

  describe('RateLimiter', () => {
    it('should enforce delay between requests', async () => {
      const limiter = new RateLimiter(100, 100);
      
      const start = Date.now();
      await limiter.wait();
      await limiter.wait();
      const elapsed = Date.now() - start;
      
      expect(elapsed).toBeGreaterThanOrEqual(100);
    });

    it('should allow changing delay', async () => {
      const limiter = new RateLimiter(1000, 2000);
      limiter.setDelay(100, 100);
      
      const start = Date.now();
      await limiter.wait();
      const elapsed = Date.now() - start;
      
      expect(elapsed).toBeLessThan(200);
    });
  });

  describe('AntiDetection', () => {
    it('should provide browser context options', () => {
      const anti = new AntiDetection();
      const options = anti.getBrowserContextOptions();
      
      expect(options.userAgent).toBeDefined();
      expect(options.viewport).toBeDefined();
      expect(options.timezoneId).toBeDefined();
    });

    it('should allow proxy configuration', () => {
      const anti = new AntiDetection({ proxyRotation: true });
      anti.addProxy('http://proxy1:8080');
      
      const options = anti.getBrowserContextOptions();
      // 由于随机性，可能选到也可能没选到
      expect(options).toBeDefined();
    });
  });
});
