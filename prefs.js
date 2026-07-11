import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk?version=4.0';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import {LANGUAGES, getLanguageCodes} from './utils/languages.js';
import {getAvailableProviders} from './utils/translator.js';

export default class NeoTraductorPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        window._settings = this.getSettings();

        this._addGeneralPage(window);
        this._addAppearancePage(window);
        this._addLanguagesPage(window);
        this._addAdvancedPage(window);
    }

    _addGeneralPage(window) {
        const page = new Adw.PreferencesPage({
            title: _('General'),
            icon_name: 'preferences-system-symbolic',
        });
        window.add(page);

        const translationGroup = new Adw.PreferencesGroup({
            title: _('Traducción'),
            description: _('Configuración del servicio de traducción'),
        });
        page.add(translationGroup);

        const providerRow = new Adw.ComboRow({
            title: _('Proveedor'),
            subtitle: _('Servicio de traducción a utilizar'),
        });
        const providers = getAvailableProviders();
        const providerList = new Gtk.StringList();
        providers.forEach(p => providerList.append(p.name));
        providerRow.set_model(providerList);
        const currentProvider = window._settings.get_string('translate-provider');
        const currentIdx = providers.findIndex(p => p.id === currentProvider);
        if (currentIdx >= 0) providerRow.set_selected(currentIdx);
        providerRow.connect('notify::selected', row => {
            const idx = row.get_selected();
            if (idx >= 0 && idx < providers.length) {
                window._settings.set_string('translate-provider', providers[idx].id);
                this._updateApiKeyVisibility(window, providers[idx].needsKey);
            }
        });
        translationGroup.add(providerRow);

        this._apiKeyRow = new Adw.EntryRow({
            title: _('API Key'),
            subtitle: _('Clave de API para servicios que lo requieran'),
        });
        window._settings.bind('api-key', this._apiKeyRow, 'text', Gio.SettingsBindFlags.DEFAULT);
        const currentProv = providers.find(p => p.id === currentProvider);
        this._updateApiKeyVisibility(window, currentProv?.needsKey || false);
        translationGroup.add(this._apiKeyRow);

        this._selfHostedRow = new Adw.EntryRow({
            title: _('URL auto-hosteada'),
            subtitle: _('URL de tu propio servidor LibreTranslate (opcional)'),
        });
        window._settings.bind('self-hosted-url', this._selfHostedRow, 'text', Gio.SettingsBindFlags.DEFAULT);
        translationGroup.add(this._selfHostedRow);

        const limitsGroup = new Adw.PreferencesGroup({
            title: _('Límites'),
            description: _('Límites de uso del traductor'),
        });
        page.add(limitsGroup);

        const maxLenRow = new Adw.SpinRow({
            title: _('Máximo de caracteres'),
            subtitle: _('Límite de texto para traducir'),
            adjustment: new Gtk.Adjustment({
                lower: 100,
                upper: 50000,
                step_increment: 100,
                page_increment: 1000,
            }),
        });
        window._settings.bind('max-text-length', maxLenRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        limitsGroup.add(maxLenRow);

        const timeoutRow = new Adw.SpinRow({
            title: _('Timeout (ms)'),
            subtitle: _('Tiempo máximo de espera del proveedor'),
            adjustment: new Gtk.Adjustment({
                lower: 1000,
                upper: 60000,
                step_increment: 1000,
                page_increment: 5000,
            }),
        });
        window._settings.bind('provider-timeout', timeoutRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        limitsGroup.add(timeoutRow);
    }

    _updateApiKeyVisibility(window, needsKey) {
        this._apiKeyRow.visible = needsKey;
    }

    _addAppearancePage(window) {
        const page = new Adw.PreferencesPage({
            title: _('Apariencia'),
            icon_name: 'preferences-desktop-theme-symbolic',
        });
        window.add(page);

        const indicatorGroup = new Adw.PreferencesGroup({
            title: _('Indicador'),
            description: _('Personaliza la apariencia del botón en el panel'),
        });
        page.add(indicatorGroup);

        const showSwitch = new Adw.SwitchRow({
            title: _('Mostrar indicador'),
            subtitle: _('Mostrar u ocultar el botón en el panel superior'),
        });
        window._settings.bind('show-indicator', showSwitch, 'active', Gio.SettingsBindFlags.DEFAULT);
        indicatorGroup.add(showSwitch);

        const styleRow = new Adw.ComboRow({
            title: _('Estilo'),
            subtitle: _('Texto "T" o icono en el panel'),
        });
        const styleList = new Gtk.StringList();
        styleList.append(_('Icono'));
        styleList.append(_('Texto'));
        styleRow.set_model(styleList);
        const currentStyle = window._settings.get_string('indicator-style');
        styleRow.set_selected(currentStyle === 'text' ? 1 : 0);
        styleRow.connect('notify::selected', row => {
            window._settings.set_string('indicator-style', row.get_selected() === 1 ? 'text' : 'icon');
        });
        indicatorGroup.add(styleRow);

        const colorRow = new Adw.ComboRow({
            title: _('Color'),
            subtitle: _('Color del botón en el panel'),
        });
        const colors = [
            { id: 'default', label: _('Predeterminado') },
            { id: 'red', label: _('Rojo') },
            { id: 'green', label: _('Verde') },
            { id: 'blue', label: _('Azul') },
            { id: 'orange', label: _('Naranja') },
            { id: 'purple', label: _('Púrpura') },
        ];
        const colorList = new Gtk.StringList();
        colors.forEach(c => colorList.append(c.label));
        colorRow.set_model(colorList);
        const currentColor = window._settings.get_string('button-color');
        const colorIdx = colors.findIndex(c => c.id === currentColor);
        if (colorIdx >= 0) colorRow.set_selected(colorIdx);
        colorRow.connect('notify::selected', row => {
            const idx = row.get_selected();
            if (idx >= 0 && idx < colors.length) {
                window._settings.set_string('button-color', colors[idx].id);
            }
        });
        indicatorGroup.add(colorRow);
    }

    _addLanguagesPage(window) {
        const page = new Adw.PreferencesPage({
            title: _('Idiomas'),
            icon_name: 'preferences-locale-symbolic',
        });
        window.add(page);

        const defaultGroup = new Adw.PreferencesGroup({
            title: _('Idiomas por defecto'),
            description: _('Idiomas de origen y destino predeterminados'),
        });
        page.add(defaultGroup);

        const sourceRow = new Adw.ComboRow({
            title: _('Idioma origen'),
            subtitle: _('Idioma de origen predeterminado'),
        });
        const sourceList = new Gtk.StringList();
        const langKeys = getLanguageCodes();
        langKeys.forEach(code => {
            const info = LANGUAGES[code];
            sourceList.append(`${info.flag} ${info.native} (${info.name})`);
        });
        sourceRow.set_model(sourceList);
        const currentSrc = window._settings.get_string('source-lang');
        const srcIdx = langKeys.indexOf(currentSrc);
        if (srcIdx >= 0) sourceRow.set_selected(srcIdx);
        sourceRow.connect('notify::selected', row => {
            const idx = row.get_selected();
            if (idx >= 0 && idx < langKeys.length) {
                window._settings.set_string('source-lang', langKeys[idx]);
            }
        });
        defaultGroup.add(sourceRow);

        const targetRow = new Adw.ComboRow({
            title: _('Idioma destino'),
            subtitle: _('Idioma de destino predeterminado'),
        });
        const targetList = new Gtk.StringList();
        const filteredKeys = langKeys.filter(k => k !== 'auto');
        filteredKeys.forEach(code => {
            const info = LANGUAGES[code];
            targetList.append(`${info.flag} ${info.native} (${info.name})`);
        });
        targetRow.set_model(targetList);
        const currentTgt = window._settings.get_string('target-lang');
        const tgtIdx = filteredKeys.indexOf(currentTgt);
        if (tgtIdx >= 0) targetRow.set_selected(tgtIdx);
        targetRow.connect('notify::selected', row => {
            const idx = row.get_selected();
            if (idx >= 0 && idx < filteredKeys.length) {
                window._settings.set_string('target-lang', filteredKeys[idx]);
            }
        });
        defaultGroup.add(targetRow);

        const downloadGroup = new Adw.PreferencesGroup({
            title: _('Paquetes de idiomas'),
            description: _('Descarga paquetes de idiomas adicionales para la interfaz'),
        });
        page.add(downloadGroup);

        const downloadBtn = new Gtk.Button({
            label: _('Descargar paquetes disponibles…'),
            halign: Gtk.Align.START,
            margin_top: 8,
        });
        downloadBtn.connect('clicked', () => {
            this._showLanguagePackDialog(window);
        });
        downloadGroup.add(downloadBtn);

        const installedLabel = new Gtk.Label({
            label: _('Los paquetes instalados aparecerán aquí.'),
            margin_top: 8,
            use_markup: true,
            wrap: true,
            xalign: 0,
        });
        downloadGroup.add(installedLabel);
    }

    _showLanguagePackDialog(window) {
        const dialog = new Adw.MessageDialog({
            transient_for: window,
            heading: _('Paquetes de idiomas'),
            body: _('Función próxima: aquí podrás explorar y descargar paquetes de idiomas adicionales para la interfaz de NeoTraductor.'),
            close_response: 'ok',
        });
        dialog.add_response('ok', _('Entendido'));
        dialog.present();
    }

    _addAdvancedPage(window) {
        const page = new Adw.PreferencesPage({
            title: _('Avanzado'),
            icon_name: 'preferences-other-symbolic',
        });
        window.add(page);

        const shortcutsGroup = new Adw.PreferencesGroup({
            title: _('Atajos de teclado'),
            description: _('Configura los atajos de teclado globales'),
        });
        page.add(shortcutsGroup);

        const shortcutRow = new Adw.EntryRow({
            title: _('Atajo global'),
            subtitle: _('Tecla para abrir el traductor (ej: <Super>t)'),
        });
        window._settings.bind('shortcut-key', shortcutRow, 'text', Gio.SettingsBindFlags.DEFAULT);
        shortcutsGroup.add(shortcutRow);

        const behaviorGroup = new Adw.PreferencesGroup({
            title: _('Comportamiento'),
            description: _('Configura el comportamiento del traductor'),
        });
        page.add(behaviorGroup);

        const clipboardSwitch = new Adw.SwitchRow({
            title: _('Auto-copiar al portapapeles'),
            subtitle: _('Copiar automáticamente el resultado de la traducción'),
        });
        window._settings.bind('auto-clipboard', clipboardSwitch, 'active', Gio.SettingsBindFlags.DEFAULT);
        behaviorGroup.add(clipboardSwitch);

        const historyRow = new Adw.SpinRow({
            title: _('Tamaño del historial'),
            subtitle: _('Número de traducciones a recordar (0 = desactivado)'),
            adjustment: new Gtk.Adjustment({
                lower: 0,
                upper: 100,
                step_increment: 1,
                page_increment: 10,
            }),
        });
        window._settings.bind('history-size', historyRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        behaviorGroup.add(historyRow);

        const aboutGroup = new Adw.PreferencesGroup({
            title: _('Acerca de'),
        });
        page.add(aboutGroup);

        const aboutRow = new Adw.ActionRow({
            title: 'NeoTraductor',
            subtitle: _('Extensión de traducción multilingüe para GNOME Shell'),
        });
        aboutGroup.add(aboutRow);

        const versionLabel = new Gtk.Label({
            label: '1.0.0',
            css_classes: ['caption'],
        });
        aboutRow.add_suffix(versionLabel);

        const creditsRow = new Adw.ActionRow({
            title: _('Desarrollado por'),
            subtitle: 'YamithR',
        });
        aboutGroup.add(creditsRow);
    }
}
