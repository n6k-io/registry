import type { ReactNode } from "react";

export function Palette({
  colors,
  children,
}: {
  colors?: string[];
  children: ReactNode;
}) {
  if (!colors) return <>{children}</>;

  const style = Object.fromEntries(
    colors.map((c, i) => [`--chart-${i + 1}`, c]),
  ) as React.CSSProperties;

  return <div style={style}>{children}</div>;
}
