import { randomUUID } from 'node:crypto';
import { createWardenServiceClient } from '@sentry/warden-service-api';
import type { MemoryRecallResponse, RepositoryIdentity } from '@sentry/warden-service-api';
import type { ReviewMemory, ReviewMemoryAccess } from '../sdk/memory.js';
import { validateMemoryPaths } from '../sdk/memory-paths.js';
import { getHeadSha } from '../cli/git.js';
import type { ResolvedServiceOptions } from './options.js';

/** Bind correction tools to the authorized repository and the run's admitted memories. */
export function createServiceReviewMemory(
  service: ResolvedServiceOptions | undefined,
  repositoryInput: RepositoryIdentity,
  repoPath: string,
  recalled: MemoryRecallResponse['memories'] = [],
  parentRecallId?: string,
): ReviewMemoryAccess | undefined {
  if (!service?.memory) return undefined;
  const repository: RepositoryIdentity = {
    provider: repositoryInput.provider, owner: repositoryInput.owner,
    name: repositoryInput.name, fullName: repositoryInput.fullName,
  };
  const client = createWardenServiceClient({ baseUrl: service.url, token: service.token, timeoutMs: service.timeoutMs });
  const records = new Map<string, ReviewMemory>(recalled.map((memory) => [memory.id, {
    ...memory, paths: [],
  }]));
  let recall: MemoryRecallResponse | undefined = parentRecallId ? { protocolVersion: 1, clientRecallId: parentRecallId, memories: recalled } : undefined;
  let firstSearch: Promise<MemoryRecallResponse> | undefined;
  let headSha: string | undefined;
  try { headSha = getHeadSha(repoPath); } catch { /* A non-Git review has no commit identifier. */ }
  return {
    get recall() { return recall; },
    async recordJudgment({ skill, judgment, supersedes }) {
      const paths = [...new Set([judgment.candidate.location?.path,
        ...(judgment.candidate.additionalLocations ?? []).map((location) => location.path)].filter((path): path is string => Boolean(path)))].slice(0, 10);
      if (!paths.length) return;
      // Bound the searchable summary, while the structured judgment retains every location and full text.
      while (paths.length > 1 && paths.join(', ').length > 2_000) paths.pop();
      const sourceSuffix = `\n\nSources: ${paths.join(', ')}`;
      const summary = [`Historical verifier judgment: ${judgment.verdict}.`, judgment.candidate.title,
        judgment.reason?.slice(0, 1_000), (judgment.revised ?? judgment.candidate).description.slice(0, 1_000)].filter(Boolean).join('\n').slice(0, 4_000 - sourceSuffix.length);
      const linkedNotes = supersedes?.filter(({ id, version }) => {
        const note = records.get(id);
        return note?.version === version && !note.judgment && !note.verdict;
      });
      const response = await client.updateMemory({ repository, skill, paths, content: summary,
        reason: 'Preserve the verifier judgment and its original evidence.',
        supersedes: linkedNotes, judgment: { ...judgment, headSha } });
      if (response.status !== 'saved') throw new Error('Memory judgment was not saved');
      records.set(response.memory.id, { ...response.memory, paths, verdict: judgment.verdict });
      for (const reference of linkedNotes ?? []) records.delete(reference.id);
    },
    async search(input) {
      const request = { protocolVersion: 1 as const, clientRecallId: randomUUID(), repository,
        query: input.query, skills: [input.skill], languages: [], paths: [...input.paths] };
      // The first requested search creates the accounting group; setup never fetches memory.
      if (firstSearch) await firstSearch;
      let response: MemoryRecallResponse;
      if (recall) {
        response = await client.recallMemory({ ...request, parentRecallId: recall.clientRecallId });
      } else {
        firstSearch = client.recallMemory(request);
        try { response = await firstSearch; recall = response; }
        finally { firstSearch = undefined; }
      }
      const found = await Promise.all(response.memories.map(async (summary): Promise<ReviewMemory | undefined> => {
        const detail = await client.getMemory(summary.id);
        const record = detail.memory;
        // A concurrently revised or retired note must be searched again before it is served.
        if (record.id !== summary.id || record.version !== summary.version || record.lifecycle !== 'active'
          || record.repository.provider !== repository.provider || record.repository.fullName !== repository.fullName) return undefined;
        return { ...summary, content: record.content, observedAt: record.observedAt, paths: [],
          judgment: record.judgment, evidence: detail.evidence.slice(0, 10),
          verdict: record.judgment?.verdict, headSha: record.judgment?.headSha };
      }));
      const admitted = found.filter((record): record is ReviewMemory => record !== undefined);
      for (const record of admitted) records.set(record.id, record);
      return admitted;
    },
    async update(input) {
      // Corrections can target only a record admitted to this run or saved by it.
      if (input.id && !records.has(input.id)) return { status: 'conflict' };
      validateMemoryPaths(repoPath, input.paths);
      const response = await client.updateMemory({ ...input, repository });
      if (response.status === 'unavailable') return response;
      const record = response.status === 'saved' ? response.memory : response.current;
      const memory = record ? { id: record.id, version: record.version, content: record.content,
        skill: record.skill, paths: input.paths, observedAt: record.observedAt,
        verdict: record.judgment?.verdict, headSha: record.judgment?.headSha } : undefined;
      if (memory) records.set(memory.id, memory);
      return response.status === 'saved' && memory
        ? { status: 'saved', memory }
        : { status: 'conflict', ...(memory ? { current: memory } : {}) };
    },
  };
}
