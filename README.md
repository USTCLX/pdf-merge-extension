# Codex PDF Merger

This document is the persistent project memory for future AI/devs.

## Product Summary
Chrome extension for merging PDFs and images, page-level reorder, preview, and PDF export. All files are processed locally with no uploads.

## Key Features
- Import PDFs and images (`jpg`, `jpeg`, `png`)
- Page-level drag reorder and delete
- Continuous preview with lazy rendering
- Image pages support scale, drag position, and alignment controls
- Export merged PDF
- Bilingual UI (ZH/EN) with language menu
- Fully offline operation

## UI Overview
- Main UI is `app.html` opened as a full tab via extension action.
- Left panel: page list with thumbnails.
- Right panel: long preview list and image tools panel (shown when clicking an image page).
- Resizable splitter between panels.

## Core Files
- `manifest.json` uses i18n strings and sets icons.
- `app.html`, `app.css`, `app.js` implement UI and logic.
- `_locales/en/messages.json`, `_locales/zh/messages.json` provide extension name/description.
- `vendor/` contains `pdf-lib` and `pdfjs-dist` builds for offline use.
- `icons/` contains PNGs generated from `logo-7.svg`.

## Libraries
- `pdf.js` for rendering previews.
- `pdf-lib` for merging and export.

## Image Handling
- Each image becomes a single page in the combined output.
- Default image page size is A4 (595x842 pt).
- Image pages store `imageScale`, `imageOffsetX`, `imageOffsetY`.
- Image tools allow scale and align; drag in preview to reposition.

## Export Behavior
- PDF pages are copied via `pdf-lib`.
- Image pages are embedded into a new PDF page with the chosen scale/position.
- Fallback: render to canvas then embed as PNG if copy fails.
- Export filename format: `merged_YYYYMMDD_HHmmss.pdf` (local time).

## Privacy
- All files stay local. No network requests for document content.

## Running
- Load unpacked extension from the project root.
- Click the extension icon to open `app.html`.

## Notes for Future Work
- Consider persisting UI layout and image adjustments in `localStorage`.
- Consider adding page size presets (A4/Letter/Original) for image pages.
