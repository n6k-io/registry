import { ExampleProviders } from "../providers";
import { RechartsBarChart } from "@/components/ui/recharts-bar-chart";
import { FieldSelector } from "@/components/ui/field-selector";

export default function BarChart02() {
  return (
    <ExampleProviders>
      <div className="p-8">
        <FieldSelector
          table="db.seattle_weather"
          charts={RechartsBarChart}
          defaultValues={{
            x: [{ expr: "month(date)" }],
            y: [{ expr: "sum(precipitation)" }],
            hue: [{ expr: "year(date)" }],
          }}
        />
      </div>
    </ExampleProviders>
  );
}
