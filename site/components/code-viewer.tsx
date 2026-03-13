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
        className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs text-neutral-600 hover:border-neutral-300 hover:text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:text-neutral-200"
      >
        View Code
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <div className="relative w-full max-w-2xl overflow-y-auto border-l border-neutral-200 bg-white shadow-xl dark:border-neutral-800 dark:bg-neutral-950">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-4 dark:border-neutral-800 dark:bg-neutral-950">
              <span className="font-mono text-sm text-neutral-600 dark:text-neutral-400">
                {filename}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={copy}
                  className="rounded-md p-1.5 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"
                  aria-label="Copy code"
                >
                  {copied ? (
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-md p-1.5 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"
                  aria-label="Close"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            {html ? (
              <div
                className="overflow-x-auto px-6 py-4 text-xs leading-relaxed [&_code]:!bg-transparent [&_pre]:!bg-transparent"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            ) : (
              <pre className="overflow-x-auto px-6 py-4 text-xs leading-relaxed text-neutral-700 dark:text-neutral-300">
                <code>{code}</code>
              </pre>
            )}
          </div>
        </div>
      )}
    </>
  );
}
