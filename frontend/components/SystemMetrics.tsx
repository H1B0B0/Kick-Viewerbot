import { Card, CardBody, CardHeader } from "@heroui/card";
import { Progress } from "@heroui/progress";
import { Badge } from "@heroui/badge";
import { useEffect, useRef, useState } from "react";
import { useAnime } from "../hooks/useAnime";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
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
  const { animate } = useAnime();
  const [prevMetrics, setPrevMetrics] = useState(metrics);
  const cpuProgressRef = useRef<HTMLDivElement>(null);
  const memoryProgressRef = useRef<HTMLDivElement>(null);

  // Animate progress bars when values change
  useEffect(() => {
    if (metrics.cpu.value !== prevMetrics.cpu.value && cpuProgressRef.current) {
      const indicator = cpuProgressRef.current.querySelector(
        '[data-slot="indicator"]'
      );
      if (indicator instanceof HTMLElement) {
        try {
          animate(indicator, {
            scaleX: [0.95, 1],
            opacity: [0.6, 1],
            duration: 800,
            ease: "outQuad",
          });
        } catch (error) {
          console.warn("CPU progress animation failed:", error);
        }
      }
    }

    if (
      metrics.memory.value !== prevMetrics.memory.value &&
      memoryProgressRef.current
    ) {
      const indicator = memoryProgressRef.current.querySelector(
        '[data-slot="indicator"]'
      );
      if (indicator instanceof HTMLElement) {
        try {
          animate(indicator, {
            scaleX: [0.95, 1],
            opacity: [0.6, 1],
            duration: 800,
            ease: "outQuad",
          });
        } catch (error) {
          console.warn("Memory progress animation failed:", error);
        }
      }
    }

    setPrevMetrics(metrics);
  }, [metrics, prevMetrics, animate]);

  const renderBasicMetric = (
    metric: MetricData,
    progressRef?: React.RefObject<HTMLDivElement | null>
  ) => (
    <Card key={metric.label} className="border-none glass-card">
      <CardBody className="space-y-4 p-6 flex flex-col justify-between h-full relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-5">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern
                id="microGrid"
                width="10"
                height="10"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 10 0 L 0 0 0 10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="0.5"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#microGrid)" />
          </svg>
        </div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium">{metric.label}</span>
          <Badge>
            {metric.value.toFixed(1)}
            {metric.unit}
          </Badge>
        </div>
        <div ref={progressRef as any}>
          <Progress
            aria-label={`${metric.label} usage`}
            value={(metric.value / metric.maxValue) * 100}
            color={
              (metric.value / metric.maxValue) * 100 < 30
                ? "success"
                : (metric.value / metric.maxValue) * 100 < 70
                  ? "warning"
                  : "danger"
            }
            className="mb-3"
          />
        </div>
      </CardBody>
    </Card>
  );

  const renderNetworkMetric = () => (
    <Card className="border-none glass-card">
      <CardBody className="space-y-4 p-6 flex flex-col justify-between h-full relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-5">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern
                id="microGrid"
                width="10"
                height="10"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 10 0 L 0 0 0 10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="0.5"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#microGrid)" />
          </svg>
        </div>
        <span className="text-sm font-medium block mb-3">Network Traffic</span>
        <div className="grid grid-cols-2 gap-4">
          <Card className="border-none glass-card">
            <CardBody className="p-3">
              <div className="absolute inset-0 pointer-events-none opacity-5">
                <svg
                  width="100%"
                  height="100%"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <pattern
                      id="microGrid"
                      width="10"
                      height="10"
                      patternUnits="userSpaceOnUse"
                    >
                      <path
                        d="M 10 0 L 0 0 0 10"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="0.5"
                      />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#microGrid)" />
                </svg>
              </div>
              <div className="flex justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-green-400 text-lg">↑</span>
                  <span className="text-xs font-medium">Upload</span>
                </div>
                <Badge variant="flat" className="text-xs">
                  {metrics.network_up.value.toFixed(1)}
                  {metrics.network_up.unit}
                </Badge>
              </div>
            </CardBody>
          </Card>

          <Card className="border-none glass-card">
            <CardBody className="p-3">
              <div className="absolute inset-0 pointer-events-none opacity-5">
                <svg
                  width="100%"
                  height="100%"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <pattern
                      id="microGrid"
                      width="10"
                      height="10"
                      patternUnits="userSpaceOnUse"
                    >
                      <path
                        d="M 10 0 L 0 0 0 10"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="0.5"
                      />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#microGrid)" />
                </svg>
              </div>
              <div className="flex justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-lime-400 text-lg">↓</span>
                  <span className="text-xs font-medium">Download</span>
                </div>
                <Badge variant="flat" className="text-xs">
                  {metrics.network_down.value.toFixed(1)}
                  {metrics.network_down.unit}
                </Badge>
              </div>
            </CardBody>
          </Card>
        </div>
      </CardBody>
    </Card>
  );

  return (
    <>
      <CardHeader className="pb-2 px-6 pt-6">
        <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
          <span className="w-2 h-8 bg-green-500 rounded-full"></span>
          System Metrics
        </h2>
      </CardHeader>
      <CardBody className="px-6 pb-6 pt-2">
        <div className="space-y-4">
          {renderBasicMetric(metrics.cpu, cpuProgressRef)}
          {renderBasicMetric(metrics.memory, memoryProgressRef)}
          {renderNetworkMetric()}
        </div>
      </CardBody>
    </>
  );
};
