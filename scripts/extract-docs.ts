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
  props: PropDoc[];
}

interface ComponentDoc {
  exports: ExportDoc[];
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
      const description =
        jsDocs.length > 0 ? jsDocs[0].getDescription().trim() : "";

      // Extract @param descriptions from JSDoc
      const paramDescriptions = new Map<string, string>();
      if (jsDocs.length > 0) {
        const tags = jsDocs[0].getTags();
        for (const tag of tags) {
          if (tag.getTagName() === "param") {
            const text = tag.getCommentText() || "";
            const tagNode = tag.compilerNode as { name?: { getText?: () => string } };
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

      if (params.length > 0) {
        const firstParam = params[0];
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

      const importLine = `import { ${fnName} } from "${importPath}"`;

      exports.push({
        name: fnName,
        description,
        import: importLine,
        props,
      });
    }

    // Also extract exported non-function declarations (type aliases, etc.) - skip for now
    // Focus on functions which is the main use case
  }

  if (exports.length > 0) {
    docs[componentName] = { exports };
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
