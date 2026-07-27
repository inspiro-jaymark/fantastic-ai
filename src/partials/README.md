# HTML partials

The app layout is split so each screen can be debugged in a focused file.

- `login.html` contains the sign-in screen.
- `layout/app-shell.html` assembles the shared header, nav, and view placeholders.
- `layout/header.html` contains the top bar.
- `layout/floating-panels.html` contains notification, direct message, and KB bot overlays.
- `views/*.html` contains one app section per file, using the section id as the filename.

`index.html` loads these fragments through `src/scripts/core/html-loader.js`, then loads the existing JavaScript files in order. Run the app through the local server so browser `fetch()` can load the partials.
