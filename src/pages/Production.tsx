import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, ScanLine, FileSpreadsheet, Download, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import * as XLSX from 'xlsx-js-style';
import { cn } from '@/lib/utils';
import {
  fetchOrderDetailsForScans,
  formatTableColours,
  formatTableSizes,
  orderItemLines,
  totalTableQuantity,
  userNoteText,
  type OrderTableRow,
} from '@/lib/scanOrderTables';
import { buildOrderItemsSheet, type OrderSheetColumn } from '@/lib/orderItemsSheet';

// The system is used in Sri Lanka (Asia/Colombo, UTC+5:30).
const SL_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const formatSl = (iso: string) => {
  const d = new Date(new Date(iso).getTime() + SL_OFFSET_MS);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
};

// Display copy types stored in UPPER CASE (e.g. "PRODUCTION COPY") as title case.
const formatCopyType = (value: string | null) =>
  value ? value.trim().toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) : '';

// Convert a Sri Lanka local datetime-local value to a UTC ISO string.
const slLocalToUtcIso = (local: string, endOfMinute = false) => {
  if (!local) return null;
  const ms = new Date(local).getTime() - SL_OFFSET_MS;
  return new Date(endOfMinute ? ms + 59_999 : ms).toISOString();
};

interface ProductionScan {
  id: string;
  order_id: string | null;
  order_form_number: string;
  operation_mode: string;
  copy_type: string | null;
  vehicle_number: string;
  scanner_name: string;
  device_id: string;
  customer_name: string | null;
  customer_district: string | null;
  table_size: string | null;
  colour: string | null;
  quantity: number;
  notes: string | null;
  created_at: string;
}

const SCAN_TABS = {
  production: {
    label: 'Production Scans',
    copyType: 'production copy',
    Icon: ScanLine,
    headClass: 'bg-primary/[0.08] text-primary',
    rowClass: 'hover:bg-primary/[0.04]',
    triggerClass: 'data-[state=active]:bg-primary data-[state=active]:text-primary-foreground',
  },
  account: {
    label: 'Account Copy Scans',
    copyType: 'account copy',
    Icon: FileSpreadsheet,
    headClass: 'bg-secondary/40 text-foreground',
    rowClass: 'hover:bg-secondary/20',
    triggerClass: 'data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground',
  },
} as const;

type ScanTabKey = keyof typeof SCAN_TABS;

const Production = () => {
  const [scans, setScans] = useState<ProductionScan[]>([]);
  const [scanTables, setScanTables] = useState<Map<string, OrderTableRow[]>>(new Map());
  const [salesPersons, setSalesPersons] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('all');
  const [scannerFilter, setScannerFilter] = useState('all');
  const [districtFilter, setDistrictFilter] = useState('all');
  const [openingScanOrder, setOpeningScanOrder] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchScans = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('dispatch_return_logs')
        .select('*')
        .or('copy_type.ilike.production copy,copy_type.ilike.account copy')
        .order('created_at', { ascending: false })
        .limit(2000);

      if (error) throw error;
      const rows = (data as ProductionScan[]) || [];
      setScans(rows);
      try {
        const details = await fetchOrderDetailsForScans(rows);
        setScanTables(details.tables);
        setSalesPersons(details.salesPersons);
      } catch (tableError) {
        console.error('Error fetching order table details:', tableError);
        toast.error('Could not load table details — showing scanned values instead');
      }
    } catch (error) {
      console.error('Error fetching scans:', error);
      toast.error('Failed to fetch scan records');
    } finally {
      setLoading(false);
    }
  };

  // Table details come from the order_tables table; the scan's own columns are the fallback.
  const tablesFor = (scan: ProductionScan) => scanTables.get(scan.id) || [];
  const sizeFor = (scan: ProductionScan) => {
    const rows = tablesFor(scan);
    return rows.length ? formatTableSizes(rows) : scan.table_size || '';
  };
  // One line per order item: its size, unit count and colour (scan values as fallback).
  const itemLinesFor = (scan: ProductionScan) =>
    orderItemLines(tablesFor(scan), {
      size: scan.table_size || '',
      units: scan.quantity,
      colour: scan.colour || '',
    });
  const colourFor = (scan: ProductionScan) => {
    const rows = tablesFor(scan);
    return rows.length ? formatTableColours(rows) : scan.colour || '';
  };
  const quantityFor = (scan: ProductionScan) => {
    const rows = tablesFor(scan);
    return rows.length ? totalTableQuantity(rows) : scan.quantity;
  };

  useEffect(() => {
    fetchScans();
  }, []);

  const vehicleOptions = useMemo(
    () => [...new Set(scans.map(s => s.vehicle_number).filter(Boolean))].sort(),
    [scans]
  );
  const scannerOptions = useMemo(
    () => [...new Set(scans.map(s => s.scanner_name).filter(Boolean))].sort(),
    [scans]
  );
  const districtOptions = useMemo(
    () => [...new Set(scans.map(s => s.customer_district).filter(Boolean))].sort(),
    [scans]
  );

  const hasActiveFilters =
    searchQuery || fromDate || toDate ||
    vehicleFilter !== 'all' || scannerFilter !== 'all' || districtFilter !== 'all';

  const clearFilters = () => {
    setSearchQuery('');
    setFromDate('');
    setToDate('');
    setVehicleFilter('all');
    setScannerFilter('all');
    setDistrictFilter('all');
  };

  const filterScans = (tab: ScanTabKey) => {
    const q = searchQuery.toLowerCase();
    const fromIso = slLocalToUtcIso(fromDate);
    const toIso = slLocalToUtcIso(toDate, true);
    return scans.filter(scan => {
      if (!scan.copy_type?.toLowerCase().includes(SCAN_TABS[tab].copyType)) return false;
      if (fromIso && scan.created_at < fromIso) return false;
      if (toIso && scan.created_at > toIso) return false;
      if (vehicleFilter !== 'all' && scan.vehicle_number !== vehicleFilter) return false;
      if (scannerFilter !== 'all' && scan.scanner_name !== scannerFilter) return false;
      if (districtFilter !== 'all' && scan.customer_district !== districtFilter) return false;
      if (!q) return true;
      return (
        scan.order_form_number?.toLowerCase().includes(q) ||
        scan.copy_type?.toLowerCase().includes(q) ||
        scan.customer_name?.toLowerCase().includes(q) ||
        scan.scanner_name?.toLowerCase().includes(q) ||
        scan.vehicle_number?.toLowerCase().includes(q) ||
        sizeFor(scan).toLowerCase().includes(q) ||
        colourFor(scan).toLowerCase().includes(q) ||
        userNoteText(scan.notes).toLowerCase().includes(q)
      );
    });
  };

  const exportToExcel = (tab: ScanTabKey) => {
    const records = filterScans(tab);

    if (records.length === 0) {
      toast.error('No records to export');
      return;
    }

    const columns: OrderSheetColumn<ProductionScan>[] = [
      { header: 'Date & Time (SL)', width: 18, value: scan => formatSl(scan.created_at) },
      { header: 'Order No', width: 12, value: scan => scan.order_form_number },
      { header: 'Copy Type', width: 16, value: scan => formatCopyType(scan.copy_type) },
      { header: 'Customer', width: 22, value: scan => scan.customer_name },
      { header: 'District', width: 14, value: scan => scan.customer_district },
      { header: 'Sales Person', width: 18, value: scan => salesPersons.get(scan.id) },
      { header: 'Size', width: 12, item: 'size' },
      { header: 'Units', width: 8, center: true, item: 'units' },
      { header: 'Colour', width: 26, item: 'colour' },
      { header: 'Total Qty', width: 10, center: true, value: quantityFor },
      { header: 'Vehicle / Driver', width: 18, value: scan => scan.vehicle_number },
      { header: 'Scanner', width: 14, value: scan => scan.scanner_name },
      { header: 'Device', width: 12, value: scan => scan.device_id },
      { header: 'Notes', width: 30, value: scan => userNoteText(scan.notes) },
    ];
    const worksheet = buildOrderItemsSheet(records, columns, itemLinesFor);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, SCAN_TABS[tab].label);
    XLSX.writeFile(workbook, `${SCAN_TABS[tab].copyType.replace(' ', '-')}-scans.xlsx`);
    toast.success('Excel file downloaded');
  };

  const openScanOrder = async (scan: ProductionScan) => {
    setOpeningScanOrder(scan.id);
    try {
      let orderId = scan.order_id;
      if (!orderId) {
        const { data, error } = await supabase
          .from('orders')
          .select('id')
          .eq('order_form_number', scan.order_form_number)
          .maybeSingle();
        if (error) throw error;
        orderId = data?.id || null;
      }
      if (!orderId) {
        toast.error(`Order ${scan.order_form_number} was not found`);
        return;
      }
      navigate(`/order-form/${orderId}`);
    } catch (error) {
      console.error('Failed to open order:', error);
      toast.error('Unable to open order details');
    } finally {
      setOpeningScanOrder(null);
    }
  };

  const renderScanTable = (tab: ScanTabKey) => {
    const theme = SCAN_TABS[tab];
    const filtered = filterScans(tab);

    if (loading) {
      return <div className="text-center py-8 text-muted-foreground">Loading scans...</div>;
    }
    if (filtered.length === 0) {
      return <div className="text-center py-8 text-muted-foreground">No scan records found</div>;
    }

    return (
      <div className="rounded-md border overflow-x-auto">
        <Table className="[&_th]:border [&_td]:border [&_th]:border-foreground/25 [&_td]:border-foreground/25">
          <TableHeader>
            <TableRow className={theme.headClass}>
              <TableHead className="whitespace-nowrap">Date & Time (SL)</TableHead>
              <TableHead className="whitespace-nowrap">Order No</TableHead>
              <TableHead className="whitespace-nowrap">Copy Type</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>District</TableHead>
              <TableHead className="whitespace-nowrap">Sales Person</TableHead>
              <TableHead>Size</TableHead>
              <TableHead className="text-center whitespace-nowrap">Units</TableHead>
              <TableHead>Colour</TableHead>
              <TableHead className="text-center">Qty</TableHead>
              <TableHead className="whitespace-nowrap">Vehicle / Driver</TableHead>
              <TableHead>Scanner</TableHead>
              <TableHead>Device</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(scan => {
              const lines = itemLinesFor(scan);
              const span = lines.length;
              return (
                <React.Fragment key={scan.id}>
                  {lines.map((line, index) => (
                    <TableRow key={index} className={theme.rowClass}>
                      {index === 0 && (
                        <>
                          <TableCell rowSpan={span} className="whitespace-nowrap">{formatSl(scan.created_at)}</TableCell>
                          <TableCell rowSpan={span} className="font-medium whitespace-nowrap">
                            <Button
                              variant="link"
                              size="sm"
                              className="h-auto p-0"
                              onClick={() => openScanOrder(scan)}
                              disabled={openingScanOrder !== null}
                              aria-label={`View order ${scan.order_form_number}`}
                            >
                              {scan.order_form_number}
                            </Button>
                          </TableCell>
                          <TableCell rowSpan={span} className="whitespace-nowrap">
                            <Badge variant="outline" className="text-xs font-medium">
                              {formatCopyType(scan.copy_type) || '—'}
                            </Badge>
                          </TableCell>
                          <TableCell rowSpan={span}>{scan.customer_name || '—'}</TableCell>
                          <TableCell rowSpan={span}>{scan.customer_district || '—'}</TableCell>
                          <TableCell rowSpan={span}>{salesPersons.get(scan.id) || '—'}</TableCell>
                        </>
                      )}
                      <TableCell className="whitespace-nowrap">{line.size || '—'}</TableCell>
                      <TableCell className="text-center">{line.units ?? '—'}</TableCell>
                      <TableCell className="whitespace-nowrap">{line.colour || '—'}</TableCell>
                      {index === 0 && (
                        <>
                          <TableCell rowSpan={span} className="text-center">{quantityFor(scan)}</TableCell>
                          <TableCell rowSpan={span} className="whitespace-nowrap">{scan.vehicle_number || '—'}</TableCell>
                          <TableCell rowSpan={span}>{scan.scanner_name || '—'}</TableCell>
                          <TableCell rowSpan={span}>{scan.device_id || '—'}</TableCell>
                          <TableCell rowSpan={span} className="max-w-[200px] truncate" title={userNoteText(scan.notes)}>
                            {userNoteText(scan.notes) || '—'}
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className="container py-6">
      <h1 className="text-2xl font-bold mb-6">Production Management</h1>

      {/* Search + Filters */}
      <Card className="p-4 mb-6 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by order number, customer, vehicle, scanner, size, colour or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">From (SL time)</label>
            <Input type="datetime-local" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">To (SL time)</label>
            <Input type="datetime-local" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Vehicle / Driver</label>
            <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
              <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {vehicleOptions.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Scanner</label>
            <Select value={scannerFilter} onValueChange={setScannerFilter}>
              <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {scannerOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">District</label>
            <Select value={districtFilter} onValueChange={setDistrictFilter}>
              <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {districtOptions.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={clearFilters}
              disabled={!hasActiveFilters}
              className="w-full"
            >
              <X className="mr-2 h-4 w-4" />
              Clear Filters
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <Tabs defaultValue="production" className="w-full">
          <TabsList className="mb-4 w-full justify-start">
            {(Object.keys(SCAN_TABS) as ScanTabKey[]).map(tab => {
              const theme = SCAN_TABS[tab];
              return (
                <TabsTrigger key={tab} value={tab} className={cn('flex-1', theme.triggerClass)}>
                  <theme.Icon className="mr-2 h-4 w-4" />
                  {theme.label} ({filterScans(tab).length})
                </TabsTrigger>
              );
            })}
          </TabsList>

          {(Object.keys(SCAN_TABS) as ScanTabKey[]).map(tab => (
            <TabsContent key={tab} value={tab}>
              <div className="flex justify-end mb-3">
                <Button variant="outline" onClick={() => exportToExcel(tab)}>
                  <Download className="mr-2 h-4 w-4" />
                  Download Excel
                </Button>
              </div>
              {renderScanTable(tab)}
            </TabsContent>
          ))}
        </Tabs>
      </Card>
    </div>
  );
};

export default Production;
