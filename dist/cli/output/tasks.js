import { Listr } from 'listr2';
import { prepareFiles, analyzeFile, aggregateUsage, deduplicateFindings, generateSummary, } from '../../sdk/runner.js';
import { Verbosity } from './verbosity.js';
import { truncate } from './formatters.js';
/** Spinner frames for animation */
const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
/**
 * Render file states as multi-line output.
 * Only shows files that have started (running or done).
 */
function renderFileStates(states, spinnerFrame) {
    const lines = [];
    const spinner = SPINNER_FRAMES[spinnerFrame % SPINNER_FRAMES.length];
    for (const state of states) {
        // Skip pending files
        if (state.status === 'pending')
            continue;
        const filename = truncate(state.file.filename, 50);
        if (state.status === 'done') {
            lines.push(`✓ ${filename}`);
        }
        else {
            // Running - show animated spinner
            const hunkInfo = `[${state.currentHunk}/${state.totalHunks}]`;
            lines.push(`${spinner} ${filename} ${hunkInfo}`);
        }
    }
    return lines.join('\n');
}
/**
 * Create a Listr task for a skill.
 */
function createSkillTask(options, fileConcurrency) {
    const { name, displayName = name, failOn, resolveSkill, context, runnerOptions = {} } = options;
    return {
        title: displayName,
        task: async (ctx, task) => {
            const startTime = Date.now();
            // Resolve the skill
            const skill = await resolveSkill();
            // Prepare files (parse patches into hunks)
            const preparedFiles = prepareFiles(context, {
                contextLines: runnerOptions.contextLines,
            });
            if (preparedFiles.length === 0) {
                task.skip('No files to analyze');
                ctx.results.push({
                    name,
                    report: {
                        skill: skill.name,
                        summary: 'No code changes to analyze',
                        findings: [],
                        usage: { inputTokens: 0, outputTokens: 0, costUSD: 0 },
                    },
                    failOn,
                });
                return;
            }
            // Initialize file states
            const fileStates = preparedFiles.map((file) => ({
                file,
                status: 'pending',
                currentHunk: 0,
                totalHunks: file.hunks.length,
                findings: [],
            }));
            // Spinner animation state
            let spinnerFrame = 0;
            let isRunning = true;
            // Update display
            function updateOutput() {
                task.output = renderFileStates(fileStates, spinnerFrame);
            }
            // Start spinner animation
            const spinnerInterval = setInterval(() => {
                if (!isRunning)
                    return;
                spinnerFrame++;
                // Only update if there are running files
                if (fileStates.some((s) => s.status === 'running')) {
                    updateOutput();
                }
            }, 80);
            // Process files with concurrency
            const processFile = async (state) => {
                state.status = 'running';
                updateOutput();
                const callbacks = {
                    skillStartTime: startTime,
                    onHunkStart: (hunkNum, totalHunks) => {
                        state.currentHunk = hunkNum;
                        state.totalHunks = totalHunks;
                        updateOutput();
                    },
                    onHunkComplete: (_hunkNum, findings) => {
                        state.findings.push(...findings);
                    },
                };
                const result = await analyzeFile(skill, state.file, context.repoPath, runnerOptions, callbacks);
                state.status = 'done';
                state.findings = result.findings;
                state.usage = result.usage;
                updateOutput();
            };
            // Process in batches with concurrency
            try {
                for (let i = 0; i < fileStates.length; i += fileConcurrency) {
                    const batch = fileStates.slice(i, i + fileConcurrency);
                    await Promise.all(batch.map(processFile));
                }
            }
            finally {
                // Stop spinner animation
                isRunning = false;
                clearInterval(spinnerInterval);
            }
            // Build report
            const duration = Date.now() - startTime;
            const allFindings = fileStates.flatMap((s) => s.findings);
            const allUsage = fileStates.map((s) => s.usage).filter((u) => u !== undefined);
            const uniqueFindings = deduplicateFindings(allFindings);
            const report = {
                skill: skill.name,
                summary: generateSummary(skill.name, uniqueFindings),
                findings: uniqueFindings,
                usage: aggregateUsage(allUsage),
                durationMs: duration,
            };
            ctx.results.push({ name, report, failOn });
        },
    };
}
/**
 * Run multiple skill tasks with listr2.
 */
export async function runSkillTasks(tasks, options) {
    const { mode, verbosity, concurrency } = options;
    // Determine renderer based on output mode
    let renderer = 'default';
    if (verbosity === Verbosity.Quiet) {
        renderer = 'silent';
    }
    else if (!mode.isTTY) {
        renderer = 'simple';
    }
    // File-level concurrency (within each skill)
    const fileConcurrency = 5;
    const listrTasks = tasks.map((t) => createSkillTask(t, fileConcurrency));
    const listr = new Listr(listrTasks, {
        concurrent: concurrency > 1 ? concurrency : false,
        exitOnError: false,
        renderer,
    });
    const ctx = { results: [] };
    try {
        await listr.run(ctx);
    }
    catch {
        // Errors are captured in ctx.results, don't rethrow
    }
    return ctx.results;
}
//# sourceMappingURL=tasks.js.map