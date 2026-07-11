# NeoTraductor GNOME Shell

Extensión de traducción multilingüe para GNOME Shell 45+ con soporte para múltiples proveedores, interfaz personalizable, historial y paquetes de idiomas descargables.

## Características

- **Múltiples proveedores**: Apertium, LibreTranslate, DeepL y Google Translate
- **Interfaz personalizable**: Botón tipo texto o icono, colores, posición en el panel
- **80+ idiomas** con detección automática
- **Historial** de traducciones recientes
- **Auto-copiar** al portapapeles
- **Atajo de teclado** global configurable
- **Paquetes de idiomas** descargables para la interfaz
- **Preferencias** con interfaz Adwaita moderna

## Instalación

### Desde extensions.gnome.org (próximamente)

Visita [extensions.gnome.org](https://extensions.gnome.org) y busca NeoTraductor.

### Instalación manual

```bash
git clone https://github.com/YamithR/NeoTraductorGenomeShell.git
cd NeoTraductorGenomeShell
glib-compile-schemas schemas/
mkdir -p ~/.local/share/gnome-shell/extensions/neotraductor@yamithr.dev
cp -r * ~/.local/share/gnome-shell/extensions/neotraductor@yamithr.dev/
```

Reinicia GNOME Shell (`Alt+F2` → `r` → Enter) y activa la extensión en Extensions Manager o gnome-extensions-app.

## Uso

1. Haz clic en el icono del traductor en el panel superior
2. Selecciona idioma origen y destino
3. Escribe el texto y presiona Enter o haz clic en "Traducir"
4. Usa `Ctrl+Enter` para intercambiar idiomas rápidamente
5. El resultado se muestra en el menú; haz clic para copiar

### Atajo de teclado

Por defecto: `Super + T` (configurable en preferencias)

## Proveedores de traducción

| Proveedor | API Key | Notas |
|-----------|---------|-------|
| Apertium  | No      | Gratuito, 50+ idiomas |
| LibreTranslate | No | Gratuito, soporta auto-hosting |
| DeepL     | Sí*     | 500k caracteres/mes gratis |
| Google    | Sí      | Pago por uso |

*DeepL Free: regístrate en [DeepL API Free](https://www.deepl.com/pro-api) para obtener una key gratuita.

## Personalización

Edita `~/.local/share/gnome-shell/extensions/neotraductor@yamithr.dev/stylesheet.css` para cambios de estilo avanzados, o usa el panel de preferencias para opciones básicas.

## Desarrollo

```bash
gnome-extensions pack \
  --extra-source=utils/ \
  --schema=schemas/org.gnome.shell.extensions.neotraductor.gschema.xml
```

## Licencia

GPL-3.0
