import { useState, useEffect } from "react";

export function useViewerCache(currentValue: number) {
  const [values, setValues] = useState<number[]>([]);
  const cacheSize = 10; // Garde les 10 dernières valeurs

  useEffect(() => {
    if (currentValue > 0) {
      setValues((prev) => {
        const newValues = [...prev, currentValue];
        return newValues.slice(-cacheSize);
      });
    }
  }, [currentValue]);

  const getPreviousValue = () => {
    if (values.length < 2) return currentValue;
    return values[values.length - 2];
  };

  const getPercentageChange = () => {
    const previousValue = getPreviousValue();
    if (previousValue === 0) return 0;
    return ((currentValue - previousValue) / previousValue) * 100;
  };

  return {
    previousValue: getPreviousValue(),
    percentageChange: getPercentageChange(),
    values,
  };
}
