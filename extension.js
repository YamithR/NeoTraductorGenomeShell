import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import {LANGUAGES, getLanguageInfo, getLanguageName, getNativeName, getLanguageFlag, normalizeLangCode} from './utils/languages.js';
import {translateText, getAvailableProviders} from './utils/translator.js';

const ICON_NAME = 'edit-find-symbolic';
const FALLBACK_ICONS = ['edit-find-symbolic', 'system-search-symbolic', 'emblem-system-symbolic'];

export default class NeoTraductorExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._indicator = null;
        this._history = [];
        this._translationInProgress = false;

        this._buildIndicator();
        this._updateDynamicStyles();
        this._connectSettings();
        this._registerShortcut();

        if (this._settings.get_boolean('show-indicator')) {
            this._indicator.show();
        }
    }

    disable() {
        this._disconnectSettings();
        this._unregisterShortcut();
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
        this._settings = null;
        this._history = null;
    }

    _buildIndicator() {
        this._indicator = new PanelMenu.Button(0.0, this.metadata.name, false);

        this._updateButtonStyle();

        this._buildMenu();

        Main.panel.addToStatusArea(this.uuid, this._indicator, 1, 'right');
    }

    _updateButtonStyle() {
        this._indicator.get_first_child()?.destroy();

        const style = this._settings.get_string('indicator-style');
        const color = this._settings.get_string('button-color');

        let buttonWidget;
        if (style === 'text') {
            const customText = this._settings.get_string('indicator-text') || 'T';
            buttonWidget = new St.Label({
                text: customText,
                style_class: 'neotraductor-panel-label',
                y_align: Clutter.ActorAlign.CENTER,
            });
        } else {
            const customIcon = this._settings.get_string('indicator-icon') || ICON_NAME;
            buttonWidget = new St.Icon({
                icon_name: customIcon,
                style_class: 'system-status-icon',
                fallback_icon_name: 'face-laugh-symbolic',
            });
        }

        if (color !== 'default') {
            buttonWidget.add_style_class_name(`neotraductor-color-${color}`);
        }

        this._indicator.add_child(buttonWidget);
    }

    _updateDynamicStyles() {
        if (!this._indicator) return;

        const menuBg = this._settings.get_string('menu-bg-color');
        const opacity = this._settings.get_double('menu-opacity');
        const resultBg = this._settings.get_string('result-bg-color');
        const inputBg = this._settings.get_string('input-bg-color');

        const menuBox = this._indicator.menu.box;

        const parts = [];
        if (opacity < 1.0) {
            parts.push(`opacity: ${opacity};`);
        }
        if (menuBg !== 'default') {
            parts.push(`background-color: ${menuBg};`);
        }
        menuBox.set_style(parts.join(' '));

        if (this._resultBox) {
            const rParts = [];
            if (resultBg !== 'default') {
                rParts.push(`background-color: ${resultBg};`);
            }
            this._resultBox.set_style(rParts.join(' '));
        }

        if (this._textEntry && inputBg !== 'default') {
            this._textEntry.set_style(`background-color: ${inputBg};`);
        }
    }

    _buildMenu() {
        const menu = this._indicator.menu;
        menu.box.style_class = 'neotraductor-menu-box';

        this._sourceLangCombo = this._createLangCombo('source-lang', true);
        menu.addMenuItem(this._sourceLangCombo.item);

        this._swapButton = new PopupMenu.PopupMenuItem('⇄ ' + _('Intercambiar'), {
            style_class: 'neotraductor-swap-button',
        });
        this._swapButton.connect('activate', () => this._swapLanguages());
        menu.addMenuItem(this._swapButton);

        this._targetLangCombo = this._createLangCombo('target-lang', false);
        menu.addMenuItem(this._targetLangCombo.item);

        menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        const inputSection = new PopupMenu.PopupMenuSection();
        inputSection.actor.style_class = 'neotraductor-input-section';

        this._textEntry = new St.Entry({
            name: 'neotraductorTextEntry',
            style_class: 'neotraductor-text-entry',
            hint_text: _('Escribe el texto a traducir...'),
            can_focus: true,
            track_hover: true,
        });
        this._textEntry.clutter_text.connect('key-press-event', (entry, event) => {
            if (event.get_key_symbol() === Clutter.KEY_Return) {
                if (event.get_state() & Clutter.ModifierType.CONTROL_MASK) {
                    this._swapLanguages();
                } else {
                    this._doTranslate();
                }
                return Clutter.EVENT_STOP;
            }
            return Clutter.EVENT_PROPAGATE;
        });
        inputSection.actor.add_child(this._textEntry);

        this._translateButton = new St.Button({
            style_class: 'neotraductor-translate-button',
            label: _('Traducir'),
            reactive: true,
            can_focus: true,
        });
        this._translateButton.connect('clicked', () => this._doTranslate());
        inputSection.actor.add_child(this._translateButton);

        this._loadingLabel = new St.Label({
            text: '',
            style_class: 'neotraductor-loading',
            visible: false,
        });
        inputSection.actor.add_child(this._loadingLabel);

        menu.addMenuItem(inputSection);

        menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        this._resultBox = new St.BoxLayout({
            style_class: 'neotraductor-result-box',
            vertical: true,
            visible: false,
        });
        this._resultLabel = new St.Label({
            style_class: 'neotraductor-result-label',
            reactive: true,
            track_hover: true,
        });
        this._resultLabel.connect('button-press-event', () => this._copyResult());
        this._resultBox.add_child(this._resultLabel);

        const actionRow = new St.BoxLayout({ style_class: 'neotraductor-action-row' });

        this._copyButton = new St.Button({
            style_class: 'neotraductor-action-button',
            label: _('Copiar'),
            reactive: true,
        });
        this._copyButton.connect('clicked', () => this._copyResult());
        actionRow.add_child(this._copyButton);

        this._openButton = new St.Button({
            style_class: 'neotraductor-action-button',
            label: _('Abrir en navegador'),
            reactive: true,
        });
        this._openButton.connect('clicked', () => this._openInBrowser());
        actionRow.add_child(this._openButton);

        this._resultBox.add_child(actionRow);

        const resultSection = new PopupMenu.PopupMenuSection();
        resultSection.actor.add_child(this._resultBox);
        menu.addMenuItem(resultSection);

        menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        this._historySection = new PopupMenu.PopupMenuSection();
        this._historySection.actor.style_class = 'neotraductor-history-section';
        this._historyLabel = new St.Label({
            text: _('Historial'),
            style_class: 'neotraductor-history-title',
        });
        this._historySection.actor.add_child(this._historyLabel);
        this._historyBox = new St.BoxLayout({
            vertical: true,
            style_class: 'neotraductor-history-box',
        });
        this._historySection.actor.add_child(this._historyBox);

        if (this._settings.get_int('history-size') > 0) {
            menu.addMenuItem(this._historySection);
        }

        menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        const prefsItem = new PopupMenu.PopupMenuItem(_('Preferencias') + '…');
        prefsItem.connect('activate', () => this.openPreferences());
        menu.addMenuItem(prefsItem);

        const dlItem = new PopupMenu.PopupMenuItem(_('Descargar paquetes de idiomas') + '…');
        dlItem.connect('activate', () => this.openPreferences());
        menu.addMenuItem(dlItem);
    }

    _createLangCombo(settingKey, includeAuto) {
        const item = new PopupMenu.PopupSubMenuMenuItem(_('Idioma'), true);
        const currentCode = this._settings.get_string(settingKey);
        const keys = Object.keys(LANGUAGES);
        const filteredKeys = includeAuto ? keys : keys.filter(k => k !== 'auto');
        filteredKeys.forEach(code => {
            const info = LANGUAGES[code];
            const label = `${info.flag} ${info.native} (${info.name})`;
            const menuItem = new PopupMenu.PopupMenuItem(label);
            menuItem._langCode = code;
            menuItem.connect('activate', () => {
                this._settings.set_string(settingKey, code);
                item.label.text = `${info.flag} ${info.native}`;
                item.menu.close();
            });
            item.menu.addMenuItem(menuItem);
            if (code === currentCode) {
                item.label.text = `${info.flag} ${info.native}`;
            }
        });
        if (!item.label.text) {
            const fallback = LANGUAGES[currentCode] || LANGUAGES[filteredKeys[0]];
            item.label.text = `${fallback.flag} ${fallback.native}`;
        }
        return { item, menu: item.menu };
    }

    _swapLanguages() {
        const src = this._settings.get_string('source-lang');
        const tgt = this._settings.get_string('target-lang');
        if (src === 'auto') return;
        this._settings.set_string('source-lang', tgt);
        this._settings.set_string('target-lang', src);
    }

    async _doTranslate() {
        if (this._translationInProgress) return;

        const text = this._textEntry.get_text()?.trim();
        if (!text) return;

        const source = this._settings.get_string('source-lang');
        const target = this._settings.get_string('target-lang');
        const provider = this._settings.get_string('translate-provider');
        const apiKey = this._settings.get_string('api-key');
        const selfHostedUrl = this._settings.get_string('self-hosted-url');
        const maxLen = this._settings.get_int('max-text-length');
        const timeout = this._settings.get_int('provider-timeout');

        if (text.length > maxLen) {
            this._showResult(_('Texto demasiado largo. Máximo %d caracteres.').format(maxLen));
            return;
        }

        const normSource = normalizeLangCode(source);
        const normTarget = normalizeLangCode(target);

        this._translationInProgress = true;
        this._loadingLabel.text = _('Traduciendo…');
        this._loadingLabel.visible = true;
        this._resultBox.visible = false;

        try {
            const result = await translateText(text, normSource, normTarget, provider, apiKey, selfHostedUrl, timeout);
            if (result) {
                this._showResult(result);
                this._addToHistory(text, result, source, target);
                if (this._settings.get_boolean('auto-clipboard')) {
                    this._copyToClipboard(result);
                }
            } else {
                this._showResult(_('No se pudo traducir. Verifica tu conexión o cambia de proveedor.'));
            }
        } catch (e) {
            this._showResult(_('Error: %s').format(e.message));
        } finally {
            this._translationInProgress = false;
            this._loadingLabel.visible = false;
        }
    }

    _showResult(text) {
        this._resultLabel.text = text;
        this._resultBox.visible = true;
    }

    _copyResult() {
        const text = this._resultLabel.text;
        if (text) {
            this._copyToClipboard(text);
        }
    }

    _copyToClipboard(text) {
        try {
            const type = St.ClipboardType?.CLIPBOARD ?? St.ClipboardType?.PRIMARY ?? 0;
            St.Clipboard.get_default().set_text(type, text);
        } catch (e) {
            console.warn(`NeoTraductor: Error copiando al portapapeles: ${e}`);
        }
    }

    _openInBrowser() {
        const text = this._textEntry.get_text()?.trim();
        if (!text) return;
        const source = this._settings.get_string('source-lang');
        const target = this._settings.get_string('target-lang');
        const url = `https://translate.google.com/?sl=${source}&tl=${target}&text=${encodeURIComponent(text)}&op=translate`;
        GLib.spawn_command_line_async(`xdg-open "${url}"`);
    }

    _addToHistory(original, translation, source, target) {
        const maxHistory = this._settings.get_int('history-size');
        if (maxHistory <= 0) return;

        this._history.unshift({ original, translation, source, target, timestamp: Date.now() });
        if (this._history.length > maxHistory) {
            this._history.pop();
        }
        this._updateHistoryUI();
    }

    _updateHistoryUI() {
        this._historyBox.destroy_all_children();
        this._history.forEach((entry, idx) => {
            const item = new St.Button({
                style_class: 'neotraductor-history-item',
                reactive: true,
                can_focus: true,
            });
            const srcName = getLanguageFlag(entry.source) + ' ' + getNativeName(entry.source);
            const tgtName = getLanguageFlag(entry.target) + ' ' + getNativeName(entry.target);
            const label = new St.Label({
                text: _('%s → %s: %s').format(srcName, tgtName, entry.translation.substring(0, 80)),
                style_class: 'neotraductor-history-text',
            });
            item.add_child(label);
            item.connect('clicked', () => {
                this._textEntry.set_text(entry.original);
                this._showResult(entry.translation);
            });
            this._historyBox.add_child(item);
        });
    }

    _connectSettings() {
        this._settingsChangedIds = [];
        this._settingsChangedIds.push(
            this._settings.connect('changed::indicator-style', () => this._updateButtonStyle())
        );
        this._settingsChangedIds.push(
            this._settings.connect('changed::button-color', () => this._updateButtonStyle())
        );
        this._settingsChangedIds.push(
            this._settings.connect('changed::indicator-text', () => this._updateButtonStyle())
        );
        this._settingsChangedIds.push(
            this._settings.connect('changed::indicator-icon', () => this._updateButtonStyle())
        );
        this._settingsChangedIds.push(
            this._settings.connect('changed::history-size', () => {
                if (this._settings.get_int('history-size') > 0) {
                    this._indicator.menu.addMenuItem(this._historySection);
                } else {
                    this._historySection.actor.destroy();
                }
            })
        );
        this._settingsChangedIds.push(
            this._settings.connect('changed::show-indicator', () => {
                if (this._settings.get_boolean('show-indicator')) {
                    this._indicator.show();
                } else {
                    this._indicator.hide();
                }
            })
        );
        ['menu-bg-color', 'menu-opacity', 'result-bg-color', 'input-bg-color'].forEach(key => {
            this._settingsChangedIds.push(
                this._settings.connect(`changed::${key}`, () => this._updateDynamicStyles())
            );
        });
    }

    _disconnectSettings() {
        if (this._settingsChangedIds) {
            this._settingsChangedIds.forEach(id => {
                this._settings?.disconnect(id);
            });
            this._settingsChangedIds = null;
        }
    }

    _registerShortcut() {
        try {
            const shortcut = this._settings.get_strv('shortcut-key');
            if (shortcut && shortcut.length > 0) {
                this._shortcutId = Main.wm.addKeybinding(
                    'shortcut-key',
                    this._settings,
                    Meta.KeyBindingFlags.NONE,
                    Shell.ActionMode.NORMAL,
                    () => {
                        if (this._indicator) {
                            this._indicator.menu.open();
                        }
                    }
                );
            }
        } catch (e) {
            console.warn(`NeoTraductor: Error registrando atajo: ${e}`);
        }
    }

    _unregisterShortcut() {
        if (this._shortcutId) {
            Main.wm.removeKeybinding('shortcut-key');
            this._shortcutId = null;
        }
    }
}
