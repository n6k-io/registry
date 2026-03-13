import { useState, useEffect, useRef } from "react";
import { AlertDialog } from "radix-ui";
import { useDuckDB } from "@n6k.io/db/react";

const STATUS_LABELS: Record<string, string> = {
  initializing: "Initializing DuckDB",
  "loading-extensions": "Loading extensions",
  "attaching-databases": "Attaching databases",
  error: "Connection failed",
};

type DuckDBConnectionGuardProps = {
  children: React.ReactNode;
  delay?: number;
};

export function DuckDBConnectionGuard({
  children,
  delay = 500,
}: DuckDBConnectionGuardProps) {
  const { status, error } = useDuckDB();
  const [showOverlay, setShowOverlay] = useState(false);
  const timerFired = useRef(false);

  useEffect(() => {
    if (status === "ready") {
      setShowOverlay(false);
      return;
    }
    if (timerFired.current) return;
    const timer = setTimeout(() => {
      timerFired.current = true;
      setShowOverlay(true);
    }, delay);
    return () => clearTimeout(timer);
  }, [status, delay]);

  const open = showOverlay && status !== "ready";

  return (
    <>
      {children}
      <AlertDialog.Root open={open}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
          <AlertDialog.Content className="bg-background ring-foreground/10 fixed top-1/2 left-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl p-6 text-center ring-1">
            {status === "error" ? (
              <>
                <AlertDialog.Title className="text-destructive text-base font-medium">
                  Connection Failed
                </AlertDialog.Title>
                <AlertDialog.Description className="text-muted-foreground mt-2 text-sm">
                  {error}
                </AlertDialog.Description>
                <button
                  className="bg-primary text-primary-foreground mt-4 rounded-md px-4 py-2 text-sm font-medium"
                  onClick={() => window.location.reload()}
                >
                  Reload
                </button>
              </>
            ) : (
              <>
                <div className="border-muted-foreground/20 border-t-primary mx-auto mb-4 h-7 w-7 animate-spin rounded-full border-2" />
                <AlertDialog.Title className="text-base font-medium">
                  Waiting for DB connection
                </AlertDialog.Title>
                <AlertDialog.Description className="text-muted-foreground mt-1 text-sm">
                  {STATUS_LABELS[status] ?? status}
                </AlertDialog.Description>
              </>
            )}
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </>
  );
}
