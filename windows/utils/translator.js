const https = require('https');
const http = require('http');

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function _fetchUrl(url, timeout = 10000) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout);

        const req = protocol.get(url, {
            headers: { 'User-Agent': USER_AGENT },
            signal: controller.signal
        }, (res) => {
            clearTimeout(timer);
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode !== 200) {
                    reject(new Error(`Error HTTP ${res.statusCode}: ${data.slice(0, 200)}`));
                    return;
                }
                resolve(data);
            });
        });

        req.on('error', (err) => {
            clearTimeout(timer);
            if (err.name === 'AbortError') {
                reject(new Error('Tiempo de espera agotado'));
            } else {
                reject(err);
            }
        });
    });
}

function _parseGoogleResponse(data) {
    try {
        const json = JSON.parse(data);
        const sentences = json[0];
        if (!sentences || !Array.isArray(sentences)) return null;
        const parts = [];
        for (const s of sentences) {
            if (s && s[0]) parts.push(s[0]);
        }
        return parts.length > 0 ? parts.join('') : null;
    } catch {
        return null;
    }
}

async function translateText(text, source, target, timeout = 10000) {
    const sl = source || 'auto';
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(sl)}&tl=${encodeURIComponent(target)}&dt=t&q=${encodeURIComponent(text)}&ie=UTF-8&oe=UTF-8`;
    const raw = await _fetchUrl(url, timeout);
    return _parseGoogleResponse(raw);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { translateText };
}
