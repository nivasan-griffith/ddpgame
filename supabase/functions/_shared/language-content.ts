export interface LanguageWordInput {
  id: string;
  word: string;
  english: string;
  category?: string;
  entrySource?: 'original' | 'dictionary';
  availableInCurrentVersion?: boolean;
  playable?: boolean;
  image: string | null;
  audio: {
    language: string | null;
    english: string | null;
  };
  [key: string]: unknown;
}

export interface LanguageManifestContent {
  id: string;
  name: string;
  version: string;
  data: string;
  games: string[];
  accessType?: string;
  [key: string]: unknown;
}

const safeIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function safeIdentifier(value: unknown, field = 'ID'): string {
  if (typeof value !== 'string') throw new Error(`${field} is required.`);
  const id = value.trim().toLowerCase();
  if (id.length < 2 || id.length > 64 || !safeIdPattern.test(id)) {
    throw new Error(`${field} must use 2–64 lowercase letters, numbers, or single hyphens.`);
  }
  return id;
}

export function requiredText(value: unknown, field: string, maximum = 160): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${field} is required.`);
  }
  const text = value.trim();
  if (text.length > maximum) throw new Error(`${field} cannot exceed ${maximum} characters.`);
  return text;
}

export function optionalText(value: unknown, field: string, maximum = 160): string | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  return requiredText(value, field, maximum);
}

export function safeRelativePath(value: unknown, field: string): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') throw new Error(`${field} must be a relative file path.`);
  const path = value.trim();
  if (
    path.length > 500 || path.startsWith('/') || path.startsWith('\\') ||
    path.includes('..') || path.includes('\\') || path.includes('://') ||
    /[?#]/.test(path)
  ) {
    throw new Error(`${field} must be a safe path within the language module.`);
  }
  return path || null;
}

export function validateWord(value: unknown): LanguageWordInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('A word entry is required.');
  }
  const input = value as Record<string, unknown>;
  const audio = input.audio && typeof input.audio === 'object' && !Array.isArray(input.audio)
    ? input.audio as Record<string, unknown>
    : {};
  const entrySource = input.entrySource === undefined || input.entrySource === ''
    ? undefined
    : input.entrySource;
  if (entrySource !== undefined && entrySource !== 'original' && entrySource !== 'dictionary') {
    throw new Error('Entry source must be original or dictionary.');
  }
  for (const field of ['availableInCurrentVersion', 'playable'] as const) {
    if (input[field] !== undefined && typeof input[field] !== 'boolean') {
      throw new Error(`${field} must be true or false.`);
    }
  }
  const category = optionalText(input.category, 'Category');

  const validated: LanguageWordInput = {
    ...input,
    id: safeIdentifier(input.id, 'Word ID'),
    word: requiredText(input.word, 'Language word', 500),
    english: requiredText(input.english, 'English translation', 1000),
    ...(category ? { category } : {}),
    ...(entrySource ? { entrySource } : {}),
    ...(typeof input.availableInCurrentVersion === 'boolean' ? { availableInCurrentVersion: input.availableInCurrentVersion } : {}),
    ...(typeof input.playable === 'boolean' ? { playable: input.playable } : {}),
    image: safeRelativePath(input.image, 'Image'),
    audio: {
      ...audio,
      language: safeRelativePath(audio.language, 'Language audio'),
      english: safeRelativePath(audio.english, 'English audio'),
    },
  };
  if (!category) delete validated.category;
  if (!entrySource) delete validated.entrySource;
  return validated;
}

export function parseWordsJson(text: string): LanguageWordInput[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('The module words file is not valid JSON.');
  }
  if (!Array.isArray(parsed)) throw new Error('The module words file must contain an array.');
  const words = parsed.map(validateWord);
  const ids = new Set<string>();
  for (const word of words) {
    if (ids.has(word.id)) throw new Error(`The module contains duplicate word ID “${word.id}”.`);
    ids.add(word.id);
  }
  return words;
}

export function parseManifestJson(text: string): LanguageManifestContent {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('The module manifest is not valid JSON.');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('The module manifest must contain an object.');
  }
  const manifest = parsed as Record<string, unknown>;
  const data = safeRelativePath(manifest.data, 'Manifest data file');
  if (!data) throw new Error('Manifest data file is required.');
  return {
    ...manifest,
    id: safeIdentifier(manifest.id, 'Language ID'),
    name: requiredText(manifest.name, 'Language name', 120),
    version: requiredText(manifest.version, 'Manifest version', 40),
    data,
    games: Array.isArray(manifest.games) && manifest.games.every(game => typeof game === 'string')
      ? manifest.games
      : [],
  } as LanguageManifestContent;
}

export function nextPatchVersion(version: string): string {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/.exec(version);
  if (!match) throw new Error('Manifest version must use semantic versioning, for example 1.0.0.');
  return `${match[1]}.${match[2]}.${Number(match[3]) + 1}`;
}

export function defaultManifest(id: string, name: string): LanguageManifestContent {
  return {
    id,
    name,
    version: '1.0.0',
    accessType: 'restricted',
    theme: {
      tokens: {
        primaryBackground: '#eef4ef',
        buttonBackground: '#2f5d50',
        buttonText: '#ffffff',
        primaryText: '#15312d',
        linkHover: '#9a4e32',
        accent: '#9a4e32',
        surface: '#ffffff',
      },
    },
    data: 'words.json',
    games: ['flipcard', 'quiz', 'drag-drop'],
  };
}
