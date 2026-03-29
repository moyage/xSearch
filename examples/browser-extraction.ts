import { PlaywrightEngine } from '../src/browser/PlaywrightEngine';
import { extractContent } from '../src/utils/ContentExtractor';

async function browserExtractionExample() {
  console.log('=== XSearch 浏览器内容提取示例 ===\n');
  
  const engine = new PlaywrightEngine({
    headless: true,
    slowMo: 100,
  });
  
  try {
    const url = 'https://example.com';
    console.log(`提取页面: ${url}\n`);
    
    const results = await engine.executeActions(url, [
      { type: 'goto' },
      { type: 'wait', options: { timeout: 2000 } },
      { type: 'extract' },
    ]);
    
    if (results.extraction) {
      const extraction = results.extraction;
      
      console.log('页面信息:');
      console.log(`  标题: ${extraction.title}`);
      console.log(`  URL: ${extraction.url}`);
      console.log(`  内容长度: ${extraction.content.length} 字符`);
      console.log(`  链接数: ${extraction.links.length}`);
      console.log(`  图片数: ${extraction.images.length}`);
      
      if (extraction.metadata.description) {
        console.log(`  描述: ${extraction.metadata.description}`);
      }
      
      console.log('\n内容预览:');
      console.log(extraction.content.substring(0, 500));
    }
    
  } finally {
    await engine.close();
  }
}

browserExtractionExample().catch(console.error);
