import { ExampleProviders } from "../providers";
import { VegaBarChart } from "@/components/ui/vega-bar-chart";

export default function BarChart01() {
  return (
    <ExampleProviders>
      <div className="p-8">
        <VegaBarChart
          data="db.precip_by_month"
          x="month"
          y="precipitation"
          hue="year"
        />
      </div>
    </ExampleProviders>
  );
}
