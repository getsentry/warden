import { DataProfileSchema } from '@sentry/warden-service-api';
import type { DataProfile } from '@sentry/warden-service-api';
import { ServiceConfigSchema } from '../config/schema.js';
import type { ServiceConfig } from '../config/schema.js';

export interface ServiceOptionOverrides {
  url?: string;
  token?: string;
  data?: DataProfile;
  memory?: boolean;
  timeoutMs?: number;
  disabled?: boolean;
}

export interface ResolveServiceOptionsInput {
  explicit?: ServiceOptionOverrides;
  environment?: Record<string, string | undefined>;
  config?: Partial<ServiceConfig>;
  onWarning?: (message: string) => void;
}

export interface ResolvedServiceOptions {
  url: string;
  token: string;
  data: DataProfile;
  memory: boolean;
  timeoutMs: number;
}

function environmentBoolean(value: string | undefined): boolean | undefined {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}

/** Resolve explicit, environment, and layered-config service options without implicit discovery. */
export function resolveServiceOptions(input: ResolveServiceOptionsInput): ResolvedServiceOptions | undefined {
  if (input.explicit?.disabled) return undefined;
  const environment = input.environment ?? process.env;
  const environmentUrl = environment['WARDEN_SERVICE_URL']?.trim() || undefined;
  const url = input.explicit?.url
    ?? environmentUrl
    ?? (input.explicit?.token?.trim() ? input.config?.url : undefined);
  if (!url) return undefined;
  const token = input.explicit?.token ?? environment['WARDEN_SERVICE_TOKEN'];
  if (!token?.trim()) {
    input.onWarning?.('Warden service disabled because no service token is configured.');
    return undefined;
  }
  const timeoutEnvironment = environment['WARDEN_SERVICE_TIMEOUT_MS'];
  const timeoutMs = input.explicit?.timeoutMs
    ?? (timeoutEnvironment ? Number(timeoutEnvironment) : undefined)
    ?? input.config?.timeoutMs;
  const memory = input.explicit?.memory
    ?? environmentBoolean(environment['WARDEN_SERVICE_MEMORY'])
    ?? input.config?.memory;
  const candidate = ServiceConfigSchema.safeParse({
    url,
    data: input.explicit?.data ?? environment['WARDEN_SERVICE_DATA'] ?? input.config?.data,
    ...(memory === undefined ? {} : { memory }),
    timeoutMs,
  });
  if (!candidate.success) {
    input.onWarning?.('Warden service disabled because its configuration is not valid.');
    return undefined;
  }
  return {
    ...candidate.data,
    url,
    token: token.trim(),
    memory: candidate.data.memory ?? candidate.data.data !== 'metrics',
  };
}

export const ServiceDataProfileSchema = DataProfileSchema;
