# NeoTraductor GNOME Shell

Extensión de traducción multilingüe para GNOME Shell 45+ con soporte para Apertium, LibreTranslate, DeepL y Google Translate. Interfaz personalizable, historial y paquetes de idiomas descargables.

## Características

- **Múltiples proveedores**: Apertium, LibreTranslate, DeepL y Google Translate
- **Interfaz personalizable**: Botón tipo texto o icono, colores, posición en el panel
- **80+ idiomas** con detección automática
- **Historial** de traducciones recientes
- **Auto-copiar** al portapapeles
- **Atajo de teclado** global configurable (`Super+T`)
- **Paquetes de idiomas** descargables para la interfaz
- **Preferencias** con interfaz Adwaita moderna

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

**Nota**: Si usas el enlace simbólico, cualquier cambio que hagas en el repositorio se reflejará automáticamente. Solo necesitas reiniciar GNOME Shell.

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

1. Haz clic en el icono 🔍 (lupa) del traductor en el panel superior
2. Selecciona idioma origen (o "Detectar") y destino
3. Escribe el texto y presiona **Enter** o haz clic en **"Traducir"**
4. El resultado aparece debajo; haz clic en el texto para copiarlo
5. Usa **`Ctrl+Enter`** en el campo de texto para intercambiar idiomas rápidamente
6. El historial guarda las últimas traducciones; haz clic en una entrada para reutilizarla

### Atajo de teclado

`Super + T` abre el traductor desde cualquier lugar. Configurable en Preferencias → Avanzado.

## Proveedores de traducción

| Proveedor | ¿Requiere API Key? | Notas |
|-----------|--------------------|-------|
| **LibreTranslate** | No | Predeterminado. 30+ idiomas. Usa `libretranslate.com` o tu propio servidor |
| **Apertium** | No | 50+ idiomas. Gratuito, open source |
| **DeepL** | Sí | 500k caracteres/mes gratis. [Obtén tu key](https://www.deepl.com/pro-api) |
| **Google Translate** | Sí | Pago por uso. Requiere API key de Google Cloud |

**📌 LibreTranslate** funciona sin configuración adicional. Si quieres usar tu propio servidor, configura la URL en Preferencias → General → URL auto-hosteada.

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

### Básica (Preferencias)
- **General**: Proveedor, API Key, URL auto-hosteada, límites
- **Apariencia**: Mostrar/ocultar botón, estilo icono/texto, color
- **Idiomas**: Par origen/destino predeterminado, paquetes de idiomas
- **Avanzado**: Atajo de teclado, auto-copiar, historial

### Avanzada (CSS)
Edita `stylesheet.css` en el directorio de la extensión:

```
~/.local/share/gnome-shell/extensions/neotraductor@yamithr.dev/stylesheet.css
```

## Solución de problemas

### El botón no aparece en el panel
- Ve a Preferencias → Apariencia → "Mostrar indicador"
- Reinicia GNOME Shell

### Error al traducir
- Abre Preferencias y verifica que el proveedor esté bien configurado
- Prueba cambiar a Apertium o LibreTranslate
- Revisa tu conexión a internet

### No se abren las preferencias
```bash
journalctl -f -o cat /usr/bin/gjs
```

## Desarrollo

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
