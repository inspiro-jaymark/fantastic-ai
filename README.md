# Fantastic AI

Static browser app for the FANTASTIC TOOL AI Customer Experience Voice Platform.

## Project Structure

```text
.
|-- index.html
|-- src
|   |-- partials
|   |   |-- layout
|   |   |-- login.html
|   |   `-- views
|   |-- scripts
|   |   |-- bootstrap.js
|   |   |-- core
|   |   |-- features
|   |   `-- modules
|   `-- styles
|       |-- base
|       |-- components
|       |-- features
|       |-- layout
|       `-- main.css
`-- archive
    |-- app.single-file-before-split.js
    |-- index.before-html-partials.html
    `-- fantastic_tool_v3.2.original.html
```

## Run Locally

Use any static web server from the project root:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Launch From VS Code

Press `F5` and select `Launch Fantastic AI`. VS Code will run a local static server on `http://127.0.0.1:8080/index.html` before opening Chrome.

## Notes

- `index.html` is the app entry point and HTML partial loader shell.
- `src/partials/login.html` contains the sign-in screen.
- `src/partials/layout` contains the app shell, header, and floating panels.
- `src/partials/views` contains one app section per file for easier debugging.
- `src/styles/main.css` is the stylesheet entry point.
- `src/styles/base` contains tokens, reset rules, and global defaults.
- `src/styles/layout` contains app shell, content layout, and overlays.
- `src/styles/components` contains reusable controls and UI pieces.
- `src/styles/features` contains feature and screen-specific styles.
- `src/scripts/core` contains shared utilities, config, and access control.
- `src/scripts/features` contains the main app feature areas.
- `src/scripts/modules` contains extension-style modules.
- `src/scripts/core/html-loader.js` loads the HTML partials first, then loads the app scripts in order.
- `src/scripts/bootstrap.js` wires settings and startup behavior after feature scripts load.
- `archive/fantastic_tool_v3.2.original.html` keeps the original single-file export for reference only.
- `archive/app.single-file-before-split.js` keeps the pre-split JavaScript for reference only.
- `archive/index.before-html-partials.html` keeps the pre-partial HTML layout for reference only.
- `archive/main.before-css-partials.css` keeps the pre-partial stylesheet for reference only.
