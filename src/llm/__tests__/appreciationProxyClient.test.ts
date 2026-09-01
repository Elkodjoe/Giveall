import {
  generateAppreciationViaProxy,
  isAppreciationProxyConfigured,
} from '../appreciationProxyClient';

const URL_ENV = 'EXPO_PUBLIC_APPRECIATION_PROXY_URL';
const TOKEN_ENV = 'EXPO_PUBLIC_APPRECIATION_PROXY_TOKEN';
const INPUT = { genericCompliment: 'You are wonderful.', loveLanguage: 'words' as const };

const realFetch = global.fetch;

function mockFetch(impl: (url: string, init: RequestInit) => Partial<Response>) {
  global.fetch = jest.fn((url: string, init: RequestInit) => {
    const r = impl(url, init);
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(''),
      ...r,
    } as Response);
  }) as unknown as typeof fetch;
}

afterEach(() => {
  global.fetch = realFetch;
  delete process.env[URL_ENV];
  delete process.env[TOKEN_ENV];
  jest.restoreAllMocks();
});

describe('isAppreciationProxyConfigured', () => {
  it('reflects whether the proxy URL env var is set', () => {
    delete process.env[URL_ENV];
    expect(isAppreciationProxyConfigured()).toBe(false);
    process.env[URL_ENV] = 'https://proxy.example.workers.dev';
    expect(isAppreciationProxyConfigured()).toBe(true);
  });
});

describe('generateAppreciationViaProxy', () => {
  it('throws (does not call fetch) when no proxy URL is configured', async () => {
    const spy = jest.fn();
    global.fetch = spy as unknown as typeof fetch;
    await expect(generateAppreciationViaProxy(INPUT)).rejects.toThrow('not configured');
    expect(spy).not.toHaveBeenCalled();
  });

  it('POSTs the input to the configured URL and returns the parsed result', async () => {
    process.env[URL_ENV] = 'https://proxy.example.workers.dev';
    let seen: { url: string; init: RequestInit } | null = null;
    mockFetch((url, init) => {
      seen = { url, init };
      return { json: () => Promise.resolve({ text: 'the line', provider: 'anthropic' }) };
    });

    const result = await generateAppreciationViaProxy(INPUT);
    expect(result).toEqual({ text: 'the line', provider: 'anthropic' });
    expect(seen!.url).toBe('https://proxy.example.workers.dev');
    expect(seen!.init.method).toBe('POST');
    expect(JSON.parse(seen!.init.body as string)).toEqual(INPUT);
    expect((seen!.init.headers as Record<string, string>)['x-app-token']).toBeUndefined();
  });

  it('sends x-app-token only when the token env var is set', async () => {
    process.env[URL_ENV] = 'https://proxy.example.workers.dev';
    process.env[TOKEN_ENV] = 'sekret';
    let headers: Record<string, string> = {};
    mockFetch((_url, init) => {
      headers = init.headers as Record<string, string>;
      return { json: () => Promise.resolve({ text: 'x', provider: 'openai' }) };
    });
    await generateAppreciationViaProxy(INPUT);
    expect(headers['x-app-token']).toBe('sekret');
  });

  it('throws on a non-ok response, including the status', async () => {
    process.env[URL_ENV] = 'https://proxy.example.workers.dev';
    mockFetch(() => ({ ok: false, status: 502, text: () => Promise.resolve('all providers failed') }));
    await expect(generateAppreciationViaProxy(INPUT)).rejects.toThrow('502');
  });

  it('throws when the response has no text field', async () => {
    process.env[URL_ENV] = 'https://proxy.example.workers.dev';
    mockFetch(() => ({ json: () => Promise.resolve({ provider: 'anthropic' }) }));
    await expect(generateAppreciationViaProxy(INPUT)).rejects.toThrow('no text');
  });

  it('defaults provider to anthropic when the response omits it', async () => {
    process.env[URL_ENV] = 'https://proxy.example.workers.dev';
    mockFetch(() => ({ json: () => Promise.resolve({ text: 'y' }) }));
    await expect(generateAppreciationViaProxy(INPUT)).resolves.toEqual({ text: 'y', provider: 'anthropic' });
  });
});
