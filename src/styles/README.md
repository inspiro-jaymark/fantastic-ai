# CSS Structure

`main.css` is the stylesheet entry point. It imports focused CSS files in cascade order, so keep new imports ordered from broad/global styles to page-specific styles.

- `base/`: design tokens, reset rules, and global defaults.
- `layout/`: app shell, content layout, and floating overlays.
- `components/`: reusable controls and utility UI elements.
- `features/`: screen or feature-specific styles.

When debugging a screen, start with the matching file in `features/`, then check shared styles in `components/` or `layout/`.
