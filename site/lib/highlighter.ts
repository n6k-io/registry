import { createHighlighter, type Highlighter } from "shiki";

let instance: Highlighter | null = null;

export async function getHighlighter(): Promise<Highlighter> {
  if (!instance) {
    instance = await createHighlighter({
      themes: ["github-light", "github-dark"],
      langs: ["tsx", "typescript"],
    });
  }
  return instance;
}

export function highlight(
  highlighter: Highlighter,
  code: string,
  lang: "tsx" | "typescript" = "tsx",
): string {
  return highlighter.codeToHtml(code, {
    lang,
    themes: { light: "github-light", dark: "github-dark" },
  });
}
