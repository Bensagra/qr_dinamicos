---
name: QR Studio
description: A clear, compact personal workbench for dynamic QR codes.
colors:
  green: "#1c5143"
  green-dark: "#153d33"
  ink: "#202c29"
  muted: "#64716b"
  support-text: "#626f62"
  placeholder: "#68736b"
  surface: "#ffffff"
  canvas: "#f8faf8"
  line: "#e2e7e3"
  field-line: "#d8dfda"
  proof-sage: "#eaf0e7"
  danger: "#a22d2d"
typography:
  headline:
    fontFamily: "Manrope, Arial, sans-serif"
    fontSize: "30px"
    fontWeight: 750
    lineHeight: 1.3
    letterSpacing: "-1px"
  title:
    fontFamily: "Manrope, Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 750
    lineHeight: 1.4
    letterSpacing: "-0.3px"
  body:
    fontFamily: "Manrope, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 400
  field:
    fontFamily: "Manrope, Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 400
  label:
    fontFamily: "Manrope, Arial, sans-serif"
    fontSize: "11px"
    fontWeight: 750
  action:
    fontFamily: "Manrope, Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 750
rounded:
  compact: "5px"
  control: "8px"
  panel: "12px"
spacing:
  tight: "8px"
  control: "12px"
  group: "20px"
  section: "24px"
components:
  button-primary:
    backgroundColor: "{colors.green}"
    textColor: "{colors.surface}"
    typography: "{typography.action}"
    rounded: "{rounded.control}"
    padding: "12px 19px"
  button-primary-hover:
    backgroundColor: "{colors.green-dark}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.action}"
    rounded: "{rounded.control}"
    padding: "12px 19px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.field}"
    rounded: "{rounded.control}"
    padding: "12px 14px"
  navigation:
    rounded: "{rounded.control}"
    padding: "11px 12px"
  status-chip:
    rounded: "{rounded.compact}"
    padding: "6px 9px"
  panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.panel}"
  shape-option:
    rounded: "{rounded.control}"
---

# Design System: QR Studio

## Overview

**Creative North Star: "The Personal QR Workbench"**

The personal QR workbench puts a printable artifact beside precise, compact controls. Chalk-white surfaces, forest-green actions, and a pale sage proofing canvas make the interface calm and practical. Geometric QR samples supply its imagery; the controls carry the same restrained geometry.

The approved direction is a clear, compact Spanish-language panel with a live preview. Manrope, fine borders, and modest rounding hold the system together across the editor, library, venues, settings, and access screens. Venue organization, external-menu links, short URLs, and NFC extend this same workbench without introducing a new visual identity. This record describes the implemented source, including the mobile live-proof strip and corrected placeholder color.

**Key Characteristics:**
- Compact controls with clear labels and quiet supporting text.
- Forest actions on white surfaces and a pale sage QR canvas.
- Real QR geometry as the signature visual material.
- Continuous proof visibility while editing on desktop and mobile.

## Colors

A forest accent anchors chalk-white surfaces and subdued green-gray neutrals; the QR proof sits on pale sage.

### Primary

- **Forest green** (`green`): primary actions, active states, and keyboard focus.
- **Deep forest** (`green-dark`): primary-button hover.

### Neutral

- **Chalk white** (`surface`): controls, cards, navigation rail, and QR paper.
- **Cool off-white** (`canvas`): page background.
- **Forest ink** (`ink`): headings and primary text.
- **Green-gray** (`muted`): secondary explanations.
- **Readable moss** (`support-text`): small helper text, preview status, and footer text.
- **Placeholder gray-green** (`placeholder`): empty-field prompts; the final cascade uses the corrected color.
- **Fine divider** (`line`): structural separators and panel outlines.
- **Field outline** (`field-line`): input and color-control boundaries.
- **Proofing sage** (`proof-sage`): the printable QR stage.

Error red (`danger`) communicates invalid fields and destructive feedback; it is a semantic exception, not an additional brand accent. User-selected QR colors belong to the artifact and do not recolor the interface.

**The Forest Action Rule.** Use deep forest for primary actions, active navigation, and focus. Keep large working surfaces white or pale neutral green.

## Typography

**Display and Body Font:** Manrope, with Arial and sans-serif fallbacks. No separate display or monospace brand face is established.

The type is geometric and compact. Hierarchy comes from weight and spacing more than from a broad scale; sentence case and short Spanish labels keep controls direct.

### Hierarchy

- **Headline:** the token-layer headline role is the standard page heading; responsive page headings settle between (27px) and (28px).
- **Title:** section titles use the title role. Preview and compact headings use (12–13px) at the same strong weight.
- **Body:** the base body role supports the application; explanations commonly use (11–12px). Paragraphs use a line height of (1.7).
- **Field:** text inputs use the field role.
- **Label and action:** strong labels and action text use their separate token-layer roles. Supporting metadata is smaller (9–10px); it is not a heading treatment.

The brand wordmark and access-page heading are specific compositions, not a general-purpose display scale. Library visit counts use tabular numerals.

## Layout

The desktop shell has a fixed navigation rail (224px), a context bar (78px), and a centered content region with horizontal padding (40px). The editor pairs a flexible form with a narrower proof column, using a base gap (28px). At widths of at least (1500px), the content cap becomes (1260px), the proof column becomes (385px), and the editor gap becomes (36px).

Intermediate adaptations occur at (1190px) and (980px), reducing the rail, gutters, and proof width. At (800px), navigation becomes an off-canvas drawer and the content occupies the viewport. At (640px), the editor becomes one column with page gutters (18px), while a compact proof strip sticks at (8px) from the viewport top. The full preview remains downstream for download and status controls. Form controls have scroll clearance (120px) beneath the strip.

The spacing vocabulary is compact and contextual rather than a strict mathematical scale. Fine control gaps cluster around (8–12px); sections generally breathe with (20–30px). Preserve grouped controls and align labels, fields, and actions before introducing new spacing steps.

**The Proof Stays Visible Rule.** Keep a live QR visible while its controls are being edited: the desktop proof column sticks beside the form, and the mobile compact proof sticks above it.

Saved short-link records put the copyable URL and NFC controls directly after the page heading, before the editor. This white bordered output block uses two columns and collapses to one at (640px). For short-link records, QR customization is optional and the mobile proof strip is hidden; the full QR proof and download controls remain available. Venue rows place information beside wrapping actions, stack at (980px), and retain fine horizontal separators. Venue and use selectors share a two-column arrangement that stacks at (640px).

## Elevation & Depth

The ordinary application is flat: white panels, fine outlines, and pale tonal regions provide structure. Soft shadows distinguish the printable paper, the selected segmented option, dialogs, and transient feedback. The drawer and dialog use translucent green-tinted backdrops.

### Shadow Vocabulary

- **QR paper:** `0 8px 24px #324c3010` — a gentle separation from the sage stage.
- **Selected segment:** `0 2px 5px #1b352211` — a small lift inside a recessed control.
- **Toast:** `0 8px 28px #18382e24` — transient confirmation above the workspace.
- **Dialog:** `0 20px 80px #132e3530` — modal separation.

**The Quiet Surface Rule.** Separate ordinary containers with fine borders and tonal changes. Reserve soft elevation for the QR paper, selected segments, dialogs, and transient feedback.

## Shapes

Controls use the control radius; primary panels and the mobile proof use the panel radius. Small badges and segmented selections use the compact radius. White QR paper is more square (4px), while circular status dots, color swatches, and avatars serve distinct compact roles. Lines are generally one pixel. The dashed upload boundary denotes a file input.

QR module and finder samples are geometric, literal previews of square, rounded, and circular settings. Preserve this relationship between a setting and its sample; these forms are functional material for the workbench.

## Components

### Buttons

Compact, solid, and easy to distinguish. Primary buttons use forest with white text; secondary buttons use white with a fine border. Both use the action role, control radius, and a minimum height (43px). Smaller variants use (34px) minimum height. Hover darkens primary buttons and gives secondary buttons a pale fill; pressing shifts enabled buttons down (1px). Disabled buttons use reduced opacity (0.48). Keyboard focus is a forest outline (2px) with offset (4px).

### Chips

Status chips pair a small dot with explicit text. Active records use a pale green fill and dark green text; paused records use a pale warm fill and muted ochre text. A contextual dynamic-QR tag uses the same restrained visual vocabulary. These are statuses, not primary actions.

### Cards / Containers

White panels with the panel radius and a fine divider-colored border. Form sections are separated by horizontal lines. The preview panel contains a sage stage with registration corners, white QR paper, centered artifact name, status, and download controls. Container padding responds to width; it is not one universal token.

### Inputs / Fields

White fields with a fine field outline and control radius. Labels stay above the field. Focus changes the border to forest and adds the focus halo (`0 0 0 3px #1c514314`). Invalid inputs use error-red borders and accompanying text. Disabled fields have a pale gray-green fill. Use the final placeholder token, not earlier declarations overridden in the stylesheet.

### Navigation

The workspace rail uses compact icon-and-label rows, with pale green fill, forest text, and heavier weight for the selected row. Hover uses a pale surface fill. The drawer replaces the fixed rail at the documented breakpoint and is hidden from interaction when closed. Library filters use restrained filled tabs and text counts.

### QR Style Controls and Live Proof

Shape options show a small geometric module sample, a text label, and a selected check. The selected tile combines a stronger green border with pale fill; corner controls use a segmented treatment. Color controls pair a native swatch with its hexadecimal value. Logo upload uses a labeled native file control.

The proof regenerates from the current artifact settings. Desktop uses a sticky column (24px top offset); mobile adds a sticky compact strip with a QR (76px), name, live indicator, and saved-state text. The full QR renderer generates at (1024px), with quiet margin (112px), high error correction, and a bounded logo area. Preview and download states communicate whether the artifact is saved and current.

Motion is brief state feedback: fields transition in (150ms), buttons in (160ms), and the drawer and toast in (200ms). Reduced-motion preferences disable animation and transitions.

### Venue Forms, Rows, and Filters

Venue creation and renaming use an above-field label, a standard text field, and the existing primary and secondary actions. Each compact row pairs a clickable venue name with link counts and explicit menu status; adjacent actions open its links, add or edit its external menu, rename it, or delete an empty venue. Long names wrap. Library filters use labeled native selects for venue and use, alongside the existing active/paused tabs and search. Editor assignment fields use the same selects.

### Short-Link Output and NFC

The saved short-link output presents a read-only permanent URL, an explicitly labeled copy button, a redirect test link, and pause/reactivate controls. Its neighboring NFC section explains the shared URL in ordinary body text. An expanded-state button reveals optional QR customization for short-link records; general QR and menu records keep their customization visible.

NFC overwrite and permanent-lock choices use native forest-accented checkboxes with complete text labels. Permanent locking adds an error-red warning and an explicit confirmation; operation progress appears in a rounded sage status region with live status semantics. Busy controls disable conflicting actions and expose cancellation. Unsupported, local-only, unsaved, and paused conditions remain explicit text. The iPhone companion's connection screen uses a native iOS Form with the inherited forest tint.

## Do's and Don'ts

### Do:

- Do keep labels visible and make selection explicit with borders, fills, and checked or pressed states.
- Do preserve the live proof while editing and the quiet margin surrounding the QR itself.
- Do use the corrected supporting-text and placeholder colors from the token layer.
- Do retain visible keyboard focus and respect reduced-motion preferences.
- Do show saved, unsaved, paused, and local-only conditions in words as well as visual cues.

### Don't:

- Don't replace the live QR artifact with a decorative illustration.
- Don't use interface accent choices to override a user’s QR foreground, background, shape, or logo.
- Don't promote one-off layout values or retired lower-contrast text overrides into new reusable tokens.
