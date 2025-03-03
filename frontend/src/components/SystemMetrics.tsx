import { Card, CardBody } from "@heroui/react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface MetricData {
  label: string;
  value: number;
  color: string;
  unit: string;
  history: number[];
  maxValue: number;
}

interface SystemMetricsProps {
  metrics: {
    cpu: MetricData;
    memory: MetricData;
    network_up: MetricData;
    network_down: MetricData;
  };
}

export const SystemMetrics = ({ metrics }: SystemMetricsProps) => {
  const chartOptions = (maxValue: number, showLegend: boolean = false) => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 0 },
    plugins: {
      legend: {
        display: showLegend,
        position: "top" as const,
        align: "end" as const,
        labels: {
          boxWidth: 8,
          usePointStyle: true,
        },
      },
      tooltip: {
        enabled: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: maxValue,
      },
    },
    elements: {
      point: {
        radius: 0,
      },
      line: {
        tension: 0.4,
      },
    },
  });

  const getChartData = (metric: MetricData) => ({
    labels: Array(metric.history.length).fill(""),
    datasets: [
      {
        label: metric.label,
        data: metric.history,
        borderColor: metric.color,
        tension: 0.4,
        fill: false,
      },
    ],
  });

  const renderBasicMetric = (metric: MetricData) => (
    <div key={metric.label} className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium">{metric.label}</span>
        <span className="text-sm text-gray-500">
          {metric.value.toFixed(1)}
          {metric.unit}
        </span>
      </div>
      <div className="h-[100px]">
        <Line
          options={chartOptions(metric.maxValue)}
          data={getChartData(metric)}
        />
      </div>
    </div>
  );

  const renderNetworkMetric = () => (
    <div className="space-y-2">
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Network Traffic</span>
        <div className="flex justify-between items-center p-3 rounded-lg">
          <div className="flex gap-2 items-center">
            <span className="text-purple-600">↑</span>
            <span className="text-sm font-medium">Upload</span>
          </div>
          <span className="text-sm">
            {metrics.network_up.value.toFixed(1)}
            {metrics.network_up.unit}
          </span>
        </div>
        <div className="flex justify-between items-center p-3 rounded-lg">
          <div className="flex gap-2 items-center">
            <span className="text-red-500">↓</span>
            <span className="text-sm font-medium">Download</span>
          </div>
          <span className="text-sm">
            {metrics.network_down.value.toFixed(1)}
            {metrics.network_down.unit}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <Card className="w-full border-none bg-background/90 backdrop-blur-xl shadow-xl hover:shadow-2xl transition-all duration-300">
      <CardBody>
        <h3 className="text-2xl font-semibold mb-4 bg-gradient-to-r from-green-600 to-green-400 bg-clip-text text-transparent">
          System Metrics
        </h3>
        <div className="space-y-4">
          {renderBasicMetric(metrics.cpu)}
          {renderBasicMetric(metrics.memory)}
          <div className="border-t pt-4">{renderNetworkMetric()}</div>
        </div>
      </CardBody>
    </Card>
  );
};
