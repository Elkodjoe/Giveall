import { orderAvailableProviders } from '../llmProvider';

describe('orderAvailableProviders', () => {
  it('puts the primary provider first when both are available', () => {
    expect(orderAvailableProviders('anthropic', { anthropic: true, openai: true })).toEqual([
      'anthropic',
      'openai',
    ]);
    expect(orderAvailableProviders('openai', { anthropic: true, openai: true })).toEqual([
      'openai',
      'anthropic',
    ]);
  });

  it('drops an unavailable provider', () => {
    expect(orderAvailableProviders('anthropic', { anthropic: false, openai: true })).toEqual(['openai']);
    expect(orderAvailableProviders('anthropic', { anthropic: true, openai: false })).toEqual(['anthropic']);
  });

  it('returns an empty list when neither is available', () => {
    expect(orderAvailableProviders('anthropic', { anthropic: false, openai: false })).toEqual([]);
  });
});
