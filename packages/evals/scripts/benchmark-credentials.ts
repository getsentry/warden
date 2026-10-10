/** Select the first usable OpenRouter key without exposing it in diagnostics. */
export function selectOpenRouterKey(environment: Record<string, string | undefined>, file: Record<string, string>): string {
  const key = [environment['WARDEN_OPENROUTER_API_KEY'], environment['OPENROUTER_API_KEY'],
    file['WARDEN_OPENROUTER_API_KEY'], file['OPENROUTER_API_KEY']].map((value) => value?.trim()).find(Boolean);
  if (!key) throw new Error('OpenRouter API key is required');
  return key;
}
