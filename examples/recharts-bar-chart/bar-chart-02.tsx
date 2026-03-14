import { useState } from "react";
import { ExampleProviders } from "../providers";
import { Palette } from "@/components/ui/palette";
import { RechartsBarChart } from "@/components/ui/recharts-bar-chart";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const X_OPTIONS = [
  { label: "month(date)", value: "month(date)" },
  { label: "year(date)", value: "year(date)" },
  { label: "weather", value: "weather" },
];

const Y_OPTIONS = [
  { label: "sum(precipitation)", value: "sum(precipitation)" },
  { label: "avg(temp_max)", value: "avg(temp_max)" },
  { label: "avg(temp_min)", value: "avg(temp_min)" },
  { label: "avg(wind)", value: "avg(wind)" },
  { label: "count(*)", value: "count(*)" },
];

const HUE_OPTIONS = [
  { label: "None", value: "__none" },
  { label: "year(date)", value: "year(date)" },
  { label: "weather", value: "weather" },
];

const PALETTES: Record<string, string[] | undefined> = {
  default: undefined,
  blues: ["#08519c", "#3182bd", "#6baed6", "#bdd7e7", "#eff3ff"],
  warm: ["#d73027", "#fc8d59", "#fee08b", "#d9ef8b", "#91cf60"],
  pastel: ["#b3cde3", "#ccebc5", "#decbe4", "#fed9a6", "#fbb4ae"],
};

export default function BarChart02() {
  const [x, setX] = useState("month(date)");
  const [y, setY] = useState("sum(precipitation)");
  const [hue, setHue] = useState("year(date)");
  const [stacked, setStacked] = useState(false);
  const [palette, setPalette] = useState("default");

  return (
    <ExampleProviders>
      <div className="space-y-6 p-8">
        <div className="grid grid-cols-5 gap-4">
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
          <div className="flex items-end space-x-2 pb-2">
            <Checkbox
              id="stacked"
              checked={stacked}
              onCheckedChange={(v) => setStacked(v === true)}
            />
            <Label htmlFor="stacked">Stacked</Label>
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

        <Palette colors={PALETTES[palette]}>
          <RechartsBarChart
            data="db.seattle_weather"
            x={x}
            y={y}
            hue={hue === "__none" ? undefined : hue}
            stack={stacked}
          />
        </Palette>
      </div>
    </ExampleProviders>
  );
}
