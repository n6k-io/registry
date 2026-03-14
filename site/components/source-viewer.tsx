import { useState } from "react";

interface SourceFile {
  path: string;
  code: string;
  html: string;
}

export function SourceViewer({ files }: { files: SourceFile[] }) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  if (files.length === 0) return null;

  const active = files[activeIndex];
  if (!active) return null;

  const copy = () => {
    navigator.clipboard.writeText(active.code).then(() => {
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
        View Source
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <div className="relative flex w-full max-w-2xl flex-col border-l border-neutral-200 bg-white shadow-xl dark:border-neutral-800 dark:bg-neutral-950">
            <div className="sticky top-0 z-10 border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
              <div className="flex items-center justify-between px-6 py-4">
                <span className="font-mono text-sm text-neutral-600 dark:text-neutral-400">
                  {active.path}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={copy}
                    className="rounded-md p-1.5 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"
                    aria-label="Copy source"
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
                        <rect
                          x="9"
                          y="9"
                          width="13"
                          height="13"
                          rx="2"
                          ry="2"
                        />
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
              {files.length > 1 && (
                <div className="flex gap-1 px-6 pb-3">
                  {files.map((file, i) => (
                    <button
                      key={file.path}
                      onClick={() => {
                        setActiveIndex(i);
                        setCopied(false);
                      }}
                      className={`rounded-md px-2.5 py-1 font-mono text-xs ${
                        i === activeIndex
                          ? "bg-neutral-200 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-200"
                          : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
                      }`}
                    >
                      {file.path.split("/").pop()}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto">
              <div
                className="overflow-x-auto px-6 py-4 text-xs leading-relaxed [&_code]:!bg-transparent [&_pre]:!bg-transparent"
                dangerouslySetInnerHTML={{ __html: active.html }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
