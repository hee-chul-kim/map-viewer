import { useCallback, useRef, useEffect } from 'react';

export function useThrottle<T extends (...args: any[]) => void>(callback: T, delay: number): T {
  const lastRun = useRef(Date.now());
  const lastArgs = useRef<Parameters<T> | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      lastArgs.current = args;

      if (now - lastRun.current >= delay) {
        // 딜레이가 지났으면 바로 실행
        callback(...args);
        lastRun.current = now;
        lastArgs.current = null;

        // 이전에 예약된 타이머가 있다면 취소
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      } else {
        // 이전에 예약된 타이머가 있다면 취소
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        // 새로운 타이머 예약
        const remainingTime = delay - (now - lastRun.current);
        timeoutRef.current = setTimeout(() => {
          if (lastArgs.current) {
            callback(...lastArgs.current);
            lastRun.current = Date.now();
            lastArgs.current = null;
          }
          timeoutRef.current = null;
        }, remainingTime);
      }
    },
    [callback, delay]
  ) as T;
}
