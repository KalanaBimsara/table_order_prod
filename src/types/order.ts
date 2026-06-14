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
  // Standard Tables - increased by 500 except 24x48 and 24x60
  { value: '24x32', label: '24x32 Table', price: 11500 },
  { value: '24x36', label: '24x36 Table', price: 12500 },
  { value: '24x48', label: '24x48 Table', price: 13500 },
  { value: '24x60', label: '24x60 Table', price: 15500 },
  { value: '24x72', label: '24x72 Table', price: 20500 },
  { value: '24x84', label: '24x84 Table', price: 23000 },
  { value: '24x96', label: '24x96 Table', price: 23000 },

  // Medium Tables - increased by 500
  { value: '30x48', label: '30x48 Table', price: 24000 },
  { value: '36x48', label: '36x48 Table', price: 24000 },
  { value: '48x48', label: '48x48 Table', price: 24000 },

  // Large Tables - increased by 500
  { value: '30x60', label: '30x60 Table', price: 28000 },
  { value: '36x60', label: '36x60 Table', price: 28000 },
  { value: '48x60', label: '48x60 Table', price: 28000 },

  // Extra Large Tables - increased by 500
  { value: '30x72', label: '30x72 Table', price: 36000 },
  { value: '36x72', label: '36x72 Table', price: 36000 },
  { value: '48x72', label: '48x72 Table', price: 36000 },

  // Jumbo Tables - increased by 500
  { value: '30x84', label: '30x84 Table', price: 43000 },
  { value: '36x84', label: '36x84 Table', price: 43000 },
  { value: '48x84', label: '48x84 Table', price: 43000 },
  { value: '30x96', label: '30x96 Table', price: 43000 },
  { value: '36x96', label: '36x96 Table', price: 43000 },
  { value: '48x96', label: '48x96 Table', price: 43000 },

  // Dining Tables
  { value: 'DM(48x30)', label: '48x30 Dinning', price: 16500 },
  { value: 'DS (36x36)', label: '36x36 Dinning', price: 15000 },
  { value: 'DL (60x36)', label: '60x36 Dinning', price: 17000 },

  // L-Shaped Tables - increased by 1000
  { value: 'L-A', label: 'L-Shaped Table (Size A)', price: 25000 },
  { value: 'L-B', label: 'L-Shaped Table (Size B)', price: 25000 },
  { value: 'L-C', label: 'L-Shaped Table (Size C)', price: 25000 },
  { value: 'L-D', label: 'L-Shaped Table (Size D)', price: 27000 },
  { value: 'L-E', label: 'L-Shaped Table (Size E)', price: 26000 },
  { value: 'L-F', label: 'L-Shaped Table (Size F)', price: 27000 },
  { value: 'L-G', label: 'L-Shaped Table (Size G)', price: 27000 },
  { value: 'L-H', label: 'L-Shaped Table (Size H)', price: 29000 }
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
  '24x32': 8500,
  '24x36': 9000,
  '24x48': 9500,
  '24x60': 11500,
  '24x72': 15500,
  '24x84': 19000,
  '24x96': 19000,

  // Medium sizes
  '30x48': 19000,
  '36x48': 19000,
  '48x48': 19000,

  // Large sizes
  '30x60': 23000,
  '36x60': 23000,
  '48x60': 23000,

  // Extra large sizes
  '30x72': 31000,
  '36x72': 31000,
  '48x72': 31000,

  // Jumbo sizes
  '30x84': 41000,
  '36x84': 41000,
  '48x84': 41000,
  '30x96': 41000,
  '36x96': 41000,
  '48x96': 41000,

  //dinning table
  'DM(48x30)': 11500,
  '36x36': 10000,
  '60x36': 12000,

  // L-Shaped tables
  'l-A': 19000,
  'l-B': 19500,
  'l-C': 20000,
  'l-D': 22000,
  'l-E': 21000,
  'l-F': 21500,
  'l-G': 22000,
  'l-H': 24000
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
