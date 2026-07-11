import Soup from 'gi://Soup?version=3.0';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

const LANGUAGE_PACKS_URL = 'https://raw.githubusercontent.com/YamithR/NeoTraductorGenomeShell/main/language-packs.json';

export async function fetchAvailableLanguagePacks(timeout = 10000) {
    const session = new Soup.Session();
    const message = new Soup.Message({ method: 'GET', uri: LANGUAGE_PACKS_URL });
    return new Promise((resolve, reject) => {
        session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null, (src, res) => {
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
    const message = new Soup.Message({ method: 'GET', uri: poUrl });
    return new Promise((resolve, reject) => {
        session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null, async (src, res) => {
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
