import { ExampleProviders } from "../providers";
import { N6KMetric } from "@/components/ui/n6k-metric";

export default function Metric01() {
  return (
    <ExampleProviders>
      <div className="grid grid-cols-3 gap-4 p-8">
        <N6KMetric label="Total Records" value="db.max_temp_2015" />
        <N6KMetric
          label="Avg Temp 2014"
          value="SELECT AVG(temp_max) FROM db.seattle_weather WHERE year(date) = 2014"
          valueFormat={(v) => `${Number(v).toFixed(1)}°`}
        />
        <N6KMetric
          label="Max precipitation"
          value="db.max_precip_2015"
          valueFormat={(v) => `${Number(v).toFixed(1)}mm`}
          delta="db.max_precip_delta"
          deltaFormat={(v) => `${Number(v).toFixed(1)}mm`}
        />
      </div>
    </ExampleProviders>
  );
}
