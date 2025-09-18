## Synapse – Industrial Precision UI (Prototype)

This prototype implements the "Five-Minute Fix" flow described in the design brief for Synapse. It is a Vite + React + TypeScript app styled with Tailwind CSS v4, optimized for fast, glanceable information on the factory floor.

### Run locally

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build && npm run preview
```

### Tech stack

- React 19 + TypeScript
- Tailwind CSS v4 with `@tailwindcss/postcss`
- IBM Plex Sans (Google Fonts)
- Icons via `lucide-react`

### Mapping to UX requirements

- Speed to Answer: minimal navigation; single feed; async steps simulate sub-3s response
- Unambiguous Clarity: high-contrast slate background `#111827`, large part number, tabular numerals
- Trust Through Transparency: stepwise loading card shows analyzing/searching/inventory checks
- Frictionless Interaction: image-first upload button; one-tap copy to clipboard; large targets

### Key screens and components

- Chat feed cards in `src/App.tsx`
  - System message: "Synapse is ready..."
  - LoadingSteps card: shows progress with icons and animations
  - PartCard: part image + part number (prominent) + one-tap Copy
  - InventoryCard: status lozenge (IN STOCK / LOW / OUT) + quantity emphasis
  - DisambiguationCard: two candidates with large "Select This Part"

### Accessibility

- WCAG AA contrast by design tokens; focus-visible rings on interactive elements
- Keyboard navigation enabled for all buttons and disambiguation choices
- Reduced motion supported via `motion-reduce` variants

### Customization

- Colors and typography are defined in CSS variables in `src/index.css` under `@layer theme`.
- Replace mock images and simulated delays with real APIs:
  - Vision: upload endpoint -> part candidates + confidence
  - Data: BOM search endpoint -> part details
  - Inventory: live stock endpoint -> quantity and location

### Folder structure

- `src/App.tsx`: All prototype UI and flow logic
- `src/index.css`: Tailwind setup, theme tokens, components
- `index.html`: Fonts and app root

### Notes

- This is a UI/UX prototype intended for Teams/phone form-factor. Integrate with your backends to replace mocked flows.
