#!/usr/bin/env node

const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const OUT_DIR = path.join(__dirname, 'dist');
const OUT_FILE = path.join(OUT_DIR, 'mcp.js');

async function build() {
  console.log('Building XSearch MCP Server...');
  console.log('Entry: src/mcp-server.ts');
  console.log('Output: dist/mcp.js');
  console.log('');

  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  try {
    const result = await esbuild.build({
      entryPoints: [path.join(__dirname, 'src', 'mcp-server.ts')],
      bundle: true,
      platform: 'node',
      target: 'node18',
      format: 'cjs',
      outfile: OUT_FILE,
      external: [],
      minify: false,
      sourcemap: true,
      banner: {
        js: '#!/usr/bin/env node\n',
      },
      define: {
        'process.env.NODE_ENV': '"production"',
      },
      resolveExtensions: ['.ts', '.js', '.json'],
      packages: 'bundle',
      treeShaking: true,
      metafile: true,
    });

    console.log('✅ Build successful!');
    console.log(`   Output: ${OUT_FILE}`);
    console.log(`   Size: ${(fs.statSync(OUT_FILE).size / 1024).toFixed(2)} KB`);
    
    fs.chmodSync(OUT_FILE, 0o755);
    console.log('   Permissions: executable (755)');

    const buildInfo = {
      builtAt: new Date().toISOString(),
      entry: 'src/mcp-server.ts',
      output: 'dist/mcp.js',
      bundleSize: fs.statSync(OUT_FILE).size,
      metafile: result.metafile,
    };
    
    fs.writeFileSync(
      path.join(OUT_DIR, 'mcp.build.json'),
      JSON.stringify(buildInfo, null, 2)
    );

    const outputs = Object.entries(result.metafile.outputs);
    console.log('');
    console.log('📦 Bundle contents:');
    outputs.forEach(([file, info]) => {
      if (file.endsWith('.js')) {
        console.log(`   ${path.basename(file)}: ${(info.bytes / 1024).toFixed(2)} KB`);
      }
    });

    console.log('');
    console.log('🚀 Ready to use!');
    console.log('   Test: node dist/mcp.js --help');
    console.log('   Or: npm run start:mcp');
    
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

build();
