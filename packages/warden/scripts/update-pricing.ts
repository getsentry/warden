/**
 * Fetches Anthropic model pricing from pydantic/genai-prices and writes
 * src/sdk/model-pricing.json. Rerun whenever prices change.
 *
 * Usage: pnpm update-pricing
 */

import { pathToFileURL } from 'node:url';

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

interface PriceAlternative {
  constraint?: {
    start_date?: string;
  };
  prices: PriceEntry;
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
  prices: PriceEntry | PriceAlternative[];
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
  cacheWrite1hPerMTok: number;
  webSearchPer1K: number;
}

const PRICE_FALLBACKS: Record<string, string> = {
  // Some upstream records can appear before the price fields are populated.
  // Fill those known same-price variants from the closest canonical model.
  'claude-opus-4-6': 'claude-opus-4-5',
  'claude-sonnet-4-6': 'claude-sonnet-4-5',
};

function hasPrice(record: ModelPricingRecord | undefined): record is ModelPricingRecord {
  return record !== undefined && (
    record.inputPerMTok > 0 ||
    record.outputPerMTok > 0 ||
    record.cacheReadPerMTok > 0 ||
    record.cacheWritePerMTok > 0 ||
    record.cacheWrite1hPerMTok > 0
  );
}

function hasTokenPrice(p: PriceEntry): boolean {
  return (
    basePrice(p.input_mtok) > 0 ||
    basePrice(p.output_mtok) > 0 ||
    basePrice(p.cache_read_mtok) > 0 ||
    basePrice(p.cache_write_mtok) > 0
  );
}

function fillPricingFallbacks(pricing: Record<string, ModelPricingRecord>): void {
  for (const [target, source] of Object.entries(PRICE_FALLBACKS)) {
    const sourcePricing = pricing[source];
    if (hasPrice(pricing[target]) || !hasPrice(sourcePricing)) {
      continue;
    }
    pricing[target] = { ...sourcePricing };
  }
}

function startDateMs(alternative: PriceAlternative): number {
  const startDate = alternative.constraint?.start_date;
  if (!startDate) return Number.NEGATIVE_INFINITY;
  const parsed = Date.parse(`${startDate}T00:00:00Z`);
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
}

function selectPriceEntry(
  prices: PriceEntry | PriceAlternative[],
  asOf = new Date(),
): PriceEntry | null {
  if (!Array.isArray(prices)) {
    return prices;
  }

  const asOfMs = asOf.getTime();
  const applicable = prices
    .filter((alternative) => alternative.prices && startDateMs(alternative) <= asOfMs)
    .sort((a, b) => startDateMs(b) - startDateMs(a));

  return applicable[0]?.prices ?? null;
}

export function buildAnthropicPricing(
  providers: ProviderEntry[],
  asOf = new Date(),
): Record<string, ModelPricingRecord> {
  const anthropic = providers.find((p) => p.id === 'anthropic');
  if (!anthropic) {
    throw new Error('Anthropic provider not found in pricing data');
  }

  const pricing: Record<string, ModelPricingRecord> = {};

  if (!anthropic.models || !Array.isArray(anthropic.models)) {
    throw new Error('Anthropic provider has invalid or missing models array');
  }

  for (const model of anthropic.models) {
    const p = selectPriceEntry(model.prices, asOf);
    if (!p || typeof p !== 'object') {
      continue;
    }
    if (!hasTokenPrice(p)) {
      continue;
    }
    pricing[model.id] = {
      inputPerMTok: basePrice(p.input_mtok),
      outputPerMTok: basePrice(p.output_mtok),
      cacheReadPerMTok: basePrice(p.cache_read_mtok),
      cacheWritePerMTok: basePrice(p.cache_write_mtok),
      cacheWrite1hPerMTok: basePrice(p.input_mtok) * 2,
      webSearchPer1K: 10,
    };
  }

  fillPricingFallbacks(pricing);

  return pricing;
}

async function main() {
  const res = await fetch(SOURCE_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch pricing data: ${res.status} ${res.statusText}`);
  }

  const providers: ProviderEntry[] = await res.json();
  const pricing = buildAnthropicPricing(providers);

  const { writeFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  writeFileSync(fileURLToPath(OUTPUT_PATH), JSON.stringify(pricing, null, 2) + '\n');

  const count = Object.keys(pricing).length;
  console.log(`Wrote ${count} model(s) to packages/warden/src/sdk/model-pricing.json`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
