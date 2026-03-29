import { ContentExtractor } from '../../src/utils/ContentExtractor';

describe('ContentExtractor', () => {
  let extractor: ContentExtractor;

  beforeEach(() => {
    extractor = new ContentExtractor();
  });

  describe('extract', () => {
    it('should extract basic content', () => {
      const html = `
        <html>
          <head><title>Test Page</title></head>
          <body>
            <article>
              <h1>Main Title</h1>
              <p>This is the main content.</p>
            </article>
          </body>
        </html>
      `;
      
      const result = extractor.extract(html, 'https://example.com');
      
      expect(result.title).toBe('Main Title');
      expect(result.content).toContain('This is the main content');
      expect(result.wordCount).toBeGreaterThan(0);
    });

    it('should remove unwanted elements', () => {
      const html = `
        <html>
          <head><title>Test</title></head>
          <body>
            <nav>Navigation</nav>
            <article>
              <h1>Title</h1>
              <p>Content here.</p>
            </article>
            <footer>Footer</footer>
          </body>
        </html>
      `;
      
      const result = extractor.extract(html, 'https://example.com');
      
      expect(result.content).not.toContain('Navigation');
      expect(result.content).not.toContain('Footer');
      expect(result.content).toContain('Content here');
    });

    it('should extract metadata', () => {
      const html = `
        <html>
          <head>
            <title>Test</title>
            <meta name="author" content="John Doe">
            <meta property="article:published_time" content="2024-01-01">
          </head>
          <body>
            <article>
              <h1>Title</h1>
              <p>Content.</p>
            </article>
          </body>
        </html>
      `;
      
      const result = extractor.extract(html, 'https://example.com');
      
      expect(result.author).toBe('John Doe');
      expect(result.publishDate).toBe('2024-01-01');
    });

    it('should extract images', () => {
      const html = `
        <html>
          <body>
            <article>
              <h1>Title</h1>
              <img src="/image1.jpg" alt="Image 1">
              <img src="https://example.com/image2.jpg" alt="Image 2">
              <p>Content.</p>
            </article>
          </body>
        </html>
      `;
      
      const result = extractor.extract(html, 'https://example.com');
      
      expect(result.images).toHaveLength(2);
      expect(result.images[0].src).toBe('https://example.com/image1.jpg');
      expect(result.images[1].src).toBe('https://example.com/image2.jpg');
    });

    it('should generate excerpt', () => {
      const longText = 'A'.repeat(1000);
      const html = `
        <html>
          <body>
            <article>
              <h1>Title</h1>
              <p>${longText}</p>
            </article>
          </body>
        </html>
      `;
      
      const result = extractor.extract(html, 'https://example.com');
      
      expect(result.excerpt.length).toBeLessThanOrEqual(250);
      expect(result.excerpt.length).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty HTML', () => {
      const result = extractor.extract('', 'https://example.com');
      
      expect(result.title).toBe('Untitled');
      expect(result.content).toBe('');
    });

    it('should handle HTML without title', () => {
      const html = '<html><body><p>Content</p></body></html>';
      const result = extractor.extract(html, 'https://example.com');
      
      expect(result.title).toBe('Untitled');
    });
  });
});
