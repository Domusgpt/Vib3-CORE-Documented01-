import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';

const MIME = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.wasm': 'application/wasm',
    '.json': 'application/json',
    '.png': 'image/png',
    '.svg': 'image/svg+xml'
};

createServer((req, res) => {
    let p = join('./sdk', req.url === '/' ? 'index.html' : req.url).split('?')[0];
    if (!existsSync(p)) {
        res.writeHead(404);
        res.end();
        return;
    }
    res.writeHead(200, { 'Content-Type': MIME[extname(p)] || 'application/octet-stream' });
    res.end(readFileSync(p));
}).listen(3457, () => console.log('Server ready on http://localhost:3457'));
