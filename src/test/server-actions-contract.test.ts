import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import ts from "typescript";
import { describe, expect, it } from "vitest";

const moderationActionNames = [
  "approveSubmissionAction",
  "rejectSubmissionAction",
  "requestChangesAction",
  "publishSubmissionAction",
  "createSubmissionEditLinkAction",
  "revokeSubmissionEditLinksAction",
] as const;

function parseSource(path: string) {
  const source = readFileSync(join(process.cwd(), path), "utf8");
  return ts.createSourceFile(
    path,
    source,
    ts.ScriptTarget.Latest,
    true,
    path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
}

function discoverServerActionModules(directory = "src"): string[] {
  return readdirSync(join(process.cwd(), directory), {
    withFileTypes: true,
  }).flatMap((entry) => {
    const relativePath = `${directory}/${entry.name}`;
    if (entry.isDirectory()) {
      return discoverServerActionModules(relativePath);
    }
    if (!entry.isFile() || !/\.tsx?$/.test(entry.name)) {
      return [];
    }

    const sourceFile = parseSource(relativePath);
    const hasUseServerDirective = sourceFile.statements.some(
      (statement) =>
        ts.isExpressionStatement(statement) &&
        ts.isStringLiteral(statement.expression) &&
        statement.expression.text === "use server",
    );
    return hasUseServerDirective ? [relativePath] : [];
  });
}

const serverActionModules = discoverServerActionModules();

function exportedStatements(path: string) {
  const sourceFile = parseSource(path);

  return sourceFile.statements.filter((statement) =>
    ts.canHaveModifiers(statement)
      ? ts
          .getModifiers(statement)
          ?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)
      : false,
  );
}

describe('"use server" module exports', () => {
  it.each(serverActionModules)(
    "%s exports only async functions",
    (modulePath) => {
      const statements = exportedStatements(modulePath);

      expect(statements.length).toBeGreaterThan(0);
      for (const statement of statements) {
        expect(ts.isFunctionDeclaration(statement)).toBe(true);
        if (ts.isFunctionDeclaration(statement)) {
          expect(
            statement.modifiers?.some(
              (modifier) => modifier.kind === ts.SyntaxKind.AsyncKeyword,
            ),
          ).toBe(true);
        }
      }
    },
  );

  it("keeps moderation and edit-link actions callable exports", () => {
    const exportedNames = exportedStatements(
      "src/app/admin/(protected)/submissions/[id]/actions.ts",
    )
      .filter(ts.isFunctionDeclaration)
      .map((statement) => statement.name?.text);

    expect(exportedNames).toEqual(moderationActionNames);
  });

  it("keeps moderation initial state outside the server action module", () => {
    const actionSource = readFileSync(
      join(
        process.cwd(),
        "src/app/admin/(protected)/submissions/[id]/actions.ts",
      ),
      "utf8",
    );
    const stateSource = readFileSync(
      join(process.cwd(), "src/lib/moderation/moderation-state.ts"),
      "utf8",
    );

    expect(actionSource).not.toContain("initialModerationActionState");
    expect(stateSource).toContain("initialModerationActionState");
  });
});
