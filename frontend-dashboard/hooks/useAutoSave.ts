import { useEffect, useRef } from "react";

export function useAutoSave(data: any, onSave: (data: any) => void, delay = 2000) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      onSave(data);
    }, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [data, onSave, delay]);
}