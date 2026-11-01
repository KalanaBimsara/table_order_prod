import * as XLSX from 'xlsx-js-style';
import type { OrderItemLine } from '@/lib/scanOrderTables';

interface ColumnBase {
  header: string;
  width: number;
  center?: boolean;
}

/** A column filled per order item, or per order (merged across that order's item rows). */
export type OrderSheetColumn<T> = ColumnBase &
  (
    | { item: keyof OrderItemLine }
    | { value: (record: T) => string | number | null | undefined }
  );

const GRID_LINE = { style: 'thin', color: { rgb: 'A6A6A6' } };
const BORDER = { top: GRID_LINE, bottom: GRID_LINE, left: GRID_LINE, right: GRID_LINE };

/** Builds a bordered worksheet with one row per order item and order-level cells merged. */
export function buildOrderItemsSheet<T>(
  records: T[],
  columns: OrderSheetColumn<T>[],
  linesFor: (record: T) => OrderItemLine[]
): XLSX.WorkSheet {
  const rows: (string | number)[][] = [columns.map(c => c.header)];
  const merges: XLSX.Range[] = [];

  for (const record of records) {
    const lines = linesFor(record);
    const firstRow = rows.length;
    lines.forEach((line, lineIndex) => {
      rows.push(
        columns.map(column => {
          if ('item' in column) return line[column.item] ?? '';
          return lineIndex === 0 ? column.value(record) ?? '' : '';
        })
      );
    });
    if (lines.length > 1) {
      columns.forEach((column, c) => {
        if ('value' in column) {
          merges.push({ s: { r: firstRow, c }, e: { r: firstRow + lines.length - 1, c } });
        }
      });
    }
  }

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet['!cols'] = columns.map(c => ({ wch: c.width }));
  worksheet['!merges'] = merges;

  rows.forEach((_, r) => {
    columns.forEach((column, c) => {
      const isHeader = r === 0;
      worksheet[XLSX.utils.encode_cell({ r, c })].s = {
        border: BORDER,
        alignment: {
          vertical: 'center',
          horizontal: isHeader || column.center ? 'center' : 'left',
          wrapText: true,
        },
        ...(isHeader && {
          font: { bold: true },
          fill: { patternType: 'solid', fgColor: { rgb: 'D9E1F2' } },
        }),
      };
    });
  });

  return worksheet;
}
