import { ExampleProviders } from "../providers";
import { RechartsBarChart } from "@/components/ui/recharts-bar-chart";
import { RechartsLineChart } from "@/components/ui/recharts-line-chart";
import { FieldSelector } from "@/components/ui/field-selector";

export default function FieldSelector01() {
  return (
    <ExampleProviders>
      <div className="p-8">
        <FieldSelector
          table="db.seattle_weather"
          charts={[RechartsBarChart, RechartsLineChart]}
          defaultValues={{
            x: [{ expr: "month(date)" }],
            y: [{ expr: "avg(temp_max)" }],
            hue: [],
          }}
        />
      </div>
    </ExampleProviders>
  );
}
