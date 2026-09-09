# ddpgame

An Angular/Ionic language-learning application designed to support multiple Indigenous language modules, offline access, configurable theming, and controlled access to restricted language content.

## Technology

- Angular 18
- Ionic 8
- p5.js 1.9.6
- Supabase
- IndexedDB for offline language-module storage

## Project architecture

The application uses a language-module architecture so that the learner app remains largely language-agnostic.

Each language module can provide its own:

- manifest and metadata
- vocabulary data
- image assets
- audio assets
- theme configuration
- language-specific About and acknowledgement content

Shared application logic is reused across languages rather than duplicating separate game implementations for each language.

The current learner app supports:

- Kuku Thaypan
- Bininj Kunwok

## Language modules

Each language module is defined through a manifest and associated content.

A language module typically includes:

- `manifest.json`
- `words.json`
- images
- audio
- optional theme metadata
- optional About and acknowledgement metadata

The learner app loads the currently selected language through the shared language-module service.

This allows new language modules to be introduced without rewriting the core Angular game components.

## Games

The learner app currently includes:

- Flip Card
- Quiz
- Drag & Drop

The game components are shared across language modules.

Game content is resolved from the currently selected language rather than being hard-coded into each game.

This allows the same game implementation to work with different languages and datasets.

The Drag & Drop game currently supports word/image matching. A future extension is planned for a single-image, multi-zone mode where multiple labels can be matched to specific regions within one image.

## Language theming

Each language can define its own theme through manifest metadata.

Theme configuration can control values such as:

- page background
- primary text colour
- button colours
- accent colours
- surface colours
- decorative assets

Where language-specific artwork is available, the app can apply that language's own visual identity.

If a language does not provide a complete custom theme, the application uses a neutral generic fallback theme rather than reusing artwork from another language.

This allows new languages to be added safely before language-specific visual assets are available.

## About and acknowledgements

About content is language-specific and is supplied through the language manifest.

The About page can display:

- About text
- acknowledgements
- supporter organisations
- artist information
- external reference links

If no About content is available for the selected language, the learner app displays a neutral fallback message rather than showing content from another language.

This structure allows each language community to provide its own About and acknowledgement information independently.

## Offline language modules

The learner app is designed to support offline use.

When a language module is downloaded, the app stores the module locally in IndexedDB, including:

- manifest data
- vocabulary data
- image assets
- audio assets

Once installed, the language module can continue to be used without an active network connection.

Removing a downloaded language module removes its locally stored module data.

Further testing is planned to confirm IndexedDB persistence behaviour within the packaged Ionic mobile application's WebView across app restarts and device reboots.

## Public and restricted language access

Language modules can be configured as either:

- **Public** — available for direct download
- **Restricted** — requires a valid access code before download

Restricted access supports configurable access codes with settings such as:

- expiry
- usage limits
- activation status

Downloaded restricted modules remain available offline after successful installation.

## Backend

The current backend uses Supabase for:

- language-module metadata
- public and restricted language-module storage
- access-code management
- administrator authentication
- module publishing and access-type configuration

The learner app communicates with Supabase through its API rather than connecting directly to the underlying database.

Because Supabase is open source, the current architecture can support either:

- a hosted Supabase project
- a self-hosted Supabase instance

This allows the existing application architecture to be retained while supporting future self-hosting and data-governance requirements.

## Runtime server configuration

The learner app reads its Supabase server address from:

`src/assets/config/app-config.json`

before Angular starts.

The `serverUrl` value can be updated for each deployment:

```json
{
  "serverUrl": "https://your-supabase-server.example.com"
}
```

The deployed `assets/config/app-config.json` can also be edited directly to point the learner app to another Supabase instance without rebuilding the Angular application.

The server address is therefore no longer compiled into Angular environment files.

This supports switching between:

- development/test Supabase instances
- the current hosted Supabase environment
- a future self-hosted Supabase deployment

## Admin Panel

The Admin Panel is a separate web application used to manage backend functionality.

Current functionality includes:

- administrator authentication
- access-code generation and management
- language access-type configuration
- publishing language modules between public and restricted states

The Admin Panel is being developed toward a more scalable language-management structure.

Planned improvements include:

- separation between System Administrators and Language Administrators
- language-specific management permissions
- a language-list landing page
- separate language management pages
- user-management functionality
- access-code editing and deletion
- future asset and game management

Some of these functions are considered stretch goals and may be continued in a future project iteration.

## Adding a new language

The learner app is designed so that new languages can be added with minimal changes to the core application.

A new language typically requires:

1. a language manifest
2. vocabulary data
3. relevant images and audio
4. optional theme metadata
5. optional About and acknowledgement content

The shared game implementations can then use the new language module without requiring separate game components.

If no language-specific theme is available, the neutral fallback theme is used until appropriate assets are provided.

## Testing and QA

Testing is performed throughout development at both automated and manual levels.

Current QA activities include:

- focused component and feature tests
- production build verification
- regression testing
- online/offline behaviour checks
- language-switching tests
- public/restricted access tests
- access-code workflow tests
- responsive layout checks
- manual end-to-end QA for feature pull requests

Detailed QA and testing results for each PR have been documented as comments on the corresponding Linear tasks.

Where issues are identified during QA, fixes are retested before merge.

## Current limitations and future work

Current or planned follow-up work includes:

- confirming IndexedDB persistence within the packaged Ionic mobile application
- refining the Admin Panel role and permission model
- adding language-specific About content for additional languages
- implementing the Drag & Drop single-image multi-zone mode
- continuing mobile-specific usability testing
- validating deployment against a self-hosted Supabase instance
- documenting future language-management and content-authoring workflows

## Development workflow

Feature work is developed on separate branches and reviewed through pull requests before being merged into `main`.

Testing and QA evidence is recorded against the corresponding Linear task to maintain traceability between:

- requirements
- implementation
- QA
- fixes
- final merge
