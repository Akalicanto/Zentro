# Marca de Zentro

La Z original se utiliza en los iconos y la navegación reducida. El logo completo se utiliza en la navegación desplegada, la cabecera móvil y el README de GitHub.

- `symbol-source.png`: símbolo original; se conserva sin cambios.
- `wordmark-source.png`: logo completo generado con la herramienta integrada de imágenes, usando la Z como referencia.
- `wordmark.png`: presentación del logo completo sobre crema para GitHub.
- `../../Zentro.Front/public/brand/logo-full.png`: versión transparente optimizada para la aplicación.

`node scripts/generate-brand.mjs`, desde la raíz del repositorio, exporta los recursos a partir de los originales. No recompone las letras con texto HTML.

## Prompt del logo completo

```text
Create one polished horizontal transparent-background logo wordmark reading exactly 'Zentro'. The attached image is the design reference for the capital Z: preserve its distinctive broad rounded folded ribbon silhouette, lavender-purple satin gradient and warm cream reverse-side curls. Extend that visual language to custom lowercase e n t r o lettering, rounded, highly legible, elegantly spaced, with subtle ribbon folds and cream accents, restrained dimensional shading. One coherent brand, with a capital Z followed by lowercase entro on a common baseline; no separate extra symbol, no repeated Z, no additional words. The Z should closely match the reference, approximately the same stroke weight as the custom letters. Minimal sophisticated personal finance brand. Wide composition roughly 4:1, tight balanced transparent margins, centered single word. No background, no card, no mockup, no decorative objects, no drop shadow outside letters. Readable at 180px wide.
```
