import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Calculate additional cost for leg size
export function calculateLegSizeCost(legSize?: string): number {
  if (legSize === '2x2') {
    return 1500;
  }
  if (legSize === '3x1.5') {
    return 3000;
  }
  return 0;
}

// Calculate front panel cost
export function calculateFrontPanelCost(frontPanelSize?: string, frontPanelLength?: number): number {
  if (!frontPanelSize || !frontPanelLength) return 0;
  
  const pricePerFt: Record<string, number> = {
    '6': 250,
    '12': 500,
    '16': 750,
    '24': 1000
  };
  
  return (pricePerFt[frontPanelSize] || 0) * frontPanelLength;
}

// Calculate total additional costs for a table
export function calculateTableAdditionalCosts(legSize?: string, frontPanelSize?: string, frontPanelLength?: number): number {
  return calculateLegSizeCost(legSize) + calculateFrontPanelCost(frontPanelSize, frontPanelLength);
}
