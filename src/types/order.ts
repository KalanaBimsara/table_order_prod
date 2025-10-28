export type TableItem = {
  id: string,
  size: string,
  topColour: string,
  frameColour: string, 
  colour: string,  // Keeping for backward compatibility
  quantity: number,
  price: number,
  // Customization fields
  legSize?: '1.5x1.5' | '3x1.5',
  legShape?: 'O Shape' | 'U shape',
  legHeight?: string,
  wireHoles?: 'no wire holes' | 'normal' | 'special',
  wireHolesComment?: string,
  frontPanelSize?: '6' | '12' | '16' | '24',
  frontPanelLength?: number
};

export type OrderStatus = 'pending' | 'assigned' | 'completed';

export type UserRole = 'admin' | 'delivery' | 'customer' | 'manager';

export type DeliveryStatus = 'pending' | 'ready';

export type Order = {
  id: string,
  order_form_number?: string,
  customerName: string,
  address: string,
  contactNumber: string,
  tables: TableItem[],
  note?: string,
  status: OrderStatus,
  createdAt: Date,
  completedAt?: Date,
  totalPrice: number,
  deliveryFee?: number,
  additionalCharges?: number,
  deliveryDate?: string,
  assignedTo?: string,
  delivery_person_id?: string,  // Added to match database column name
  createdBy?: string,
  salesPersonName?: string,  // Added for sales person tracking
  deliveryStatus?: DeliveryStatus,  // Added for delivery status tracking
  orderFormNumber?: string  // Added for order form number
};

export const tableSizeOptions = [
  // Standard Tables - increased by 500 except 24x48 and 24x60
  { value: '24x32', label: '24x32 Table', price: 11000 },
  { value: '24x36', label: '24x36 Table', price: 12000 },
  { value: '24x48', label: '24x48 Table', price: 13500 }, 
  { value: '24x60', label: '24x60 Table', price: 15000 }, 
  { value: '24x72', label: '24x72 Table', price: 20000 },
  { value: '24x84', label: '24x84 Table', price: 22500 },
  { value: '24x96', label: '24x96 Table', price: 22500 },

    // Medium Tables - increased by 500
  { value: '30x48', label: '30x48 Table', price: 22500 },
  { value: '36x48', label: '36x48 Table', price: 22500 },
  { value: '48x48', label: '48x48 Table', price: 22500 },

  // Large Tables - increased by 500
  { value: '30x60', label: '30x60 Table', price: 26500 },
  { value: '36x60', label: '36x60 Table', price: 26500 },
  { value: '48x60', label: '48x60 Table', price: 26500 },

  // Extra Large Tables - increased by 500
  { value: '30x72', label: '30x72 Table', price: 34500 },
  { value: '36x72', label: '36x72 Table', price: 34500 },
  { value: '48x72', label: '48x72 Table', price: 34500 },

  // Jumbo Tables - increased by 500
  { value: '30x84', label: '30x84 Table', price: 39500 },
  { value: '36x84', label: '36x84 Table', price: 39500 },
  { value: '48x84', label: '48x84 Table', price: 39500 },
  { value: '30x96', label: '30x96 Table', price: 39500 },
  { value: '36x96', label: '36x96 Table', price: 39500 },
  { value: '48x96', label: '48x96 Table', price: 39500 },

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
  '30x72': 29250,
  '36x72': 29250,
  '48x72': 29250,
  
  // Jumbo sizes
  '30x84': 37000,
  '36x84': 37000,
  '48x84': 37000,
  '30x96': 37000,
  '36x96': 37000,
  '48x96': 37000,

  //dinning table
  '36x36': 9500,
  '60x36': 11500,
  
  // L-Shaped tables
  'l-A': 18500,
  'l-B': 19000,
  'l-C': 19500,
  'l-D': 21500,
  'l-E': 20500,
  'l-F': 21000,
  'l-G': 21500,
  'l-H': 23500
};

// Helper function to get factory price for a table size
export const getFactoryPrice = (tableSize: string): number => {
  return factoryPriceMap[tableSize] || 0;
};

// Helper function to calculate profit for an order
export const calculateOrderProfit = (salesPrice: number, tableSize: string, quantity: number): number => {
  const factoryPrice = getFactoryPrice(tableSize);
  return (salesPrice - factoryPrice) * quantity;
};
