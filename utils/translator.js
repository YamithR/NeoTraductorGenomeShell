import Soup from 'gi://Soup?version=3.0';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

const PROVIDERS = {
    apertium: {
        name: 'Apertium',
        needsKey: false,
        translate: async (text, source, target, _apiKey, timeout) => {
            const session = new Soup.Session();
            const langpair = `${source || 'auto'}|${target}`;
            const uri = `https://apertium.org/apy/translate?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(langpair)}&format=json&markUnknown=no`;
            const message = new Soup.Message({ method: 'GET', uri });
            return await _sendRequest(session, message, timeout);
        },
        parseResponse: (data) => {
            try {
                const json = JSON.parse(data);
                if (json.responseData?.translatedText)
                    return json.responseData.translatedText;
                if (json.translatedText)
                    return json.translatedText;
                return json.responseStatus === 200 ? '' : null;
            } catch {
                return null;
            }
        },
    },
    libretranslate: {
        name: 'LibreTranslate',
        needsKey: false,
        translate: async (text, source, target, apiKey, timeout, selfHostedUrl) => {
            const session = new Soup.Session();
            const baseUrl = selfHostedUrl || 'https://libretranslate.com';
            const payload = {
                q: text,
                source: source || 'auto',
                target,
                format: 'text',
            };
            if (apiKey) payload.api_key = apiKey;
            const message = new Soup.Message({
                method: 'POST',
                uri: `${baseUrl}/translate`,
            });
            message.get_request_headers().append('Content-Type', 'application/json');
            message.set_request_body_from_bytes(
                'application/json',
                new GLib.Bytes(JSON.stringify(payload))
            );
            return await _sendRequest(session, message, timeout);
        },
        parseResponse: (data) => {
            try {
                const json = JSON.parse(data);
                if (json.translatedText) return json.translatedText;
                if (json.error) throw new Error(json.error);
                return null;
            } catch {
                return null;
            }
        },
    },
    deepl: {
        name: 'DeepL',
        needsKey: true,
        translate: async (text, source, target, apiKey, timeout) => {
            if (!apiKey) throw new Error('Se requiere API key de DeepL');
            const session = new Soup.Session();
            const params = {
                text,
                target_lang: target.toUpperCase(),
                tag_handling: 'html',
            };
            if (source && source !== 'auto') params.source_lang = source.toUpperCase();
            const encoded = Object.entries(params)
                .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
                .join('&');
            const free = apiKey.endsWith(':fx') ? '-free' : '';
            const uri = `https://api${free}.deepl.com/v2/translate`;
            const message = new Soup.Message({ method: 'POST', uri });
            message.get_request_headers().append('Content-Type', 'application/x-www-form-urlencoded');
            message.get_request_headers().append('Authorization', `DeepL-Auth-Key ${apiKey}`);
            message.set_request_body_from_bytes(
                'application/x-www-form-urlencoded',
                new GLib.Bytes(encoded)
            );
            return await _sendRequest(session, message, timeout);
        },
        parseResponse: (data) => {
            try {
                const json = JSON.parse(data);
                if (json.translations?.[0]?.text)
                    return json.translations[0].text;
                return null;
            } catch {
                return null;
            }
        },
    },
    google: {
        name: 'Google Translate',
        needsKey: true,
        translate: async (text, source, target, apiKey, timeout) => {
            const session = new Soup.Session();
            const baseUrl = 'https://translation.googleapis.com/language/translate/v2';
            const params = {
                q: text,
                target,
                format: 'text',
            };
            if (source && source !== 'auto') params.source = source;
            if (apiKey) params.key = apiKey;
            const encoded = Object.entries(params)
                .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
                .join('&');
            const uri = `${baseUrl}?${encoded}`;
            const message = new Soup.Message({ method: 'GET', uri });
            return await _sendRequest(session, message, timeout);
        },
        parseResponse: (data) => {
            try {
                const json = JSON.parse(data);
                if (json.data?.translations?.[0]?.translatedText)
                    return json.data.translations[0].translatedText;
                return null;
            } catch {
                return null;
            }
        },
    },
};

function _sendRequest(session, message, timeout = 10000) {
    return new Promise((resolve, reject) => {
        const cancellable = Gio.Cancellable.new();
        let timeoutId = 0;
        timeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, timeout, () => {
            cancellable.cancel();
            reject(new Error('Tiempo de espera agotado'));
            return GLib.SOURCE_REMOVE;
        });
        session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, cancellable, (src, res) => {
            if (timeoutId > 0) {
                GLib.source_remove(timeoutId);
                timeoutId = 0;
            }
            try {
                const status = message.get_status();
                if (status !== Soup.Status.OK) {
                    const reason = message.get_reason_phrase() || '';
                    reject(new Error(`Error HTTP ${status}${reason ? ': ' + reason : ''}`));
                    return;
                }
                const bytes = src.send_and_read_finish(res);
                const decoder = new TextDecoder('utf-8');
                const response = decoder.decode(bytes.get_data());
                resolve(response);
            } catch (e) {
                reject(e);
            }
        });
    });
}

export async function translateText(text, source, target, provider = 'libretranslate', apiKey = '', selfHostedUrl = '', timeout = 10000) {
    const providerConfig = PROVIDERS[provider];
    if (!providerConfig) throw new Error(`Proveedor "${provider}" no soportado`);
    if (providerConfig.needsKey && !apiKey)
        throw new Error(`El proveedor "${provider}" requiere una API key`);
    const raw = await providerConfig.translate(text, source, target, apiKey, timeout, selfHostedUrl);
    return providerConfig.parseResponse(raw);
}

export function getProviderInfo(provider) {
    return PROVIDERS[provider] || null;
}

export function getAvailableProviders() {
    return Object.entries(PROVIDERS).map(([id, cfg]) => ({
        id,
        name: cfg.name,
        needsKey: cfg.needsKey,
    }));
}
