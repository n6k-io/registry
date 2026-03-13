import { ExampleProviders } from "../providers";
import { N6KBarChart } from "@/components/ui/n6k-bar-chart";

export default function BarChart01() {
  return (
    <ExampleProviders>
      <div className="p-8">
        <N6KBarChart
          query="SELECT * FROM db.precip_by_month"
          x="month"
          y="precipitation"
          hue="year"
          stack={true}
          xTitle="date"
          yTitle="precipitation (mm)"
          legend="bottom"
        />
      </div>
    </ExampleProviders>
  );
}
