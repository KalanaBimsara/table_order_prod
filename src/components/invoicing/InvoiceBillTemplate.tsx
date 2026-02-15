import React from 'react';
import { Order, TableItem, tableSizeOptions } from '@/types/order';
import { format } from 'date-fns';

// Standard sizes that don't incur extra fee
const standardSizes = [
  '24x32', '24x36', '24x48', '24x60', '24x72', '24x84', '24x96',
  '30x48', '36x48', '48x48',
  '30x60', '36x60', '48x60',
  '30x72', '36x72', '48x72',
  '30x84', '36x84', '48x84',
  '30x96', '36x96', '48x96',
  'DS (36x36)', 'DL (60x36)',
  'L-A', 'L-B', 'L-C', 'L-D', 'L-E', 'L-F', 'L-G', 'L-H'
];

export const isNonStandardSize = (size: string): boolean => {
  return !standardSizes.includes(size);
};

export const hasFrontPanel = (table: TableItem): boolean => {
  return !!table.frontPanelSize && !!table.frontPanelLength && table.frontPanelLength > 0;
};

export const calculateExtraFees = (table: TableItem) => {
  let extraFee = 0;
  let feeDetails: string[] = [];

  if (isNonStandardSize(table.size)) {
    extraFee += 1000;
    feeDetails.push('C/W');
  }

  if (hasFrontPanel(table)) {
    extraFee += 1000;
    feeDetails.push('Panel');
  }

  return { extraFee, feeDetails };
};

interface BillRow {
  quantity: number;
  item: string;
  orderNumber: string;
  deliveryCity: string;
  rate: number;
  amount: number;
  isExtraFee?: boolean;
}

export type BillCopyVariant = 'customer' | 'account';

interface InvoiceBillTemplateProps {
  billNumber: string;
  orderNumbers: string[];
  rows: BillRow[];
  pageNumber?: number;
  totalPages?: number;
  billTo: string;
  driverName?: string;
  vehicleNumber?: string;
  totalAmount: number;
  totalQuantity: number;
  invoiceDate: string;
  /** Label shown on copy: "Customer Copy" or "Account Copy" */
  copyLabel?: string;
  /** Color theme: customer (blue) or account (green) */
  variant?: BillCopyVariant;
}

const formatPrice = (price: number) => {
  return price.toLocaleString('en-US');
};

const InvoiceBillTemplate: React.FC<InvoiceBillTemplateProps> = ({
  billNumber,
  orderNumbers,
  rows,
  pageNumber,
  totalPages,
  billTo,
  driverName,
  vehicleNumber,
  totalAmount,
  totalQuantity,
  invoiceDate,
  copyLabel,
  variant = 'account'
}) => {
  const MAX_ROWS = 10;
  const emptyRowsCount = Math.max(0, MAX_ROWS - rows.length);

  const isCustomer = variant === 'customer';
  const accentBorder = isCustomer ? 'border-[#1e40af]' : 'border-[#2d5a27]';
  const accentText = isCustomer ? 'text-[#1e40af]' : 'text-[#2d5a27]';
  const headerBg = isCustomer ? 'bg-blue-50/80' : 'bg-transparent';

  return (
    <div className={`bill-template bg-white print:shadow-none mb-8 ${copyLabel ? '' : 'page-break-after-always'}`}>
      {/* Copy label badge when in two-copy mode */}
      {copyLabel && (
        <div className={`print-copy-label text-sm font-bold mb-2 ${accentText}`}>
          {copyLabel}
        </div>
      )}
      {/* Header - color by variant */}
      <div className={`bg-transparent border-b-2 ${accentBorder} ${accentText} ${headerBg} p-4 flex justify-between items-start`}>
        <div className="flex items-center gap-3">
          <div className="text-2xl font-bold tracking-wide">BOSS FURNITURE Pvt Ltd.</div>
        </div>
        <div className="text-right text-xs">
          <p>No.31/A/02, Gammanpila, Bandaragama.</p>
          <p>Tel. 075 166 3775 / 078 844 3776</p>
        </div>
      </div>

      {/* Bill Info Section */}
      <div className="border border-gray-300 p-4">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            {/* Bill To replaces Customer Name */}
            <div className="flex gap-2 mb-2">
              <span className="text-gray-600">Bill To :</span>
              <span className="border-b border-dotted border-gray-400 flex-1 font-medium">
                {billTo}
              </span>
            </div>
            {/* Driver Name replaces Address */}
            <div className="flex gap-2 mb-2">
              <span className="text-gray-600">Driver Name:</span>
              <span className="border-b border-dotted border-gray-400 flex-1">
                {driverName || '-'}
              </span>
            </div>
            {/* Vehicle Number replaces Contact */}
            <div className="flex gap-2 mb-2">
              <span className="text-gray-600">Vehicle No. :</span>
              <span className="border-b border-dotted border-gray-400 flex-1">
                {vehicleNumber || '-'}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="flex gap-2 justify-end mb-2">
              <span className="text-gray-600">Date :</span>
              <span className="font-medium">{invoiceDate}</span>
            </div>
            <div className="flex gap-2 justify-end mb-2">
              <span className="text-gray-600">Bill No :</span>
              <span className={`font-bold text-lg ${accentText}`}>{billNumber}</span>
            </div>
            <div className="flex gap-2 justify-end text-xs text-gray-600">
              <span>Order(s) :</span>
              <span className="font-medium">{orderNumbers.join(', ')}</span>
            </div>
            {totalPages && totalPages > 1 && (
              <div className="flex gap-2 justify-end mt-1 text-xs text-gray-500">
                <span>Page {pageNumber} of {totalPages}</span>
              </div>
            )}
          </div>
        </div>

        {/* Items Table */}
        <table className="w-full border-collapse border border-gray-300 mt-4">
          <thead>
            <tr className={isCustomer ? 'bg-blue-100' : 'bg-gray-100'}>
              <th className="border border-gray-300 p-2 text-left w-16">Qty</th>
              <th className="border border-gray-300 p-2 text-left">Item</th>
              <th className="border border-gray-300 p-2 text-center w-20">Order No</th>
              <th className="border border-gray-300 p-2 text-left">Delivery City</th>
              <th className="border border-gray-300 p-2 text-right w-20">Rate</th>
              <th className="border border-gray-300 p-2 text-right w-24">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index}>
                <td className="border border-gray-300 p-2 text-center">
                  {row.isExtraFee ? '' : String(row.quantity).padStart(2, '0')}
                </td>
                <td className={`border border-gray-300 p-2 ${row.isExtraFee ? 'text-gray-600 pl-6' : 'font-medium'}`}>
                  {row.item}
                </td>
                <td className="border border-gray-300 p-2 text-center">
                  {row.isExtraFee ? '' : row.orderNumber}
                </td>
                <td className="border border-gray-300 p-2">
                  {row.isExtraFee ? '' : row.deliveryCity}
                </td>
                <td className="border border-gray-300 p-2 text-right">
                  {row.rate > 0 ? formatPrice(row.rate) : ''}
                </td>
                <td className="border border-gray-300 p-2 text-right font-medium">
                  {formatPrice(row.amount)}
                </td>
              </tr>
            ))}
            
            {/* Empty rows for visual consistency */}
            {Array.from({ length: emptyRowsCount }).map((_, i) => (
              <tr key={`empty-${i}`}>
                <td className="border border-gray-300 p-2">&nbsp;</td>
                <td className="border border-gray-300 p-2"></td>
                <td className="border border-gray-300 p-2"></td>
                <td className="border border-gray-300 p-2"></td>
                <td className="border border-gray-300 p-2"></td>
                <td className="border border-gray-300 p-2"></td>
              </tr>
            ))}

            {/* Total row */}
            <tr className="border-t-2 border-gray-400">
              <td className="border border-gray-300 p-2 font-bold text-center">
                {totalQuantity}
              </td>
              <td className="border border-gray-300 p-2"></td>
              <td className="border border-gray-300 p-2"></td>
              <td className="border border-gray-300 p-2 font-bold text-right">TOTAL</td>
              <td className="border border-gray-300 p-2"></td>
              <td className="border border-gray-300 p-2 text-right font-bold text-lg">
                {formatPrice(totalAmount)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Signature Section */}
        <div className="grid grid-cols-3 gap-8 mt-8 pt-4">
          <div className="text-center">
            <div className="border-t border-gray-400 pt-2">
              <span className="text-sm text-gray-600">Prepared by</span>
            </div>
          </div>
          <div className="text-center">
            <div className="border-t border-gray-400 pt-2">
              <span className="text-sm text-gray-600">Checked by</span>
            </div>
          </div>
          <div className="text-center">
            <div className="border-t border-gray-400 pt-2">
              <span className="text-sm text-gray-600">Received by</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center mt-8 pt-4 border-t border-gray-300 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <span>✉</span>
            <span>bossfurniturelk@gmail.com</span>
          </div>
          <div className="flex items-center gap-2">
            <span>🌐</span>
            <span>www.tablelk.com</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceBillTemplate;