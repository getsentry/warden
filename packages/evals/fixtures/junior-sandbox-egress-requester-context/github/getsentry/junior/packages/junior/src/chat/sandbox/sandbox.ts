import fs from "node:fs/promises";
import {
  logInfo,
  setSpanAttributes,
  setSpanStatus,
  withSpan,
  type LogContext,
} from "@/chat/logging";
import {
  buildSandboxEgressNetworkPolicy,
  resolveSandboxCommandEnvironment,
} from "@/chat/sandbox/egress-policy";
import {
  clearSandboxEgressSession,
  upsertSandboxEgressSession,
} from "@/chat/sandbox/egress-session";
import { throwSandboxOperationError } from "@/chat/sandbox/errors";
import { SANDBOX_WORKSPACE_ROOT } from "@/chat/sandbox/paths";
import { createSandboxSessionManager } from "@/chat/sandbox/session";
import {
  isHostFileMissingError,
  resolveHostDataPath,
  resolveHostSkillPath,
} from "@/chat/sandbox/skill-sync";
import type { SandboxInstance } from "@/chat/sandbox/workspace";
import type { SkillMetadata } from "@/chat/skills";
import { editFile } from "@/chat/tools/sandbox/edit-file";
import { findFiles } from "@/chat/tools/sandbox/find-files";
import {
  isMissingPathError,
  positiveInteger,
} from "@/chat/tools/sandbox/file-utils";
import { grepFiles } from "@/chat/tools/sandbox/grep";
import { listDir } from "@/chat/tools/sandbox/list-dir";
import {
  missingFileResult,
  sliceFileContent,
} from "@/chat/tools/sandbox/read-file";
import { ToolInputError } from "@/chat/tools/execution/tool-input-error";

// Spec: specs/security-policy.md (sandbox isolation, network policy, credential lifecycle)
// Spec: specs/logging/tracing-spec.md (required sandbox span semantics)
interface SandboxExecutionInput {
  toolName: string;
  input: unknown;
}

export interface SandboxExecutionEnvelope<T = unknown> {
  result: T;
}

export interface BashCustomCommandResult {
  ok: boolean;
  command: string;
  cwd: string;
  exit_code: number;
  signal: null;
  timed_out: boolean;
  stdout: string;
  stderr: string;
  stdout_truncated: boolean;
  stderr_truncated: boolean;
}

export interface SandboxAcquiredState {
  sandboxId: string;
  sandboxDependencyProfileHash?: string;
}

export interface SandboxExecutor {
  configureSkills(skills: SkillMetadata[]): void;
  configureReferenceFiles(files: string[]): void;
  getSandboxId(): string | undefined;
  getDependencyProfileHash(): string | undefined;
  canExecute(toolName: string): boolean;
  createSandbox(): Promise<SandboxInstance>;
  execute<T>(
    params: SandboxExecutionInput,
  ): Promise<SandboxExecutionEnvelope<T>>;
  dispose(): Promise<void>;
}

const SANDBOX_TOOL_NAMES = new Set([
  "bash",
  "readFile",
  "editFile",
  "grep",
  "findFiles",
  "listDir",
  "writeFile",
]);

function parseEnv(raw: unknown): Record<string, string> | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(raw as Record<string, unknown>)
      .filter(([, value]) => typeof value === "string")
      .map(([key, value]) => [key, value as string]),
  );
}

/** Create one sandbox-backed tool executor facade for the current turn. */
export function createSandboxExecutor(options?: {
  sandboxId?: string;
  sandboxDependencyProfileHash?: string;
  timeoutMs?: number;
  traceContext?: LogContext;
  credentialEgress?: {
    requesterId: string;
  };
  onSandboxAcquired?: (sandbox: SandboxAcquiredState) => void | Promise<void>;
  runBashCustomCommand?: (
    command: string,
  ) => Promise<{ handled: boolean; result?: BashCustomCommandResult }>;
}): SandboxExecutor {
  let availableSkills: SkillMetadata[] = [];
  let referenceFiles: string[] = [];
  const traceContext = options?.traceContext ?? {};
  const credentialEgress = options?.credentialEgress;
  const authorizeSandboxEgressForCommand = credentialEgress
    ? async (egressId: string): Promise<void> => {
        await upsertSandboxEgressSession({
          egressId,
          requesterId: credentialEgress.requesterId,
          ttlMs: options?.timeoutMs,
        });
      }
    : undefined;
  const clearSandboxEgressForCommand = credentialEgress
    ? async (egressId: string): Promise<void> => {
        await clearSandboxEgressSession(egressId);
      }
    : undefined;
  const sessionManager = createSandboxSessionManager({
    sandboxId: options?.sandboxId,
    sandboxDependencyProfileHash: options?.sandboxDependencyProfileHash,
    timeoutMs: options?.timeoutMs,
    traceContext,
    commandEnv: credentialEgress
      ? async () => await resolveSandboxCommandEnvironment()
      : undefined,
    createNetworkPolicy: credentialEgress
      ? buildSandboxEgressNetworkPolicy
      : undefined,
    beforeCommand: authorizeSandboxEgressForCommand,
    afterCommand: clearSandboxEgressForCommand,
    onSandboxAcquired: async (sandbox) => {
      await options?.onSandboxAcquired?.(sandbox);
    },
  });

  const withSandboxSpan = <T>(
    name: string,
    op: string,
    attributes: Record<string, unknown>,
    callback: () => Promise<T>,
  ): Promise<T> => withSpan(name, op, traceContext, callback, attributes);

  const logSandboxBootRequest = (
    trigger: string,
    details: Record<string, string | number> = {},
  ): void => {
    if (sessionManager.getSandboxId()) {
      return;
    }

    logInfo(
      "sandbox_boot_requested",
      traceContext,
      {
        "app.sandbox.boot.trigger": trigger,
        ...details,
      },
      "Sandbox boot requested",
    );
  };

  const executeBashTool = async <T>(
    rawInput: Record<string, unknown>,
    command: string,
  ): Promise<SandboxExecutionEnvelope<T>> => {
    const env = parseEnv(rawInput.env);
    const timeoutMs = positiveInteger(rawInput.timeoutMs);
    logSandboxBootRequest("tool.bash", {
      "app.sandbox.command_length": command.length,
    });
    const executeBash = (await sessionManager.ensureToolExecutors()).bash;
    const result = await withSandboxSpan(
      "bash",
      "process.exec",
      {
        "process.executable.name": "bash",
      },
      async () => {
        try {
          const response = await executeBash({
            command,
            ...(env ? { env } : {}),
            ...(timeoutMs ? { timeoutMs } : {}),
          });
          setSpanAttributes({
            "process.exit.code": response.exitCode,
            "app.sandbox.stdout_bytes": Buffer.byteLength(
              response.stdout ?? "",
              "utf8",
            ),
            "app.sandbox.stderr_bytes": Buffer.byteLength(
              response.stderr ?? "",
              "utf8",
            ),
            ...(response.exitCode !== 0
              ? { "error.type": "nonzero_exit" }
              : {}),
          });
          setSpanStatus(response.exitCode === 0 ? "ok" : "error");
          return response;
        } catch (error) {
          setSpanAttributes({
            "error.type":
              error instanceof Error ? error.name : "sandbox_execute_error",
          });
          setSpanStatus("error");
          throw error;
        }
      },
    );

    return {
      result: {
        ok: result.exitCode === 0,
        command,
        cwd: SANDBOX_WORKSPACE_ROOT,
        exit_code: result.exitCode,
        signal: null,
        timed_out: Boolean(result.timedOut),
        stdout: result.stdout,
        stderr: result.stderr,
        stdout_truncated: result.stdoutTruncated,
        stderr_truncated: result.stderrTruncated,
      } as T,
    };
  };

  const executeReadFileTool = async <T>(
    rawInput: Record<string, unknown>,
  ): Promise<SandboxExecutionEnvelope<T>> => {
    const filePath = String(rawInput.path ?? "").trim();
    if (!filePath) {
      throw new ToolInputError("path is required");
    }
    const offset = positiveInteger(rawInput.offset);
    const limit = positiveInteger(rawInput.limit);

    if (!sessionManager.getSandboxId()) {
      const hostPath =
        resolveHostSkillPath(availableSkills, filePath) ??
        resolveHostDataPath(referenceFiles, filePath);
      if (hostPath) {
        try {
          const content = await fs.readFile(hostPath, "utf8");
          setSpanAttributes({
            "app.sandbox.path.length": filePath.length,
            "app.sandbox.read.bytes": Buffer.byteLength(content, "utf8"),
            "app.sandbox.read.chars": content.length,
            "app.skill.virtual_read": true,
          });
          setSpanStatus("ok");
          return {
            result: sliceFileContent({
              content,
              path: filePath,
              offset,
              limit,
            }) as T,
          };
        } catch (error) {
          if (!isHostFileMissingError(error)) {
            throw error;
          }
        }
      }
    }

    logSandboxBootRequest("tool.readFile", {
      "file.path": filePath,
    });
    const executeReadFile = (await sessionManager.ensureToolExecutors())
      .readFile;
    const result = await withSandboxSpan(
      "sandbox.readFile",
      "sandbox.fs.read",
      {
        "app.sandbox.path.length": filePath.length,
      },
      async () => {
        let response: { content: string };
        try {
          response = await executeReadFile({ path: filePath });
        } catch (error) {
          if (isMissingPathError(error)) {
            setSpanStatus("ok");
            return missingFileResult(filePath);
          }
          throw error;
        }
        const content = String(response.content ?? "");
        setSpanAttributes({
          "app.sandbox.read.bytes": Buffer.byteLength(content, "utf8"),
          "app.sandbox.read.chars": content.length,
        });
        setSpanStatus("ok");
        return {
          ...sliceFileContent({
            content,
            path: filePath,
            offset,
            limit,
          }),
        };
      },
    );

    return { result: result as T };
  };

  const executeWriteFileTool = async <T>(
    rawInput: Record<string, unknown>,
  ): Promise<SandboxExecutionEnvelope<T>> => {
    const filePath = String(rawInput.path ?? "").trim();
    if (!filePath) {
      throw new ToolInputError("path is required");
    }

    const content = String(rawInput.content ?? "");
    logSandboxBootRequest("tool.writeFile", {
      "file.path": filePath,
    });
    const executeWriteFile = (await sessionManager.ensureToolExecutors())
      .writeFile;
    await withSandboxSpan(
      "sandbox.writeFile",
      "sandbox.fs.write",
      {
        "app.sandbox.path.length": filePath.length,
        "app.sandbox.write.bytes": Buffer.byteLength(content, "utf8"),
      },
      async () => {
        try {
          await executeWriteFile({ path: filePath, content });
        } catch (error) {
          throwSandboxOperationError("sandbox writeFile", error);
        }
        setSpanStatus("ok");
      },
    );

    return {
      result: {
        ok: true,
        path: filePath,
        bytes_written: Buffer.byteLength(content, "utf8"),
      } as T,
    };
  };

  const executeEditFileTool = async <T>(
    rawInput: Record<string, unknown>,
  ): Promise<SandboxExecutionEnvelope<T>> => {
    const filePath = String(rawInput.path ?? "").trim();
    if (!filePath) {
      throw new ToolInputError("path is required");
    }
    if (!Array.isArray(rawInput.edits)) {
      throw new ToolInputError("edits is required");
    }

    logSandboxBootRequest("tool.editFile", {
      "file.path": filePath,
    });
    const executors = await sessionManager.ensureToolExecutors();
    const result = await withSandboxSpan(
      "sandbox.editFile",
      "sandbox.fs.edit",
      {
        "app.sandbox.path.length": filePath.length,
        "app.sandbox.edit.count": rawInput.edits.length,
      },
      async () => {
        const response = await editFile({
          fs: executors.fs,
          path: filePath,
          edits: rawInput.edits as Array<{ oldText: string; newText: string }>,
        });
        setSpanStatus("ok");
        return response;
      },
    );

    return { result: result as T };
  };

  const executeGrepTool = async <T>(
    rawInput: Record<string, unknown>,
  ): Promise<SandboxExecutionEnvelope<T>> => {
    const pattern = String(rawInput.pattern ?? "");
    if (!pattern) {
      throw new ToolInputError("pattern is required");
    }

    logSandboxBootRequest("tool.grep");
    const contextLines = positiveInteger(rawInput.context);
    const limit = positiveInteger(rawInput.limit);
    const executors = await sessionManager.ensureToolExecutors();
    const result = await withSandboxSpan(
      "sandbox.grep",
      "sandbox.fs.search",
      {
        "app.sandbox.pattern.length": pattern.length,
      },
      async () => {
        const response = await grepFiles({
          fs: executors.fs,
          pattern,
          ...(typeof rawInput.path === "string" ? { path: rawInput.path } : {}),
          ...(typeof rawInput.glob === "string" ? { glob: rawInput.glob } : {}),
          ...(typeof rawInput.ignoreCase === "boolean"
            ? { ignoreCase: rawInput.ignoreCase }
            : {}),
          ...(typeof rawInput.literal === "boolean"
            ? { literal: rawInput.literal }
            : {}),
          ...(contextLines ? { context: contextLines } : {}),
          ...(limit ? { limit } : {}),
        });
        setSpanStatus("ok");
        return response;
      },
    );

    return { result: result as T };
  };

  const executeFindFilesTool = async <T>(
    rawInput: Record<string, unknown>,
  ): Promise<SandboxExecutionEnvelope<T>> => {
    const pattern = String(rawInput.pattern ?? "");
    if (!pattern) {
      throw new ToolInputError("pattern is required");
    }

    logSandboxBootRequest("tool.findFiles");
    const limit = positiveInteger(rawInput.limit);
    const executors = await sessionManager.ensureToolExecutors();
    const result = await withSandboxSpan(
      "sandbox.findFiles",
      "sandbox.fs.find",
      {
        "app.sandbox.pattern.length": pattern.length,
      },
      async () => {
        const response = await findFiles({
          fs: executors.fs,
          pattern,
          ...(typeof rawInput.path === "string" ? { path: rawInput.path } : {}),
          ...(limit ? { limit } : {}),
        });
        setSpanStatus("ok");
        return response;
      },
    );

    return { result: result as T };
  };

  const executeListDirTool = async <T>(
    rawInput: Record<string, unknown>,
  ): Promise<SandboxExecutionEnvelope<T>> => {
    logSandboxBootRequest("tool.listDir");
    const limit = positiveInteger(rawInput.limit);
    const executors = await sessionManager.ensureToolExecutors();
    const result = await withSandboxSpan(
      "sandbox.listDir",
      "sandbox.fs.list",
      {},
      async () => {
        const response = await listDir({
          fs: executors.fs,
          ...(typeof rawInput.path === "string" ? { path: rawInput.path } : {}),
          ...(limit ? { limit } : {}),
        });
        setSpanStatus("ok");
        return response;
      },
    );

    return { result: result as T };
  };

  const execute = async <T>(
    params: SandboxExecutionInput,
  ): Promise<SandboxExecutionEnvelope<T>> => {
    const rawInput = (params.input ?? {}) as Record<string, unknown>;
    const bashCommand =
      params.toolName === "bash"
        ? String(rawInput.command ?? "").trim()
        : undefined;

    if (params.toolName === "bash") {
      if (!bashCommand) {
        throw new ToolInputError("command is required");
      }
      if (options?.runBashCustomCommand) {
        const custom = await options.runBashCustomCommand(bashCommand);
        if (custom.handled) {
          return { result: custom.result as T };
        }
      }
      return await executeBashTool(rawInput, bashCommand);
    }

    if (params.toolName === "readFile") {
      return await executeReadFileTool(rawInput);
    }

    if (params.toolName === "editFile") {
      return await executeEditFileTool(rawInput);
    }

    if (params.toolName === "grep") {
      return await executeGrepTool(rawInput);
    }

    if (params.toolName === "findFiles") {
      return await executeFindFilesTool(rawInput);
    }

    if (params.toolName === "listDir") {
      return await executeListDirTool(rawInput);
    }

    if (params.toolName === "writeFile") {
      return await executeWriteFileTool(rawInput);
    }

    throw new Error(`unsupported sandbox tool: ${params.toolName}`);
  };

  return {
    configureSkills(skills: SkillMetadata[]) {
      availableSkills = [...skills];
      sessionManager.configureSkills(skills);
    },
    configureReferenceFiles(files: string[]) {
      referenceFiles = [...files];
      sessionManager.configureReferenceFiles(files);
    },
    getSandboxId() {
      return sessionManager.getSandboxId();
    },
    getDependencyProfileHash() {
      return sessionManager.getDependencyProfileHash();
    },
    canExecute(toolName: string) {
      return SANDBOX_TOOL_NAMES.has(toolName);
    },
    async createSandbox() {
      return await sessionManager.createSandbox();
    },
    execute,
    async dispose() {
      await sessionManager.dispose();
    },
  };
}
