import { useState } from "react";
import { useQuery } from "@n6k.io/db/react";
import { DataTable } from "@/components/ui/n6k-data-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function QueryResults({ query }: { query: string }) {
  const { columns, rows, status, error } = useQuery(query);

  if (status === "loading" || status === "idle") {
    return <div className="p-4 text-muted-foreground">Loading…</div>;
  }

  if (status === "error") {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  return <DataTable columns={columns} rows={rows} />;
}

export function N6KQuery({
  query: initialQuery = "",
  className,
}: {
  query?: string;
  className?: string;
}) {
  const [input, setInput] = useState(initialQuery);
  const [activeQuery, setActiveQuery] = useState("");

  const run = () => {
    const trimmed = input.trim();
    if (trimmed) setActiveQuery(trimmed);
  };

  return (
    <div className={className}>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run()}
          placeholder="SELECT * FROM db.demo"
          className="font-mono text-sm"
        />
        <Button onClick={run}>Run Query</Button>
      </div>
      {activeQuery && (
        <div className="mt-4">
          <QueryResults query={activeQuery} />
        </div>
      )}
    </div>
  );
}
