import { ExampleProviders } from "../providers";
import { RechartsBarChart } from "@/components/ui/recharts-bar-chart";

export default function BarChart01() {
  return (
    <ExampleProviders>
      <div className="p-8">
        <RechartsBarChart
          data="db.precip_by_month"
          x="month"
          y="precipitation"
          hue="year"
        />
      </div>
    </ExampleProviders>
  );
}
