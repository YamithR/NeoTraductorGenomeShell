# NeoTraductor GNOME Shell

Extensión de traducción multilingüe para GNOME Shell 45+ con **Google Translate** (endpoint gratuito, sin API Key). Interfaz personalizable con selector visual de colores, historial y paquetes de idiomas descargables.

## Características

- **Google Translate** integrado — sin API Key, sin configuración
- **80+ idiomas** con detección automática
- **Historial** de traducciones recientes
- **Auto-copiar** al portapapeles
- **Atajo de teclado** global configurable (`Super+T`)
- **Selector visual de colores** (`Gtk.ColorButton`) para fondo del menú, resultado y campo de texto
- **Slider de opacidad** (`Gtk.Scale`) para el menú
- **Selector de ícono** visual con FlowBox (27 iconos GNOME)
- **Paquetes de idiomas** descargables para la interfaz
- **Preferencias** con interfaz Adwaita moderna (3 páginas: Apariencia, Idiomas, Avanzado)

## Instalación

### Requisitos

- GNOME Shell 45, 46, 47 o 48
- `glib-compile-schemas` (incluido en `libglib2.0-dev` / `glib2-devel`)

### Instalación manual (recomendada con enlace simbólico)

```bash
# Clonar el repositorio
git clone https://github.com/YamithR/NeoTraductorGenomeShell.git

# Crear directorio de extensiones si no existe
mkdir -p ~/.local/share/gnome-shell/extensions

# Crear enlace simbólico (se actualiza solo al hacer git pull)
ln -sf "$PWD/NeoTraductorGenomeShell" ~/.local/share/gnome-shell/extensions/neotraductor@yamithr.dev

# Compilar esquemas GSettings
cd ~/.local/share/gnome-shell/extensions/neotraductor@yamithr.dev
glib-compile-schemas schemas/
```

> Nota: Con el enlace simbólico, cualquier cambio en el repositorio se refleja automáticamente. Solo necesitas reiniciar GNOME Shell.

### Instalación directa (copia)

```bash
git clone https://github.com/YamithR/NeoTraductorGenomeShell.git
cd NeoTraductorGenomeShell
glib-compile-schemas schemas/
mkdir -p ~/.local/share/gnome-shell/extensions/neotraductor@yamithr.dev
cp -r . ~/.local/share/gnome-shell/extensions/neotraductor@yamithr.dev/
```

### Activar la extensión

1. Reinicia GNOME Shell: `Alt+F2` → `r` → Enter
2. Abre **Extension Manager** (o `gnome-extensions-app`)
3. Busca "NeoTraductor" y actívalo

## Uso

1. Haz clic en el icono del traductor en el panel superior
2. Selecciona idioma origen (o "Detectar") y destino
3. Escribe el texto y presiona **Enter** o haz clic en **"Traducir"**
4. El resultado aparece debajo; haz clic en el texto para copiarlo
5. Usa **`Ctrl+Enter`** en el campo de texto para intercambiar idiomas rápidamente
6. El historial guarda las últimas traducciones; haz clic en una entrada para reutilizarla

### Atajo de teclado

`Super + T` abre el traductor desde cualquier lugar. Configurable en Preferencias → Avanzado.

## Traducción

La extensión usa exclusivamente el endpoint gratuito de Google Translate (`translate.googleapis.com/translate_a/single`). No requiere API Key, registro ni configuración adicional.

## Paquetes de idiomas

La interfaz de NeoTraductor puede traducirse a varios idiomas. Ve a **Preferencias → Idiomas → Gestionar paquetes** para instalar o eliminar paquetes disponibles.

Paquetes disponibles actualmente:

| Código | Idioma |
|--------|--------|
| ca | Català |
| es | Español |
| fr | Français |
| de | Deutsch |
| it | Italiano |
| pt | Português |
| pt_BR | Português (Brasil) |
| ru | Русский |
| ja | 日本語 |
| ko | 한국어 |
| zh_CN | 简体中文 |

Si quieres contribuir con un nuevo paquete, traduce el archivo `locale/es/LC_MESSAGES/neotraductor.po` a tu idioma y abre un PR.

## Personalización

### Apariencia (Preferencias)

- **Mostrar/ocultar** botón en el panel
- **Estilo**: icono simbólico o texto personalizado
- **Color del botón**: 6 colores predefinidos (rojo, verde, azul, naranja, púrpura)
- **Selector de icono**: diálogo visual con 27 iconos GNOME
- **Fondo del menú**: selector de color (`Gtk.ColorButton`) + botón "Default"
- **Fondo del resultado**: selector de color + botón "Default"
- **Fondo del campo de texto**: selector de color + botón "Default"
- **Opacidad del menú**: slider horizontal de 0.0 a 1.0

### Idiomas (Preferencias)

- **Idioma origen** predeterminado
- **Idioma destino** predeterminado
- **Gestión de paquetes** de idiomas disponibles

### Avanzado (Preferencias)

- **Atajo de teclado** global
- **Auto-copiar** al portapapeles
- **Tamaño del historial** (0 = desactivado)

### Avanzada (CSS)

Edita `stylesheet.css` en el directorio de la extensión:

```
~/.local/share/gnome-shell/extensions/neotraductor@yamithr.dev/stylesheet.css
```

## Solución de problemas

### El botón no aparece en el panel

- Ve a Preferencias → Apariencia → "Mostrar indicador"
- Reinicia GNOME Shell

### Error 400 / "Bad Request" al traducir

- Verifica tu conexión a internet
- Google Translate puede bloquear peticiones sin User-Agent de navegador (ya incluido en el código)
- Si persiste, espera unos minutos y reintenta

### Error al traducir

- Revisa tu conexión a internet
- Comprueba que el texto no exceda el límite de caracteres (configurable en el esquema)

### No se abren las preferencias

```bash
journalctl -f -o cat /usr/bin/gjs
```

## Desarrollo

### Estructura del proyecto

```
neotraductor@yamithr.dev/
├── extension.js          # Lógica principal de la extensión
├── prefs.js              # Interfaz de preferencias (Adw)
├── metadata.json         # Metadatos de la extensión
├── stylesheet.css        # Estilos CSS
├── schemas/              # Esquemas GSettings
│   ├── gschemas.compiled
│   └── org.gnome.shell.extensions.neotraductor.gschema.xml
├── utils/
│   ├── translator.js     # Cliente Google Translate (gratuito)
│   ├── languages.js      # 80+ idiomas con banderas
│   └── downloader.js     # Descarga de paquetes de idiomas
└── locale/               # Traducciones de la interfaz
```

### Empaquetar para extensions.gnome.org

```bash
gnome-extensions pack \
  --extra-source=utils/ \
  --extra-source=locale/ \
  --extra-source=language-packs.json \
  --schema=schemas/org.gnome.shell.extensions.neotraductor.gschema.xml
```

## Licencia

GPL-3.0
