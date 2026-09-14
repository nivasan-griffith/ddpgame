# Language cartridge specification

This specification describes the language-module contract implemented by `src/app/services/language-module.service.ts`. A cartridge is a versioned manifest, vocabulary data, and referenced media stored under one stable module prefix.

## Directory layout

```text
<module-id>/
  manifest.json
  words.json
  images/
    ...
  audio/
    ...
```

The module is published beneath `content_prefix` in the Supabase catalogue. Public modules are served from a public Storage bucket. Restricted modules remain in a private bucket and are downloaded through short-lived signed URLs returned by `private-module-download`.

The checked-in `languages/` directories are source/reference copies. Runtime discovery comes from the `get_language_module_catalog` RPC, not from `languages/index.json`.

## Identifiers and paths

- `id` is a stable, lowercase, URL-safe identifier such as `kuku-thaypan`.
- The catalogue row ID, manifest `id`, Storage prefix, access-code module ID, and IndexedDB key must identify the same module.
- `manifest.json` must be at `<content_prefix>/manifest.json`.
- `data` and every media path are relative to the module prefix. Use forward slashes and do not include a leading slash, `..`, a bucket name, or a full URL.
- File names are case-sensitive in Storage. Keep the JSON path and stored object name identical.

## `manifest.json`

Required fields follow the `LanguageManifest` interface:

```json
{
  "id": "example-language",
  "name": "Example Language",
  "location": "Optional display location",
  "version": "1.0.0",
  "data": "words.json",
  "games": ["flipcard", "quiz", "drag-drop"],
  "accessType": "public",
  "theme": {
    "tokens": {
      "primaryBackground": "#f7edd9",
      "buttonBackground": "#5b6e5b",
      "buttonText": "#ffffff",
      "primaryText": "#1d281d",
      "linkHover": "#8a4b2d",
      "accent": "#8a4b2d",
      "surface": "#fff8ed"
    }
  }
}
```

| Field | Required | Contract |
| --- | --- | --- |
| `id` | yes | Stable module identifier. |
| `name` | yes | Learner-facing name. |
| `location` | no | Learner-facing geographic label. |
| `version` | yes | String compared with the installed version to offer an update. Increment whenever published content changes. |
| `data` | yes | Relative path to the vocabulary JSON, currently `words.json`. |
| `games` | yes | Game identifiers enabled by this module. Current implementations use `flipcard`, `quiz`, and `drag-drop`. |
| `accessType` | no | `public` or `restricted` for the stored/offline description. Network access is authoritatively controlled by the Supabase catalogue value (`public` or `private`). |
| `theme` | no | Theme tokens and optional decorative asset paths. Missing custom artwork is supported through generic application assets. |
| `about` | no | Language-specific About text, links, acknowledgements, supporters, and artists. |

If `theme` is supplied, all seven color tokens are required by the current TypeScript interface. Optional `theme.assets` contains `hero`, `topLeftTrim`, `bottomRightTrim`, `navigationIcon`, `bulletIcon`, `successIcon`, and `retryIcon` paths.

The optional `about` object supports:

- `paragraphs`: an array of text paragraphs;
- `links`: `{ paragraph, text, url }` entries;
- `acknowledgementIntro`;
- `acknowledgements`: strings or `{ role, text }` entries;
- `supporters`: `{ name, logo }` entries; and
- `artists`: `{ name, role, image, description? }` entries.

## `words.json`

`words.json` is a JSON array following the `LanguageWord` interface:

```json
[
  {
    "id": "example-word",
    "word": "Language word",
    "english": "English meaning",
    "category": "Optional category",
    "entrySource": "original",
    "availableInCurrentVersion": true,
    "playable": true,
    "image": "images/example-word.png",
    "audio": {
      "language": "audio/example-word.mp3",
      "english": null
    }
  }
]
```

| Field | Required | Contract |
| --- | --- | --- |
| `id` | yes | Unique within the module. |
| `word` | yes | Language text shown in games. |
| `english` | yes | English gloss shown in games. |
| `category` | no | Grouping/display metadata. |
| `entrySource` | no | `original` or `dictionary`. |
| `availableInCurrentVersion` | no | Content availability metadata retained for Kuku Thaypan. |
| `playable` | yes for game content | Only entries exactly equal to `true` enter `playableWords`. |
| `image` | yes | Relative path or `null`. Flip Card and Quiz need enough image-backed playable entries for their current flows. |
| `audio.language` | yes | Relative path or `null`. |
| `audio.english` | yes | Relative path or `null`. |

Missing optional media does not abort installation: the downloader keeps the module usable and exposes that asset as unavailable. Missing required JSON, a malformed manifest, or a catalogue row without a bucket/prefix does prevent loading.

## Access and offline behavior

- The catalogue `access_type` is `public` or `private`; the learner UI presents private content as restricted.
- A restricted code is redeemed by module ID. The browser stores an opaque module-scoped grant token, never a service-role key.
- Private file requests must remain under the module prefix. The Edge Function rejects traversal, backslashes, and paths over 500 characters.
- Installation stores the manifest, all words, successfully downloaded referenced media, and installation time in IndexedDB database `ddpgame-language-modules`, object store `modules`.
- The selected module ID is stored under local-storage key `selected-language-id`.
- A downloaded module remains usable offline. Removing it deletes the IndexedDB record and clears the selection if that module was active.

## Cartridge acceptance checklist

Before publishing a new version:

1. Obtain community/client approval for the language, spellings, translations, artwork, recordings, acknowledgements, and access classification.
2. Confirm IDs are unique and paths obey the rules above.
3. Confirm every referenced file exists with matching case.
4. Confirm enough `playable: true` entries satisfy each enabled game's data needs.
5. Increment `version` and keep the manifest/catalogue IDs aligned.
6. Run `node --test scripts/language-data.test.mjs`, extending its fixtures/assertions for the new module.
7. Test install, update, removal, application restart, and offline gameplay in a clean browser profile.
8. For restricted modules, test valid, invalid, expired, inactive, and exhausted codes and verify the bucket is not publicly readable.
9. Publish only through an approved test-to-production process. Do not delete the checked-in/source copy until rollback and retention requirements are agreed.
