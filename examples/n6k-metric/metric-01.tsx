import { ExampleProviders } from "../providers";
import { N6KMetric } from "@/components/ui/n6k-metric";

export default function Metric01() {
  return (
    <ExampleProviders>
      <div className="p-8 grid grid-cols-3 gap-4">
        <N6KMetric
          label="Total Records"
          value="SELECT COUNT(*)::TEXT FROM db.demo"
        />
        <N6KMetric
          label="Avg Value"
          value="SELECT ROUND(AVG(value), 2)::TEXT FROM db.demo"
        />
        <N6KMetric
          label="Categories"
          value="SELECT COUNT(DISTINCT category)::TEXT FROM db.demo"
        />
      </div>
    </ExampleProviders>
  );
}
