import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { apis } from "@/apis";
import {
  PaymentReconciliation,
  PaymentReconciliationStatus,
} from "@/types/payment_reconciliation";

export type UsePaymentReconciliationStatusOptions = {
  fastIntervalMs?: number;
  slowIntervalMs?: number;
  fastWindowMs?: number;
  // Hard cap on polling. Backend gives up polling Plutus at ~6 min, so this
  // should always be a little higher to catch the final settle.
  maxWaitMs?: number;
  enabled?: boolean;
  onSettled?: (pr: PaymentReconciliation) => void;
  onTimeout?: () => void;
};

const TERMINAL_STATUSES = new Set<PaymentReconciliationStatus>([
  PaymentReconciliationStatus.completed,
  PaymentReconciliationStatus.cancelled,
  PaymentReconciliationStatus.failed,
  PaymentReconciliationStatus.partial,
  PaymentReconciliationStatus.timeout,
]);

const isTerminalStatus = (status?: PaymentReconciliationStatus): boolean =>
  status !== undefined && TERMINAL_STATUSES.has(status);

export function usePaymentReconciliationStatus(
  paymentReconciliationId: string | null | undefined,
  options: UsePaymentReconciliationStatusOptions = {}
) {
  const {
    fastIntervalMs = 3000,
    slowIntervalMs = 5000,
    fastWindowMs = 30_000,
    maxWaitMs = 7 * 60 * 1000,
    enabled = true,
    onSettled,
    onTimeout,
  } = options;

  const queryClient = useQueryClient();

  const [pr, setPr] = useState<PaymentReconciliation | null>(null);
  const [error, setError] = useState<unknown | null>(null);
  const [isTimedOut, setIsTimedOut] = useState(false);
  const [isPolling, setIsPolling] = useState(false);

  // Keep callbacks in refs so changing closures don't restart the polling loop.
  const onSettledRef = useRef(onSettled);
  const onTimeoutRef = useRef(onTimeout);
  useEffect(() => {
    onSettledRef.current = onSettled;
    onTimeoutRef.current = onTimeout;
  }, [onSettled, onTimeout]);

  const cancelledRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastStatusRef = useRef<PaymentReconciliationStatus | undefined>(undefined);

  const stop = useCallback(() => {
    cancelledRef.current = true;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsPolling(false);
  }, []);

  useEffect(() => {
    if (!paymentReconciliationId || !enabled) {
      setPr(null);
      setError(null);
      setIsTimedOut(false);
      setIsPolling(false);
      return;
    }

    cancelledRef.current = false;
    lastStatusRef.current = undefined;
    const startedAt = Date.now();
    setIsPolling(true);
    setError(null);
    setIsTimedOut(false);
    setPr(null);

    const tick = async () => {
      if (cancelledRef.current) return;

      try {
        const data = await apis.gateway.transaction_status({
          payment_reconciliation: paymentReconciliationId,
        });
        if (cancelledRef.current) return;

        setPr(data);

        if (data.status !== lastStatusRef.current) {
          lastStatusRef.current = data.status;
          queryClient.invalidateQueries({
            queryKey: ["payment_reconciliations"],
          });
        }

        if (isTerminalStatus(data.status)) {
          setIsPolling(false);
          onSettledRef.current?.(data);
          return;
        }
      } catch (e) {
        if (cancelledRef.current) return;
        // Don't abort on transient errors — the celery worker keeps updating
        // the PR even if a single status request fails.
        setError(e);
      }

      const elapsed = Date.now() - startedAt;
      if (elapsed >= maxWaitMs) {
        setIsTimedOut(true);
        setIsPolling(false);
        onTimeoutRef.current?.();
        return;
      }

      const nextInterval =
        elapsed < fastWindowMs ? fastIntervalMs : slowIntervalMs;
      timerRef.current = setTimeout(tick, nextInterval);
    };

    tick();

    return () => {
      cancelledRef.current = true;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [
    paymentReconciliationId,
    enabled,
    fastIntervalMs,
    slowIntervalMs,
    fastWindowMs,
    maxWaitMs,
  ]);

  const isTerminal = isTerminalStatus(pr?.status);

  return {
    pr,
    error,
    isPolling,
    isTimedOut,
    isTerminal,
    stop,
  };
}
