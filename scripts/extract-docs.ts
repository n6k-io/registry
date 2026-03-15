import { Project, SyntaxKind } from "ts-morph";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const root = process.cwd();

interface PropDoc {
  name: string;
  type: string;
  optional: boolean;
  description: string;
}

interface ExportDoc {
  name: string;
  description: string;
  import: string;
  importPath: string;
  props: PropDoc[];
}

interface ComponentDoc {
  exports: ExportDoc[];
  import: string;
}

const registry = JSON.parse(readFileSync(join(root, "registry.json"), "utf-8"));

const project = new Project({
  compilerOptions: { allowJs: true, jsx: 4 /* JsxEmit.ReactJSX */ },
  skipAddingFilesFromTsConfig: true,
});

const docs: Record<string, ComponentDoc> = {};

for (const item of registry.items) {
  const componentName = item.name as string;
  const exports: ExportDoc[] = [];

  for (const file of item.files) {
    const filePath = file.path as string;
    const absPath = join(root, filePath);

    const sourceFile = project.addSourceFileAtPath(absPath);

    // Determine import path: src/components/ui/foo.tsx → @/components/ui/foo
    const importPath = `@/${filePath.replace("src/", "").replace(/\.tsx?$/, "")}`;

    const exportedFunctions = sourceFile
      .getFunctions()
      .filter((f) => f.isExported());

    for (const fn of exportedFunctions) {
      const fnName = fn.getName() || "default";
      const jsDocs = fn.getJsDocs();
      const firstDoc = jsDocs[0];
      const description = firstDoc ? firstDoc.getDescription().trim() : "";

      // Extract @param descriptions from JSDoc
      const paramDescriptions = new Map<string, string>();
      if (firstDoc) {
        const tags = firstDoc.getTags();
        for (const tag of tags) {
          if (tag.getTagName() === "param") {
            const text = tag.getCommentText() || "";
            const tagNode = tag.compilerNode as {
              name?: { getText?: () => string };
            };
            let paramName = tagNode.name?.getText?.() || "";
            // Handle "props.xxx" format
            if (paramName.startsWith("props.")) {
              paramName = paramName.slice(6);
            }
            // Extract description: strip leading "- " or " - " prefix
            const desc = text.replace(/^\s*-\s*/, "").trim();
            if (paramName) {
              paramDescriptions.set(paramName, desc);
            }
          }
        }
      }

      // Extract props from first parameter's type
      const props: PropDoc[] = [];
      const params = fn.getParameters();

      const firstParam = params[0];
      if (firstParam) {
        const paramType = firstParam.getType();

        // Check if it's a destructured object parameter
        const bindingElement = firstParam.getNameNode();
        if (bindingElement.getKind() === SyntaxKind.ObjectBindingPattern) {
          // Get properties from the type
          for (const prop of paramType.getProperties()) {
            const propName = prop.getName();
            const propType = prop.getTypeAtLocation(fn);
            const typeText = propType.getText(fn, 1 /* TypeFormatFlags.None */);
            const isOptional = prop.isOptional();

            props.push({
              name: propName,
              type: cleanTypeText(typeText),
              optional: isOptional,
              description: paramDescriptions.get(propName) || "",
            });
          }
        }
      }

      exports.push({
        name: fnName,
        description,
        import: "",
        importPath,
        props,
      });
    }

    // Also extract exported non-function declarations (type aliases, etc.) - skip for now
    // Focus on functions which is the main use case
  }

  if (exports.length > 0) {
    // Group exports by importPath into a single import statement
    const byPath = new Map<string, string[]>();
    for (const exp of exports) {
      const names = byPath.get(exp.importPath) ?? [];
      names.push(exp.name);
      byPath.set(exp.importPath, names);
    }
    const importLines: string[] = [];
    for (const [path, names] of byPath) {
      if (names.length === 1) {
        importLines.push(`import { ${names[0]} } from "${path}"`);
      } else {
        importLines.push(`import {\n  ${names.join(",\n  ")},\n} from "${path}"`);
      }
    }
    const combinedImport = importLines.join("\n");

    // Attach combined import to each export for backward compat, plus add a top-level field
    for (const exp of exports) {
      (exp as ExportDoc).import = combinedImport;
    }

    docs[componentName] = { exports: exports as ExportDoc[], import: combinedImport };
  }
}

function cleanTypeText(type: string): string {
  // Remove import(...) prefixes that ts-morph includes
  return type.replace(/import\([^)]+\)\./g, "");
}

writeFileSync(join(root, "public", "docs.json"), JSON.stringify(docs, null, 2));
console.log(
  `Generated public/docs.json with ${Object.keys(docs).length} components`,
);
