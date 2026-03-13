import { useState } from "react";

export function CodeViewer({
  code,
  html,
  filename,
}: {
  code: string;
  html?: string;
  filename: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs px-3 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:border-neutral-300 dark:hover:border-neutral-700"
      >
        View Code
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <div className="relative w-full max-w-2xl bg-white dark:bg-neutral-950 border-l border-neutral-200 dark:border-neutral-800 shadow-xl overflow-y-auto">
            <div className="sticky top-0 flex items-center justify-between px-6 py-4 bg-white dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 z-10">
              <span className="text-sm font-mono text-neutral-600 dark:text-neutral-400">
                {filename}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={copy}
                  className="p-1.5 rounded-md text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"
                  aria-label="Copy code"
                >
                  {copied ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-md text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"
                  aria-label="Close"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            {html ? (
              <div
                className="px-6 py-4 text-xs leading-relaxed overflow-x-auto [&_pre]:!bg-transparent [&_code]:!bg-transparent"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            ) : (
              <pre className="px-6 py-4 text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed overflow-x-auto">
                <code>{code}</code>
              </pre>
            )}
          </div>
        </div>
      )}
    </>
  );
}
