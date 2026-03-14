import { ExampleProviders } from "../providers";
import { RechartsLineChart } from "@/components/ui/recharts-line-chart";

export default function LineChart01() {
  return (
    <ExampleProviders>
      <div className="p-8">
        <RechartsLineChart
          data="db.seattle_weather"
          x="date"
          y="temp_max"
        />
      </div>
    </ExampleProviders>
  );
}
