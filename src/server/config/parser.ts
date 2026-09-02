import { parse as parseYaml, LineCounter, YAMLParseError } from 'yaml';
import { DashParkConfigSchema } from './schema.js';
import type { DashParkConfig, ErrorDiagnostic } from '../../shared/types.js';

export interface ParseResult {
  valid: boolean;
  config?: DashParkConfig;
  diagnostics: ErrorDiagnostic[];
  rawYaml: string;
}

/**
 * Extracts a multi-line snippet around the error line for clear visual reporting
 */
function extractSnippet(lines: string[], errorLine: number, errorCol: number): string {
  const start = Math.max(0, errorLine - 3);
  const end = Math.min(lines.length, errorLine + 2);
  const snippetLines: string[] = [];

  for (let i = start; i < end; i++) {
    const lineNum = i + 1;
    const isErrorLine = lineNum === errorLine;
    const prefix = isErrorLine ? '> ' : '  ';
    const formattedLineNum = String(lineNum).padStart(4, ' ');
    snippetLines.push(`${prefix}${formattedLineNum} | ${lines[i]}`);
    if (isErrorLine && errorCol > 0) {
      const pointerIndent = ' '.repeat(6 + Math.max(0, errorCol - 1));
      snippetLines.push(`${pointerIndent}^`);
    }
  }

  return snippetLines.join('\n');
}

/**
 * Robust, resilient YAML & JSON configuration parser for DashPark.
 * Catches syntax errors, indentation faults, and schema invalidities without crashing.
 */
export function parseConfig(content: string, isJson: boolean = false): ParseResult {
  const diagnostics: ErrorDiagnostic[] = [];
  const lines = content.split(/\r?\n/);
  const lineCounter = new LineCounter();

  let parsedRaw: unknown = null;

  try {
    if (isJson) {
      parsedRaw = JSON.parse(content);
    } else {
      parsedRaw = parseYaml(content, {
        lineCounter,
        prettyErrors: true,
        strict: true,
      });
    }
  } catch (err: unknown) {
    if (err instanceof YAMLParseError) {
      const line = err.linePos?.[0]?.line ?? 1;
      const column = err.linePos?.[0]?.col ?? 1;
      const snippet = extractSnippet(lines, line, column);

      diagnostics.push({
        line,
        column,
        message: err.message.replace(/\s+at\s+line.*/i, ''),
        snippet,
        severity: 'error',
      });
    } else if (err instanceof SyntaxError) {
      // JSON Syntax Error parsing
      const msg = err.message;
      const match = msg.match(/at position (\d+)/i);
      let line = 1;
      let col = 1;
      if (match) {
        const pos = parseInt(match[1], 10);
        let currentPos = 0;
        for (let i = 0; i < lines.length; i++) {
          if (currentPos + lines[i].length >= pos) {
            line = i + 1;
            col = pos - currentPos + 1;
            break;
          }
          currentPos += lines[i].length + 1; // +1 for newline
        }
      }
      const snippet = extractSnippet(lines, line, col);
      diagnostics.push({
        line,
        column: col,
        message: msg,
        snippet,
        severity: 'error',
      });
    } else {
      diagnostics.push({
        line: 1,
        column: 1,
        message: (err as Error)?.message || 'Unknown syntax error',
        severity: 'error',
      });
    }

    return {
      valid: false,
      diagnostics,
      rawYaml: content,
    };
  }

  if (!parsedRaw || typeof parsedRaw !== 'object') {
    diagnostics.push({
      line: 1,
      column: 1,
      message: 'Configuration root must be an object/mapping with "categories" and "meta".',
      severity: 'error',
    });
    return {
      valid: false,
      diagnostics,
      rawYaml: content,
    };
  }

  // Validate against Zod Schema
  const validation = DashParkConfigSchema.safeParse(parsedRaw);
  if (!validation.success) {
    for (const issue of validation.error.issues) {
      const pathStr = issue.path.join('.');
      diagnostics.push({
        line: 1, // Will be mapped to field location
        column: 1,
        message: `Field "${pathStr}": ${issue.message}`,
        severity: 'error',
      });
    }
    return {
      valid: false,
      diagnostics,
      rawYaml: content,
    };
  }

  return {
    valid: true,
    config: validation.data as DashParkConfig,
    diagnostics: [],
    rawYaml: content,
  };
}
