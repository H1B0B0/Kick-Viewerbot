import { Card, CardBody, CardHeader } from "@heroui/card";
import { Progress } from "@heroui/progress";
import { Badge } from "@heroui/badge";
import { useEffect, useState } from "react";
import { LuCpu, LuMemoryStick, LuActivity } from "react-icons/lu";

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
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    setIsUpdating(true);
    const timer = setTimeout(() => setIsUpdating(false), 500);
    return () => clearTimeout(timer);
  }, [metrics]);

  const getProgressColor = (value: number, max: number) => {
    const percentage = (value / max) * 100;
    if (percentage < 40) return "success";
    if (percentage < 75) return "warning";
    return "danger";
  };

  const renderMetric = (metric: MetricData, icon: React.ReactNode) => (
    <Card key={metric.label} isBlurred shadow="sm" className="border-none">
      <CardBody className="p-6 flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 text-default-400">
            {icon}
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">{metric.label}</span>
          </div>
          <Badge
            color={getProgressColor(metric.value, metric.maxValue)}
            variant="flat"
            size="sm"
            className="font-black font-mono"
          >
            {metric.value.toFixed(1)}{metric.unit}
          </Badge>
        </div>
        <Progress
          aria-label={`${metric.label} usage`}
          value={(metric.value / metric.maxValue) * 100}
          color={getProgressColor(metric.value, metric.maxValue)}
          size="sm"
          radius="full"
          className="transition-all duration-500"
        />
      </CardBody>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 px-2">
        <div className="w-1.5 h-6 bg-primary rounded-full"></div>
        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-default-500">Node Performance</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {renderMetric(metrics.cpu, <LuCpu className="w-4 h-4 text-primary" />)}
        {renderMetric(metrics.memory, <LuMemoryStick className="w-4 h-4 text-primary" />)}
      </div>

      <Card isBlurred shadow="sm" className="border-none">
        <CardBody className="p-6">
          <div className="flex items-center gap-2 text-default-400 mb-6">
            <LuActivity className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Network Throughput</span>
          </div>
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-[10px] font-black text-default-400 uppercase tracking-widest">Upload</span>
                <span className="text-lg font-black text-success font-mono">
                  {metrics.network_up.value.toFixed(1)} <span className="text-[10px]">{metrics.network_up.unit}</span>
                </span>
              </div>
              <Progress value={Math.min(100, (metrics.network_up.value / 10) * 100)} size="sm" color="success" radius="full" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-[10px] font-black text-default-400 uppercase tracking-widest">Download</span>
                <span className="text-lg font-black text-success font-mono">
                  {metrics.network_down.value.toFixed(1)} <span className="text-[10px]">{metrics.network_down.unit}</span>
                </span>
              </div>
              <Progress value={Math.min(100, (metrics.network_down.value / 50) * 100)} size="sm" color="success" radius="full" />
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};
