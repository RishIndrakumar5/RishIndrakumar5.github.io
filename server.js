const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const PORT = 4173;
const ROOT = __dirname;
const DATA_FILE = path.join(ROOT, 'certificates-data.js');
const PASSCODE_HASH = 'f2de1d0adc9d35f4f32d82a3dde7768fd587d0d453434a52eecc855d2b24e337';

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

function send(res, status, body, type = 'text/plain; charset=utf-8') {
    res.writeHead(status, {
        'Content-Type': type,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end(body);
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        req.on('error', reject);
    });
}

function serveStatic(req, res) {
    let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    if (urlPath === '/') urlPath = '/index.html';
    const filePath = path.normalize(path.join(ROOT, urlPath));
    if (!filePath.startsWith(ROOT)) {
        send(res, 403, 'Forbidden');
        return;
    }
    fs.readFile(filePath, (err, data) => {
        if (err) {
            send(res, 404, 'Not found');
            return;
        }
        const ext = path.extname(filePath).toLowerCase();
        send(res, 200, data, MIME[ext] || 'application/octet-stream');
    });
}

function git(args) {
    return execFileSync('git', args, {
        cwd: ROOT,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
            ...process.env,
            // Avoid requiring a local git user.name/email config
            GIT_AUTHOR_NAME: process.env.GIT_AUTHOR_NAME || 'Rish',
            GIT_AUTHOR_EMAIL:
                process.env.GIT_AUTHOR_EMAIL || '237796974+RishIndrakumar5@users.noreply.github.com',
            GIT_COMMITTER_NAME: process.env.GIT_COMMITTER_NAME || 'Rish',
            GIT_COMMITTER_EMAIL:
                process.env.GIT_COMMITTER_EMAIL || '237796974+RishIndrakumar5@users.noreply.github.com'
        }
    });
}

function publishCertificates() {
    git(['add', '--', 'certificates-data.js']);
    const status = git(['status', '--porcelain', '--', 'certificates-data.js']).trim();
    if (!status) {
        // Still sync the live GitHub Pages site in case it was behind
        deployCertificatesToPages();
        return { published: true, reason: 'Already up to date; synced live site' };
    }

    try {
        git(['commit', '-m', 'Update certificates for portfolio site']);
    } catch (err) {
        const msg = `${err.stdout || ''}${err.stderr || ''}${err.message || ''}`;
        if (!/nothing to commit/i.test(msg)) throw err;
    }

    git(['push', 'origin', 'HEAD']);
    deployCertificatesToPages();
    return { published: true };
}

function deployCertificatesToPages() {
    const os = require('os');
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'portfolio-pages-'));
    try {
        execFileSync(
            'git',
            ['clone', '--depth', '1', 'https://github.com/RishIndrakumar5/RishIndrakumar5.github.io.git', tmp],
            {
                encoding: 'utf8',
                stdio: ['ignore', 'pipe', 'pipe'],
                env: process.env
            }
        );
        fs.copyFileSync(DATA_FILE, path.join(tmp, 'certificates-data.js'));

        const run = (args) =>
            execFileSync('git', args, {
                cwd: tmp,
                encoding: 'utf8',
                stdio: ['ignore', 'pipe', 'pipe'],
                env: {
                    ...process.env,
                    GIT_AUTHOR_NAME: process.env.GIT_AUTHOR_NAME || 'Rish',
                    GIT_AUTHOR_EMAIL:
                        process.env.GIT_AUTHOR_EMAIL ||
                        '237796974+RishIndrakumar5@users.noreply.github.com',
                    GIT_COMMITTER_NAME: process.env.GIT_COMMITTER_NAME || 'Rish',
                    GIT_COMMITTER_EMAIL:
                        process.env.GIT_COMMITTER_EMAIL ||
                        '237796974+RishIndrakumar5@users.noreply.github.com'
                }
            });

        run(['add', '--', 'certificates-data.js']);
        const dirty = run(['status', '--porcelain', '--', 'certificates-data.js']).trim();
        if (!dirty) return;
        try {
            run(['commit', '-m', 'Update published certificates on live site']);
        } catch (err) {
            const msg = `${err.stdout || ''}${err.stderr || ''}${err.message || ''}`;
            if (!/nothing to commit/i.test(msg)) throw err;
            return;
        }
        run(['push', 'origin', 'HEAD']);
    } finally {
        try {
            fs.rmSync(tmp, { recursive: true, force: true });
        } catch (_) {
            /* ignore cleanup errors */
        }
    }
}

const server = http.createServer(async (req, res) => {
    if (req.method === 'OPTIONS') {
        send(res, 204, '');
        return;
    }

    if (req.method === 'POST' && req.url === '/api/certificates') {
        try {
            const raw = await readBody(req);
            const payload = JSON.parse(raw);
            if (!payload || payload.passcodeHash !== PASSCODE_HASH) {
                send(res, 401, JSON.stringify({ ok: false, error: 'Unauthorized' }), 'application/json; charset=utf-8');
                return;
            }
            if (!payload.data || !Array.isArray(payload.data.items)) {
                send(res, 400, JSON.stringify({ ok: false, error: 'Invalid data' }), 'application/json; charset=utf-8');
                return;
            }

            const contents =
                '// Published certificate data — updated by Save on the Certificates page.\n' +
                `window.CERTIFICATES_DATA = ${JSON.stringify(payload.data, null, 2)};\n`;

            fs.writeFileSync(DATA_FILE, contents, 'utf8');

            let publish = { published: true };
            try {
                publish = publishCertificates();
            } catch (err) {
                send(
                    res,
                    500,
                    JSON.stringify({
                        ok: false,
                        error:
                            'Could not publish to the live page: ' +
                            (err.stderr || err.message || 'git push failed')
                    }),
                    'application/json; charset=utf-8'
                );
                return;
            }

            send(
                res,
                200,
                JSON.stringify({
                    ok: true,
                    published: true,
                    message:
                        'Saved to the live certificates page. Editing is locked.'
                }),
                'application/json; charset=utf-8'
            );
        } catch (err) {
            send(
                res,
                500,
                JSON.stringify({ ok: false, error: err.message || 'Save failed' }),
                'application/json; charset=utf-8'
            );
        }
        return;
    }

    if (req.method === 'GET') {
        serveStatic(req, res);
        return;
    }

    send(res, 405, 'Method not allowed');
});

server.listen(PORT, () => {
    console.log(`Portfolio server running at http://localhost:${PORT}`);
    console.log(`Certificates page: http://localhost:${PORT}/certificates.html`);
});
