import type { SkillReport, Finding } from '../types/index.js';
import type { RenderResult, RenderOptions } from './types.js';
export declare function renderSkillReport(report: SkillReport, options?: RenderOptions): RenderResult;
/** Render findings as markdown for inclusion in a review body. */
export declare function renderFindingsBody(findings: Finding[], skill: string): string;
//# sourceMappingURL=renderer.d.ts.map