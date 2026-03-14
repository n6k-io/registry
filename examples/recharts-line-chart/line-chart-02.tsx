import { useState } from "react";
import { ExampleProviders } from "../providers";
import { Palette } from "@/components/ui/palette";
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

const PALETTES: Record<string, string[] | undefined> = {
  default: undefined,
  blues: ["#08519c", "#3182bd", "#6baed6", "#bdd7e7", "#eff3ff"],
  warm: ["#d73027", "#fc8d59", "#fee08b", "#d9ef8b", "#91cf60"],
  pastel: ["#b3cde3", "#ccebc5", "#decbe4", "#fed9a6", "#fbb4ae"],
};

export default function LineChart02() {
  const [x, setX] = useState("date");
  const [y, setY] = useState("temp_max");
  const [hue, setHue] = useState("__none");
  const [palette, setPalette] = useState("default");

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

        <Palette colors={PALETTES[palette]}>
          <RechartsLineChart
            data="db.seattle_weather"
            x={x}
            y={y}
            hue={hue === "__none" ? undefined : hue}
          />
        </Palette>
      </div>
    </ExampleProviders>
  );
}
