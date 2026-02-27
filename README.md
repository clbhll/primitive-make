# Primitive Make — Figma Plugin

A Figma plugin for generating color primitive token ramps and pushing them directly into Figma as color variables.

## What it does

1. Enter a hex color value → generates a full 11-step lightness ramp (0–100 in steps of 10)
2. The input color sits at the **50** step (middle), with lighter tints up to white and darker shades down to black
3. Add up to **20 ramps** side by side
4. Click **Push to Figma** to create color variables in a single collection (default: "Primitives")

## Variable structure

Variables are created using the naming convention `color-name/step`:

```
blue/0      → near-white
blue/10
blue/20
blue/30
blue/40
blue/50     → your input hex (base)
blue/60
blue/70
blue/80
blue/90
blue/100    → near-black
```

All ramps go into a single variable collection. You can customize the collection name in the footer input.

## Duplicate handling

If any variables already exist in the collection, the plugin will ask you to:

- **Overwrite** — update existing variables with new values
- **Skip existing** — only create variables that don't exist yet
- **Cancel** — do nothing

## Installation (local development)

1. Open **Figma Desktop**
2. Go to **Plugins → Development → Import plugin from manifest**
3. Select the `manifest.json` file from this folder
4. The plugin will appear in your Plugins menu

## File structure

```
manifest.json   — Plugin configuration
code.js         — Sandbox code (runs in Figma's main thread, handles variable creation)
ui.html         — Plugin UI (token builder interface)
```

## Notes

- No build step required — this is plain JS/HTML, ready to run
- The `id` field in `manifest.json` is a placeholder. Figma will assign a real ID when you publish
- Color math uses HSL interpolation with saturation tapering at extremes for natural-looking ramps
