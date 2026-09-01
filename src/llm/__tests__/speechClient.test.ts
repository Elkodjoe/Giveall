import { isSpeechConfigured, speechUrlFor } from '../speechClient';

const URL_ENV = 'EXPO_PUBLIC_APPRECIATION_PROXY_URL';
const TOKEN_ENV = 'EXPO_PUBLIC_APPRECIATION_PROXY_TOKEN';

afterEach(() => {
  delete process.env[URL_ENV];
  delete process.env[TOKEN_ENV];
});

describe('isSpeechConfigured', () => {
  it('tracks the proxy URL env var', () => {
    delete process.env[URL_ENV];
    expect(isSpeechConfigured()).toBe(false);
    process.env[URL_ENV] = 'https://p.example.workers.dev';
    expect(isSpeechConfigured()).toBe(true);
  });
});

describe('speechUrlFor', () => {
  it('returns null when unconfigured or the text is blank', () => {
    expect(speechUrlFor('hi')).toBeNull();
    process.env[URL_ENV] = 'https://p.example.workers.dev';
    expect(speechUrlFor('   ')).toBeNull();
  });

  it('builds a /speak URL with the text query-encoded', () => {
    process.env[URL_ENV] = 'https://p.example.workers.dev/';
    const url = speechUrlFor('You noticed I was tired & brought tea.');
    expect(url).not.toBeNull();
    const parsed = new URL(url as string);
    expect(parsed.origin + parsed.pathname).toBe('https://p.example.workers.dev/speak');
    expect(parsed.searchParams.get('text')).toBe('You noticed I was tired & brought tea.');
    expect(parsed.searchParams.get('t')).toBeNull();
  });

  it('adds the token param only when configured', () => {
    process.env[URL_ENV] = 'https://p.example.workers.dev';
    process.env[TOKEN_ENV] = 'sekret';
    const parsed = new URL(speechUrlFor('hi') as string);
    expect(parsed.searchParams.get('t')).toBe('sekret');
  });

  it('caps very long text at 500 chars', () => {
    process.env[URL_ENV] = 'https://p.example.workers.dev';
    const parsed = new URL(speechUrlFor('a'.repeat(900)) as string);
    expect((parsed.searchParams.get('text') as string).length).toBe(500);
  });
});
