# DentAssist · Tokens y white-label

## Archivos
- `dentassist-tokens.css`: variables CSS (marca 50–950, neutros, semánticos, estados de cita, tipografía, espaciado, radios, sombras, gradientes, modo oscuro).
- `tailwind.preset.js`: preset de Tailwind/shadcn que lee esas variables.

## Uso en Tailwind / shadcn/ui
```js
// tailwind.config.js
module.exports = { presets: [require('./tailwind.preset.js')], content: ['./src/**/*.{ts,tsx}'] };
```
Clases: `bg-brand-500`, `text-brand-700`, `bg-hero`, `bg-btn`, `rounded-lg`, `shadow-md`. Los tokens `primary`, `border`, `ring`, `background` ya mapean a las variables de shadcn.

## Cambiar la marca por empresa
Cada consultorio define su escala en el contenedor raíz (o `<html>`):
```css
[data-empresa="norte"] { --brand-50:#EAF2FE; /* … */ --brand-950:#0A1D40; }
```
Hay variantes de ejemplo en el CSS: `[data-brand="azul|violeta|coral"]`.
Para derivar la escala desde un solo color (generación en OKLCH, pasos 50→950, con 600/700 como pasos de texto AA sobre blanco), hazlo en el backend al guardar la "Configuración de marca" y emite el bloque CSS por empresa.

Otras variables por empresa: `--accent-500`, `--font-sans`, `--font-display`, logos y favicon (URLs en la config).

## Contraste
- Botón primario: gradiente `--brand-600 → --brand-700` con texto blanco (AA).
- `--brand-500` sirve para relleno y acentos, no como fondo de texto blanco pequeño.
- Si una marca nueva no cumple AA con blanco, usar el paso 700+ como base del botón.

## Modo oscuro
`<html data-theme="dark">` redefine neutros y superficies; la escala de marca se mantiene.

## Tipografías predefinidas
1. Plus Jakarta Sans (por defecto)
2. Inter + Lora (títulos serif)
3. DM Sans + Source Serif 4

## Zona horaria y moneda
America/Lima · formato `S/ 1,250.00` con números tabulares (`.tnum`).
