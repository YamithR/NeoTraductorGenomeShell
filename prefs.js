import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk?version=4.0';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Gdk from 'gi://Gdk?version=4.0';

import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import {LANGUAGES, getLanguageCodes} from './utils/languages.js';
import {getInstalledPacks, fetchAvailableLanguagePacks, downloadLanguagePack, removeLanguagePack} from './utils/downloader.js';

export default class NeoTraductorPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        window._settings = this.getSettings();
        window._extensionDir = this.path;

        this._addAppearancePage(window);
        this._addLanguagesPage(window);
        this._addAdvancedPage(window);
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
            subtitle: _('Ícono o texto personalizado en el panel'),
        });
        const styleList = new Gtk.StringList();
        styleList.append(_('Ícono'));
        styleList.append(_('Texto'));
        styleRow.set_model(styleList);
        const currentStyle = window._settings.get_string('indicator-style');
        styleRow.set_selected(currentStyle === 'text' ? 1 : 0);
        styleRow.connect('notify::selected', row => {
            window._settings.set_string('indicator-style', row.get_selected() === 1 ? 'text' : 'icon');
            this._updateIndicatorFieldsVisibility(window);
        });
        indicatorGroup.add(styleRow);

        this._iconRow = new Adw.ActionRow({
            title: _('Ícono'),
            subtitle: _('Selecciona un ícono para el indicador'),
        });
        this._iconPreview = Gtk.Image.new_from_icon_name(
            window._settings.get_string('indicator-icon')
        );
        this._iconPreview.set_pixel_size(24);
        this._iconRow.add_suffix(this._iconPreview);
        const iconBtn = new Gtk.Button({
            label: _('Seleccionar…'),
            css_classes: ['flat'],
        });
        iconBtn.connect('clicked', () => this._showIconPicker(window));
        this._iconRow.add_suffix(iconBtn);
        indicatorGroup.add(this._iconRow);

        this._indicatorTextRow = new Adw.EntryRow({
            title: _('Texto del indicador'),
        });
        window._settings.bind('indicator-text', this._indicatorTextRow, 'text', Gio.SettingsBindFlags.DEFAULT);
        indicatorGroup.add(this._indicatorTextRow);

        this._updateIndicatorFieldsVisibility(window);

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

        const styleGroup = new Adw.PreferencesGroup({
            title: _('Estilos de fondo'),
            description: _('Personaliza colores y transparencia de los elementos'),
        });
        page.add(styleGroup);

        this._createColorRow(window, styleGroup, 'menu-bg-color', _('Fondo del menú'));
        this._createColorRow(window, styleGroup, 'result-bg-color', _('Fondo del resultado'));
        this._createColorRow(window, styleGroup, 'input-bg-color', _('Fondo del campo de texto'));
        this._createOpacityRow(window, styleGroup);
    }

    _createColorRow(window, group, settingKey, title) {
        const row = new Adw.ActionRow({ title });

        const currentColor = window._settings.get_string(settingKey);
        const rgba = new Gdk.RGBA();
        if (currentColor.startsWith('#')) {
            rgba.parse(currentColor);
        } else {
            rgba.parse('#353535');
        }

        const colorBtn = new Gtk.ColorButton({ rgba });
        colorBtn.connect('notify::rgba', () => {
            const c = colorBtn.get_rgba();
            const hex = '#%02x%02x%02x'.format(
                Math.round(c.red * 255),
                Math.round(c.green * 255),
                Math.round(c.blue * 255)
            );
            window._settings.set_string(settingKey, hex);
        });
        row.add_suffix(colorBtn);

        const resetBtn = new Gtk.Button({
            label: _('Default'),
            css_classes: ['flat'],
            tooltip_text: _('Restablecer a valor por defecto'),
        });
        resetBtn.connect('clicked', () => {
            window._settings.set_string(settingKey, 'default');
            const d = new Gdk.RGBA();
            d.parse('#353535');
            colorBtn.set_rgba(d);
        });
        row.add_suffix(resetBtn);

        group.add(row);
    }

    _createOpacityRow(window, group) {
        const row = new Adw.ActionRow({
            title: _('Opacidad general'),
        });

        const adj = new Gtk.Adjustment({
            value: window._settings.get_double('menu-opacity'),
            lower: 0.0,
            upper: 1.0,
            step_increment: 0.05,
        });

        const scale = new Gtk.Scale({
            orientation: Gtk.Orientation.HORIZONTAL,
            adjustment: adj,
            draw_value: true,
            digits: 2,
            width_request: 160,
            hexpand: true,
        });

        adj.connect('value-changed', () => {
            window._settings.set_double('menu-opacity', adj.get_value());
        });

        row.add_suffix(scale);
        group.add(row);
    }

    _updateIndicatorFieldsVisibility(window) {
        const style = window._settings.get_string('indicator-style');
        this._iconRow.visible = style === 'icon';
        this._iconRow.subtitle = style === 'icon' ? _('Selecciona un ícono') : '';
        this._indicatorTextRow.visible = style === 'text';
    }

    _showIconPicker(window) {
        const ICONS = [
            ['edit-find-symbolic', '🔍', _('Lupa')],
            ['face-laugh-symbolic', '😀', _('Sonrisa')],
            ['accessories-dictionary-symbolic', '📖', _('Diccionario')],
            ['emblem-system-symbolic', '⚙️', _('Sistema')],
            ['input-keyboard-symbolic', '⌨️', _('Teclado')],
            ['network-server-symbolic', '🌐', _('Red')],
            ['emblem-documents-symbolic', '📄', _('Documentos')],
            ['edit-copy-symbolic', '📋', _('Copiar')],
            ['view-refresh-symbolic', '🔄', _('Actualizar')],
            ['preferences-desktop-locale-symbolic', '🌍', _('Idioma')],
            ['starred-symbolic', '⭐', _('Favorito')],
            ['dialog-information-symbolic', 'ℹ️', _('Info')],
            ['help-contents-symbolic', '❓', _('Ayuda')],
            ['computer-symbolic', '💻', _('PC')],
            ['user-available-symbolic', '👤', _('Usuario')],
            ['weather-clear-night-symbolic', '🌙', _('Luna')],
            ['applications-engineering-symbolic', '🔧', _('Tools')],
            ['preferences-desktop-symbolic', '🖥️', _('Escritorio')],
            ['document-edit-symbolic', '✏️', _('Editar')],
            ['folder-symbolic', '📁', _('Carpeta')],
            ['emblem-photos-symbolic', '🖼️', _('Fotos')],
            ['emblem-music-symbolic', '🎵', _('Música')],
            ['emblem-videos-symbolic', '🎬', _('Vídeo')],
            ['emblem-downloads-symbolic', '⬇️', _('Descargas')],
            ['call-start-symbolic', '📞', _('Teléfono')],
            ['mail-unread-symbolic', '✉️', _('Correo')],
            ['browser-symbolic', '🌐', _('Navegador')],
        ];

        const currentIcon = window._settings.get_string('indicator-icon');

        const dialog = new Adw.MessageDialog({
            transient_for: window,
            heading: _('Seleccionar ícono'),
            close_response: 'cancel',
        });
        dialog.add_response('cancel', _('Cerrar'));

        const scrolled = new Gtk.ScrolledWindow({
            hscrollbar_policy: Gtk.PolicyType.NEVER,
            vscrollbar_policy: Gtk.PolicyType.AUTOMATIC,
            min_content_height: 350,
            max_content_height: 450,
        });

        const flowBox = new Gtk.FlowBox({
            max_children_per_line: 4,
            min_children_per_line: 3,
            selection_mode: Gtk.SelectionMode.NONE,
            column_spacing: 6,
            row_spacing: 6,
            margin_start: 12,
            margin_end: 12,
            margin_top: 12,
            margin_bottom: 12,
            halign: Gtk.Align.CENTER,
        });

        ICONS.forEach(([iconName, emoji, label]) => {
            const box = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                spacing: 4,
                halign: Gtk.Align.CENTER,
            });

            const img = Gtk.Image.new_from_icon_name(iconName);
            img.set_pixel_size(32);

            const isSelected = iconName === currentIcon;
            const btn = new Gtk.ToggleButton({
                active: isSelected,
                child: img,
                tooltip_text: `${label} (${iconName})`,
                css_classes: isSelected ? ['suggested-action'] : [],
            });
            btn.connect('clicked', () => {
                window._settings.set_string('indicator-icon', iconName);
                this._iconPreview.set_from_icon_name(iconName);
                dialog.close();
            });

            const nameLabel = new Gtk.Label({
                label,
                css_classes: ['caption'],
                lines: 1,
                ellipsize: 3,
            });

            const codeLabel = new Gtk.Label({
                label: iconName,
                css_classes: ['caption', 'dim-label'],
                lines: 1,
                ellipsize: 3,
            });

            box.append(btn);
            box.append(nameLabel);
            box.append(codeLabel);

            const child = new Gtk.FlowBoxChild({ child: box });
            flowBox.append(child);
        });

        scrolled.set_child(flowBox);
        dialog.set_extra_child(scrolled);
        dialog.present();
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
            description: _('Instala o elimina paquetes de idiomas para la interfaz de NeoTraductor'),
        });
        page.add(downloadGroup);

        const manageBtn = new Gtk.Button({
            label: _('Gestionar paquetes de idiomas…'),
            halign: Gtk.Align.START,
            margin_top: 8,
        });
        manageBtn.connect('clicked', () => {
            this._showLanguagePackDialog(window);
        });
        downloadGroup.add(manageBtn);
    }

    _showLanguagePackDialog(window) {
        const installed = getInstalledPacks(window._extensionDir);
        const dialog = new Adw.MessageDialog({
            transient_for: window,
            heading: _('Paquetes de idiomas'),
            body: _('Paquetes instalados: %s').format(installed.length > 0 ? installed.join(', ') : _('ninguno')),
            close_response: 'cerrar',
        });
        dialog.add_response('cerrar', _('Cerrar'));

        const PACKS_LIST = [
            { code: 'ca', name: 'Català' },
            { code: 'es', name: 'Español' },
            { code: 'fr', name: 'Français' },
            { code: 'de', name: 'Deutsch' },
            { code: 'it', name: 'Italiano' },
            { code: 'pt', name: 'Português' },
            { code: 'pt_BR', name: 'Português (Brasil)' },
            { code: 'ru', name: 'Русский' },
            { code: 'ja', name: '日本語' },
            { code: 'ko', name: '한국어' },
            { code: 'zh_CN', name: '简体中文' },
        ];

        const installGroup = new Adw.PreferencesGroup({
            title: _('Disponibles'),
            margin_top: 12,
        });
        dialog.set_extra_child(installGroup);

        const available = PACKS_LIST.filter(p => !installed.includes(p.code));

        if (available.length === 0) {
            installGroup.add(new Adw.ActionRow({
                title: _('Todos los paquetes están instalados'),
                subtitle: _('No hay más paquetes disponibles'),
            }));
        } else {
            available.forEach(pack => {
                const row = new Adw.ActionRow({
                    title: pack.name,
                    subtitle: pack.code,
                });
                const installBtn = new Gtk.Button({
                    label: _('Instalar'),
                    css_classes: ['suggested-action'],
                });
                installBtn.connect('clicked', () => {
                    installBtn.sensitive = false;
                    installBtn.label = _('Instalando…');
                    this._performInstall(window, pack.code, installBtn);
                });
                row.add_suffix(installBtn);
                installGroup.add(row);
            });
        }

        dialog.present();
    }

    _performInstall(window, code, btn) {
        downloadLanguagePack(code, window._extensionDir, null, 30000)
            .then(() => {
                btn.label = _('✔ Instalado');
                btn.sensitive = false;
            })
            .catch(err => {
                btn.label = _('Error');
                btn.sensitive = true;
            });
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
        });
        const accels = window._settings.get_strv('shortcut-key');
        shortcutRow.set_text(accels.join(', '));
        shortcutRow.connect('notify::text', row => {
            const text = row.get_text().trim();
            window._settings.set_strv('shortcut-key', text ? [text] : []);
        });
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
            label: '1.1.0',
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
