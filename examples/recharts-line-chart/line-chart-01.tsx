import { useState } from "react";
import { ExampleProviders } from "../providers";
import { RechartsLineChart } from "@/components/ui/recharts-line-chart";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const X_OPTIONS = [{ label: "date", value: "date" }];

const Y_OPTIONS = [
  { label: "temp_max", value: "temp_max" },
  { label: "temp_min", value: "temp_min" },
  { label: "wind", value: "wind" },
  { label: "precipitation", value: "precipitation" },
];

const HUE_OPTIONS = [
  { label: "None", value: "__none" },
  { label: "weather", value: "weather" },
];

const PALETTES: Record<string, string[]> = {
  default: [
    "oklch(0.646 0.222 41.116)",
    "oklch(0.6 0.118 184.704)",
    "oklch(0.398 0.07 227.392)",
    "oklch(0.828 0.189 84.429)",
    "oklch(0.769 0.188 70.08)",
  ],
  blues: ["#08519c", "#3182bd", "#6baed6", "#bdd7e7", "#eff3ff"],
  warm: ["#d73027", "#fc8d59", "#fee08b", "#d9ef8b", "#91cf60"],
  pastel: ["#b3cde3", "#ccebc5", "#decbe4", "#fed9a6", "#fbb4ae"],
};

export default function LineChart01() {
  const [x, setX] = useState("date");
  const [y, setY] = useState("temp_max");
  const [hue, setHue] = useState("__none");
  const [palette, setPalette] = useState("default");

  const colors = PALETTES[palette] ?? PALETTES["default"]!;

  const chartVars = Object.fromEntries(
    colors.map((c, i) => [`--chart-${i + 1}`, c]),
  ) as React.CSSProperties;

  return (
    <ExampleProviders>
      <div className="space-y-6 p-8">
        <div className="grid grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>X Axis</Label>
            <Select value={x} onValueChange={setX}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {X_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Y Axis</Label>
            <Select value={y} onValueChange={setY}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Y_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Hue</Label>
            <Select value={hue} onValueChange={setHue}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HUE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Palette</Label>
            <Select value={palette} onValueChange={setPalette}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(PALETTES).map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div style={chartVars}>
          <RechartsLineChart
            data="db.seattle_weather"
            x={x}
            y={y}
            hue={hue === "__none" ? undefined : hue}
          />
        </div>
      </div>
    </ExampleProviders>
  );
}
