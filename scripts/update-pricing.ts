/**
 * Fetches Anthropic model pricing from pydantic/genai-prices and writes
 * src/sdk/model-pricing.json. Rerun whenever prices change.
 *
 * Usage: pnpm update-pricing
 */

const SOURCE_URL =
  'https://raw.githubusercontent.com/pydantic/genai-prices/main/prices/data.json';
const OUTPUT_PATH = new URL('../src/sdk/model-pricing.json', import.meta.url);

type PriceValue = number | { base: number; tiers: unknown[] };

interface PriceEntry {
  input_mtok?: PriceValue;
  output_mtok?: PriceValue;
  cache_read_mtok?: PriceValue;
  cache_write_mtok?: PriceValue;
}

/** Extract the base price from a flat number or tiered pricing object. */
function basePrice(v: PriceValue | undefined): number {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  return v.base;
}

interface ModelEntry {
  id: string;
  name: string;
  prices: PriceEntry;
}

interface ProviderEntry {
  id: string;
  models: ModelEntry[];
}

interface ModelPricingRecord {
  inputPerMTok: number;
  outputPerMTok: number;
  cacheReadPerMTok: number;
  cacheWritePerMTok: number;
}

async function main() {
  const res = await fetch(SOURCE_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch pricing data: ${res.status} ${res.statusText}`);
  }

  const providers: ProviderEntry[] = await res.json();
  const anthropic = providers.find((p) => p.id === 'anthropic');
  if (!anthropic) {
    throw new Error('Anthropic provider not found in pricing data');
  }

  const pricing: Record<string, ModelPricingRecord> = {};

  if (!anthropic.models || !Array.isArray(anthropic.models)) {
    throw new Error('Anthropic provider has invalid or missing models array');
  }

  for (const model of anthropic.models) {
    const p = model.prices;
    if (!p || typeof p !== 'object') {
      continue;
    }
    pricing[model.id] = {
      inputPerMTok: basePrice(p.input_mtok),
      outputPerMTok: basePrice(p.output_mtok),
      cacheReadPerMTok: basePrice(p.cache_read_mtok),
      cacheWritePerMTok: basePrice(p.cache_write_mtok),
    };
  }

  const { writeFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  writeFileSync(fileURLToPath(OUTPUT_PATH), JSON.stringify(pricing, null, 2) + '\n');

  const count = Object.keys(pricing).length;
  console.log(`Wrote ${count} model(s) to src/sdk/model-pricing.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
