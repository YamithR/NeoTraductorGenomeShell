import Soup from 'gi://Soup?version=3.0';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

function _makeMessage(method, url) {
    const uri = GLib.Uri.parse(url, GLib.UriFlags.NONE);
    return new Soup.Message({ method, uri });
}

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
                    let body = '';
                    try {
                        const bytes = src.send_and_read_finish(res);
                        body = new TextDecoder('utf-8').decode(bytes.get_data());
                    } catch {}
                    reject(new Error(body || `Error HTTP ${status}${reason ? ': ' + reason : ''}`));
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

export async function translateText(text, source, target, timeout = 10000) {
    const session = new Soup.Session();
    const sl = source || 'auto';
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(sl)}&tl=${encodeURIComponent(target)}&dt=t&q=${encodeURIComponent(text)}&ie=UTF-8&oe=UTF-8`;
    const message = _makeMessage('GET', url);
    const raw = await _sendRequest(session, message, timeout);
    return _parseGoogleResponse(raw);
}
