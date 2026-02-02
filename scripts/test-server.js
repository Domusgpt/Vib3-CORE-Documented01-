import { createServer } from 'http';
import { readFileSync, existsSync, statSync } from 'fs';
import { join, extname } from 'path';

const MIME = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.mjs': 'application/javascript',
    '.css': 'text/css',
    '.wasm': 'application/wasm',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.wgsl': 'text/plain',
    '.glsl': 'text/plain',
};

const ROOT = process.cwd();

createServer((req, res) => {
    const url = req.url.split('?')[0];
    let p = join(ROOT, url === '/' ? 'index.html' : url);

    // If path is a directory, try index.html inside it
    if (existsSync(p) && statSync(p).isDirectory()) {
        p = join(p, 'index.html');
    }

    if (!existsSync(p)) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end(`404 Not Found: ${url}`);
        return;
    }

    res.writeHead(200, {
        'Content-Type': MIME[extname(p)] || 'application/octet-stream',
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Access-Control-Allow-Origin': '*',
    });
    res.end(readFileSync(p));
}).listen(3457, () => console.log('Test server ready on http://localhost:3457'));
