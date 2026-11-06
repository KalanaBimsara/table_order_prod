/** Sum scanned units, never the full quantities of the related orders. */
export const totalDispatchedUnits = (
  logs: readonly { operation_mode: string; quantity: number }[],
): number => logs.reduce((total, log) => {
  if (log.operation_mode.toLowerCase().includes('return')) return total;
  const quantity = Number(log.quantity);
  return total + (Number.isFinite(quantity) && quantity > 0 ? quantity : 0);
}, 0);

/** Pending units less gate-pass units dispatched in the selected range. */
export const unitsToManufacture = (
  pendingUnits: number,
  gatePassLogs: readonly { operation_mode: string; quantity: number }[],
): number => pendingUnits - totalDispatchedUnits(gatePassLogs);