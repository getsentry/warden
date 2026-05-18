interface ShouldFind {
  finding: string;
  required: boolean;
}

interface EvalMeta {
  shouldFind: ShouldFind[];
  shouldNotFind: string[];
}

interface ExpectationVerdict {
  met: boolean;
  matchedFindingIndex: number | null;
  reasoning: string;
}

interface AntiExpectationVerdict {
  violated: boolean;
  reasoning: string;
}

interface JudgeResponse {
  expectations: ExpectationVerdict[];
  antiExpectations: AntiExpectationVerdict[];
}

export function evalPassed(
  meta: EvalMeta,
  response: JudgeResponse
): boolean {
  for (let i = 0; i < meta.shouldFind.length; i++) {
    const assertion = meta.shouldFind[i];
    const verdict = response.expectations[i];

    if (assertion?.required && !verdict?.met) {
      return false;
    }
  }

  return response.antiExpectations.every((verdict) => !verdict.violated);
}

function failedJudgeReasons(
  meta: EvalMeta,
  response: JudgeResponse
): string[] {
  const reasons: string[] = [];

  for (let i = 0; i < meta.shouldFind.length; i++) {
    const assertion = meta.shouldFind[i];
    const verdict = response.expectations[i];
    if (!assertion || !verdict) {
      reasons.push(`missing verdict for should_find[${i}]`);
      continue;
    }

    if (!verdict.met) {
      reasons.push(`should_find[${i}] not met: ${verdict.reasoning}`);
    }
  }

  for (let i = 0; i < meta.shouldNotFind.length; i++) {
    const verdict = response.antiExpectations[i];
    if (verdict?.violated) {
      reasons.push(`should_not_find[${i}] violated: ${verdict.reasoning}`);
    }
  }

  return reasons;
}

export function createEvalResult(
  meta: EvalMeta,
  response: JudgeResponse
): { score: number; rationale: string } {
  const passed = evalPassed(meta, response);
  const reasons = failedJudgeReasons(meta, response);

  return {
    score: passed ? 1 : 0,
    rationale: reasons.length > 0 ? reasons.join('; ') : 'All eval assertions passed.',
  };
}
