import { useState, useEffect, type ComponentType } from "react";

const allExamples = import.meta.glob<{ default: ComponentType }>(
  "../../examples/**/*.tsx",
);

export function ExampleRenderer({ examplePath }: { examplePath: string }) {
  const [Component, setComponent] = useState<ComponentType | null>(null);

  useEffect(() => {
    const loader = allExamples[examplePath];
    if (loader) {
      loader().then((mod) => setComponent(() => mod.default));
    }
  }, [examplePath]);

  if (!Component) {
    return (
      <div className="p-8 text-sm text-neutral-400 dark:text-neutral-600">
        Loading...
      </div>
    );
  }

  return <Component />;
}
