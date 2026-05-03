export type TableItem = {
  id: string,
  size: string,
  topColour: string,
  frameColour: string, 
  colour: string,  // Keeping for backward compatibility
  quantity: number,
  price: number,
  // Customization fields
  legSize?: '1.5x1.5' | '2x2' | '3x1.5',
  legShape?: 'O Shape' | 'U shape',
  legHeight?: string,
  wireHoles?: 'no wire holes' | 'normal' | 'special',
  wireHolesComment?: string,
  frontPanelSize?: '6' | '12' | '16' | '24',
  frontPanelLength?: number,
  lShapeOrientation?: 'normal' | 'reverse'
};

export type OrderStatus = 'pending' | 'assigned' | 'completed';

export type UserRole = 'admin' | 'delivery' | 'customer' | 'manager';

export type DeliveryStatus = 'pending' | 'ready';

export type Order = {
  id: string,
  order_form_number?: string,
  customerName: string,
  customerDistrict?: string,  // Added for district selection
  address: string,
  contactNumber: string,
  whatsappNumber?: string,  // Added for WhatsApp contact
  tables: TableItem[],
  note?: string,
  status: OrderStatus,
  createdAt: Date,
  completedAt?: Date,
  totalPrice: number,
  deliveryFee?: number,
  additionalCharges?: number,
  deliveryDate?: string,
  deliveryType?: 'courier' | 'non-courier',  // Added for delivery type
  assignedTo?: string,
  delivery_person_id?: string,  // Added to match database column name
  createdBy?: string,
  salesPersonName?: string,  // Added for sales person tracking
  deliveryStatus?: DeliveryStatus,  // Added for delivery status tracking
  orderFormNumber?: string  // Added for order form number
};

export const tableSizeOptions = [
  // Standard Tables
  { value: '24x32', label: '24x32 Table', price: 11000 },
  { value: '24x36', label: '24x36 Table', price: 12000 },
  { value: '24x48', label: '24x48 Table', price: 13500 }, 
  { value: '24x60', label: '24x60 Table', price: 15000 }, 
  { value: '24x72', label: '24x72 Table', price: 20000 },
  { value: '24x84', label: '24x84 Table', price: 22500 },
  { value: '24x96', label: '24x96 Table', price: 22500 },

  // Dining Tables
  { value: 'DS (36x36)', label: '36x36 Dinning', price: 14500 },
  { value: 'DL (60x36)', label: '60x36 Dinning', price: 16500 },

  // L-Shaped Tables - increased by 1000
  { value: 'L-A', label: 'L-Shaped Table (Size A)', price: 23000 },
  { value: 'L-B', label: 'L-Shaped Table (Size B)', price: 24000 },
  { value: 'L-C', label: 'L-Shaped Table (Size C)', price: 24000 },
  { value: 'L-D', label: 'L-Shaped Table (Size D)', price: 26000 },
  { value: 'L-E', label: 'L-Shaped Table (Size E)', price: 25000 },
  { value: 'L-F', label: 'L-Shaped Table (Size F)', price: 26000 },
  { value: 'L-G', label: 'L-Shaped Table (Size G)', price: 26000 },
  { value: 'L-H', label: 'L-Shaped Table (Size H)', price: 28000 }
];

export const colourOptions = [
  { value: 'white', label: 'White' },
  { value: 'black', label: 'Black' },
  { value: 'ash_white', label: 'American Ash White' },
  { value: 'teak', label: 'Jungle Teak' }
];

// Factory price mapping based on the provided chart
export const factoryPriceMap: Record<string, number> = {
  // Standard sizes
  '24x32': 8250,
  '24x36': 8750,
  '24x48': 9250,
  '24x60': 11250,
  '24x72': 15250,
  '24x84': 18500,
  '24x96': 18500,
  
  // Medium sizes
  '30x48': 18500,
  '36x48': 18500,
  '48x48': 18500,
  
  // Large sizes
  '30x60': 22500,
  '36x60': 22500,
  '48x60': 22500,
  
  // Extra large sizes
  '30x72': 30500,
  '36x72': 30500,
  '48x72': 30500,
  
  // Jumbo sizes
  '30x84': 37000,
  '36x84': 37000,
  '48x84': 37000,
  '30x96': 37000,
  '36x96': 37000,
  '48x96': 37000,

  // Dining tables - both formats supported
  '36x36': 9500,
  '60x36': 11500,
  'DS (36x36)': 9500,
  'DL (60x36)': 11500,
  
  // L-Shaped tables - both uppercase and lowercase
  'L-A': 18500,
  'L-B': 19000,
  'L-C': 19500,
  'L-D': 21500,
  'L-E': 20500,
  'L-F': 21000,
  'L-G': 21500,
  'L-H': 23500
};

// Standard sizes sorted by area (width * depth) for custom size matching
const standardSizes = [
  { size: '24x32', width: 24, depth: 32, price: 8250 },
  { size: '24x36', width: 24, depth: 36, price: 8750 },
  { size: '24x48', width: 24, depth: 48, price: 9250 },
  { size: '36x36', width: 36, depth: 36, price: 9500 },  // Dining
  { size: '24x60', width: 24, depth: 60, price: 11250 },
  { size: '60x36', width: 60, depth: 36, price: 11500 }, // Dining
  { size: '24x72', width: 24, depth: 72, price: 15250 },
  { size: '24x84', width: 24, depth: 84, price: 18500 },
  { size: '24x96', width: 24, depth: 96, price: 18500 },
  { size: '30x48', width: 30, depth: 48, price: 18500 },
  { size: '36x48', width: 36, depth: 48, price: 18500 },
  { size: '48x48', width: 48, depth: 48, price: 18500 },
  { size: '30x60', width: 30, depth: 60, price: 22500 },
  { size: '36x60', width: 36, depth: 60, price: 22500 },
  { size: '48x60', width: 48, depth: 60, price: 22500 },
  { size: '30x72', width: 30, depth: 72, price: 30500 },
  { size: '36x72', width: 36, depth: 72, price: 30500 },
  { size: '48x72', width: 48, depth: 72, price: 30500 },
  { size: '30x84', width: 30, depth: 84, price: 37000 },
  { size: '36x84', width: 36, depth: 84, price: 37000 },
  { size: '48x84', width: 48, depth: 84, price: 37000 },
  { size: '30x96', width: 30, depth: 96, price: 37000 },
  { size: '36x96', width: 36, depth: 96, price: 37000 },
  { size: '48x96', width: 48, depth: 96, price: 37000 },
];

// Check if a size is custom (not in standard sizes)
export const isCustomSize = (tableSize: string): boolean => {
  // Skip L-shaped and dining tables from custom size check
  if (tableSize.startsWith('L-') || tableSize.startsWith('l-') || 
      tableSize.startsWith('DS') || tableSize.startsWith('DL')) {
    return false;
  }
  return !factoryPriceMap[tableSize];
};

// Parse dimensions from size string (e.g., "48x18" -> { width: 48, depth: 18 })
export const parseDimensions = (size: string): { width: number; depth: number } | null => {
  const match = size.match(/(\d+)\s*x\s*(\d+)/i);
  if (match) {
    return { width: parseInt(match[1]), depth: parseInt(match[2]) };
  }
  return null;
};

// Find the next standard size that can accommodate a custom size
// Returns the standard size info with extra charge flag
export const getNextStandardSize = (customSize: string): { size: string; price: number; isCustom: boolean } | null => {
  const dims = parseDimensions(customSize);
  if (!dims) return null;

  // Find the smallest standard size that can fit both dimensions
  // We need width >= custom width AND depth >= custom depth
  for (const std of standardSizes) {
    // Check if standard size can accommodate the custom size
    // Consider both orientations (wxd or dxw)
    const canFit = (std.width >= dims.width && std.depth >= dims.depth) ||
                   (std.width >= dims.depth && std.depth >= dims.width);
    if (canFit) {
      return { size: std.size, price: std.price, isCustom: true };
    }
  }

  // If no standard size fits, use the largest available
  const largest = standardSizes[standardSizes.length - 1];
  return { size: largest.size, price: largest.price, isCustom: true };
};

// Helper function to get factory price for a table size
// For custom sizes, returns the next standard size price + 1000 LKR
export const getFactoryPrice = (tableSize: string): number => {
  // Direct lookup first
  const directPrice = factoryPriceMap[tableSize];
  if (directPrice) return directPrice;

  // Check if it's a custom size that needs to be billed to next standard
  if (isCustomSize(tableSize)) {
    const nextStd = getNextStandardSize(tableSize);
    if (nextStd) {
      return nextStd.price + 1000; // Standard size price + 1000 LKR custom charge
    }
  }

  return 0;
};

// Check if a size requires custom size extra charge
export const requiresCustomSizeCharge = (tableSize: string): boolean => {
  return isCustomSize(tableSize) && getNextStandardSize(tableSize) !== null;
};

// Calculate additional cost for leg size
export const calculateLegSizeCost = (legSize?: string): number => {
  if (legSize === '2x2') return 1500;
  if (legSize === '3x1.5') return 3000;
  return 0;
};

// Calculate profit for an order
export const calculateOrderProfit = (salesPrice: number, tableSize: string, quantity: number): number => {
  const factoryPrice = getFactoryPrice(tableSize);
  return (salesPrice - factoryPrice) * quantity;
};
