import { ExampleProviders } from "../providers";
import { RechartsBarChart } from "@/components/ui/recharts-bar-chart";

export default function BarChart01() {
  return (
    <ExampleProviders>
      <div className="p-8">
        <RechartsBarChart
          data="db.seattle_weather"
          x="month(date)"
          y="sum(precipitation)"
          hue="year(date)"
        />
      </div>
    </ExampleProviders>
  );
}
