# Script Structure

These files are loaded as classic browser scripts by `core/html-loader.js`.

Load order matters because the HTML still uses inline event handlers such as
`onclick="doLogin()"`, so shared functions must remain globally available.

- `core/`: shared helpers, static config, auth, and navigation.
- `core/html-loader.js`: loads HTML partials first, then app scripts in order.
- `features/`: main app feature areas.
- `modules/`: extension-style modules layered on top of the base app.
- `bootstrap.js`: startup wiring that runs after the feature files load.
