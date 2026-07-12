import Soup from 'gi://Soup?version=3.0';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

const LANGUAGE_PACKS_URL = 'https://raw.githubusercontent.com/YamithR/NeoTraductorGenomeShell/main/language-packs.json';

function _makeMessage(method, url) {
    const uri = GLib.Uri.parse(url, GLib.UriFlags.NONE);
    return new Soup.Message({ method, uri });
}

export async function fetchAvailableLanguagePacks(timeout = 10000) {
    const session = new Soup.Session();
    const message = _makeMessage('GET', LANGUAGE_PACKS_URL);
    return new Promise((resolve, reject) => {
        const cancellable = Gio.Cancellable.new();
        let timeoutId = 0;
        timeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, timeout, () => {
            cancellable.cancel();
            resolve([]);
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
                    resolve([]);
                    return;
                }
                const bytes = src.send_and_read_finish(res);
                const decoder = new TextDecoder('utf-8');
                const response = decoder.decode(bytes.get_data());
                const packs = JSON.parse(response);
                resolve(Array.isArray(packs) ? packs : []);
            } catch {
                resolve([]);
            }
        });
    });
}

export async function downloadLanguagePack(langCode, extensionDir, onProgress, timeout = 30000) {
    const localeDir = `${extensionDir}/locale/${langCode}/LC_MESSAGES`;
    const poUrl = `https://raw.githubusercontent.com/YamithR/NeoTraductorGenomeShell/main/locale/${langCode}/LC_MESSAGES/neotraductor.po`;
    const session = new Soup.Session();
    const message = _makeMessage('GET', poUrl);
    return new Promise((resolve, reject) => {
        const cancellable = Gio.Cancellable.new();
        let timeoutId = 0;
        timeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, timeout, () => {
            cancellable.cancel();
            reject(new Error('Tiempo de espera agotado'));
            return GLib.SOURCE_REMOVE;
        });
        session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, cancellable, async (src, res) => {
            if (timeoutId > 0) {
                GLib.source_remove(timeoutId);
                timeoutId = 0;
            }
            try {
                const status = message.get_status();
                if (status !== Soup.Status.OK) {
                    reject(new Error(`Error descargando paquete: HTTP ${status}`));
                    return;
                }
                const bytes = src.send_and_read_finish(res);
                const decoder = new TextDecoder('utf-8');
                const content = decoder.decode(bytes.get_data());
                GLib.mkdir_with_parents(localeDir, 0o755);
                const poPath = `${localeDir}/neotraductor.po`;
                GLib.file_set_contents(poPath, content);
                const moPath = `${localeDir}/neotraductor.mo`;
                try {
                    GLib.spawn_command_line_sync(`msgfmt "${poPath}" -o "${moPath}"`);
                } catch (e) {
                    console.warn(`No se pudo compilar .mo para ${langCode}: ${e}`);
                }
                if (onProgress) onProgress(100);
                resolve(true);
            } catch (e) {
                reject(e);
            }
        });
    });
}

export async function removeLanguagePack(langCode, extensionDir) {
    const localeDir = `${extensionDir}/locale/${langCode}`;
    try {
        const dir = Gio.File.new_for_path(localeDir);
        if (dir.query_exists(null)) {
            dir.delete(null);
        }
        return true;
    } catch (e) {
        console.warn(`Error eliminando paquete ${langCode}: ${e}`);
        return false;
    }
}

export function getInstalledPacks(extensionDir) {
    const localePath = `${extensionDir}/locale`;
    const dir = Gio.File.new_for_path(localePath);
    if (!dir.query_exists(null)) return [];
    const enumerator = dir.enumerate_children('standard::name', Gio.FileQueryInfoFlags.NONE, null);
    const packs = [];
    let info;
    while ((info = enumerator.next_file(null))) {
        if (info.get_file_type() === Gio.FileType.DIRECTORY) {
            packs.push(info.get_name());
        }
    }
    enumerator.close(null);
    return packs;
}
