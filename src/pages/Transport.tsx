import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, Truck, FileText, ChevronDown, Calendar, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

type ReportKind = 'driver' | 'manager';

interface OrderTableSummary {
  quantity: number;
}

interface OrderRow {
  id: string;
  order_form_number: string | null;
  sales_person_name: string | null;
  customer_name: string;
  address: string | null;
  contact_number: string | null;
  price: number | null;
  delivery_fee: number | null;
  additional_charges: number | null;
  completed_at: string | null;
  delivery_date: string | null;
  created_at: string;
  status: string;
  order_tables: OrderTableSummary[] | null;
}

interface OrderSummary {
  id: string;
  order_form_number: string | null;
  customer_name: string;
  created_at: string;
  units: number;
}

const buildReportHtml = (kind: ReportKind, rows: OrderRow[], rangeLabel: string) => {
  const isManager = kind === 'manager';
  const title = isManager ? 'ප්‍රවාහන කළමනාකරු වාර්තාව' : 'රියදුරු වාර්තාව';

  const headers = isManager
    ? ['දිනය', 'ඕඩර අංකය', 'විකුණුම්කරු', 'ලිපිනය', 'දු. අංකය', 'ලැබිය යුතු මුදල', 'මුදල් ලැබුණු ආකාරය', 'ලැබුණු වටිනාකම', 'ලැබීම්', 'ගෙවීම්']
    : ['දිනය', 'ඕඩර අංකය', 'විකුණුම්කරු', 'ලිපිනය', 'දු. අංකය', 'ලැබිය යුතු මුදල', 'මුදල් ලැබුණු ආකාරය', 'ලැබුණු වටිනාකම'];

  const formatAmount = (n: number | null) => {
    if (n === null || n === undefined || isNaN(Number(n))) return '';
    return Number(n).toLocaleString('en-LK', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };

  const bodyRows = rows
    .map((r) => {
      const base = `
        <td></td>
        <td>${r.order_form_number ?? ''}</td>
        <td>${r.sales_person_name ?? ''}</td>
        <td>${r.address ?? ''}</td>
        <td>${r.contact_number ?? ''}</td>
        <td class="num">${formatAmount(r.price)}</td>
        <td></td>
        <td class="num"></td>`;
      const managerExtra = isManager ? `<td class="num"></td><td class="num"></td>` : '';
      return `<tr>${base}${managerExtra}</tr>`;
    })
    .join('');

  // Filler rows so the last page's remaining space stays usable for handwriting.
  const fillerRows = Array.from({ length: 6 })
    .map(() => `<tr class="filler">${headers.map(() => '<td>&nbsp;</td>').join('')}</tr>`)
    .join('');

  // Column widths: optimized for A4 landscape orientation.
  const colgroup = isManager
    ? `<colgroup>
        <col style="width:7%"/>
        <col style="width:7%"/>
        <col style="width:11%"/>
        <col style="width:21%"/>
        <col style="width:11%"/>
        <col style="width:8%"/>
        <col style="width:10%"/>
        <col style="width:9%"/>
        <col style="width:8%"/>
        <col style="width:8%"/>
      </colgroup>`
    : `<colgroup>
        <col style="width:8%"/>
        <col style="width:8%"/>
        <col style="width:13%"/>
        <col style="width:27%"/>
        <col style="width:13%"/>
        <col style="width:9%"/>
        <col style="width:11%"/>
        <col style="width:11%"/>
      </colgroup>`;


  return `<!DOCTYPE html>
<html lang="si">
<head>
<meta charset="utf-8" />
<title>${title}</title>
<style>
  @page { size: A4 landscape; margin: 10mm; }
  * { box-sizing: border-box; }
  body { font-family: "Iskoola Pota", "Noto Sans Sinhala", Arial, sans-serif; color:#111; margin:0; padding:0; }
  header { display:flex; justify-content:space-between; align-items:flex-end; border-bottom:2px solid #111; padding-bottom:8px; margin-bottom:12px; }
  h1 { font-size:20px; margin:0 0 4px 0; }
  .meta { font-size:11px; color:#333; }
  .signatures { display:flex; gap:36px; font-size:11px; align-items:flex-end; }
  .sig { width:150px; text-align:center; }
  .sig .line { border-top:1px solid #111; margin-top:24px; padding-top:4px; }
  table { width:100%; border-collapse:collapse; font-size:12px; table-layout: fixed; }
  th, td { border:1px solid #333; padding:6px 8px; vertical-align:top; word-wrap: break-word; overflow-wrap: break-word; white-space: normal; }
  th { background:#f0f0f0; text-align:left; line-height:1.25; }
  td.num { text-align:right; font-variant-numeric: tabular-nums; }
  @media print { .noprint { display:none !important; } }
  .toolbar { position:fixed; top:8px; right:8px; }
  .toolbar button { padding:8px 14px; font-size:12px; cursor:pointer; }
</style>
</head>
<body>
  <div class="toolbar noprint"><button onclick="window.print()">Print</button></div>
  <header>
    <div>
      <h1>${title}</h1>
      <div class="meta">
        ඕඩර අංක පරාසය: ${rangeLabel}<br/>
        මුද්‍රණ දිනය: ${format(new Date(), 'yyyy-MM-dd HH:mm')}
      </div>
    </div>
    <div class="signatures">
      <div class="sig"><div class="line">${isManager ? 'ප්‍රවාහන කළමනාකරු' : 'රියදුරු අත්සන'}</div></div>
      <div class="sig"><div class="line">දිනය</div></div>
    </div>
  </header>
  <table>
    ${colgroup}
    <thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
    <tbody>
      ${bodyRows || `<tr><td colspan="${headers.length}" style="text-align:center;padding:20px;">දත්ත නොමැත</td></tr>`}
      ${fillerRows}
    </tbody>
  </table>
  <script>window.addEventListener('load', () => setTimeout(() => window.print(), 400));</script>
</body>
</html>`;
};

const Transport: React.FC = () => {
  const [fromNo, setFromNo] = useState<string>('');
  const [toNo, setToNo] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRows = async () => {
    setLoading(true);
    try {
      let q = supabase
        .from('orders')
        .select(
          'id, order_form_number, sales_person_name, customer_name, address, contact_number, price, delivery_fee, additional_charges, completed_at, delivery_date, created_at, status, order_tables(quantity)'
        )
        .eq('status', 'pending')
        .not('order_form_number', 'is', null)
        .order('order_form_number', { ascending: true })
        .limit(1000);
      if (fromNo.trim()) q = q.gte('order_form_number', fromNo.trim());
      if (toNo.trim()) q = q.lte('order_form_number', toNo.trim());
      if (fromDate.trim()) q = q.gte('created_at', fromDate.trim());
      if (toDate.trim()) q = q.lte('created_at', toDate.trim());
      const { data, error } = await q;
      if (error) throw error;
      const sorted = ((data || []) as OrderRow[]).slice().sort((a, b) => {
        const an = Number(a.order_form_number);
        const bn = Number(b.order_form_number);
        if (!isNaN(an) && !isNaN(bn)) return an - bn;
        return String(a.order_form_number).localeCompare(String(b.order_form_number));
      });
      setRows(sorted);
    } catch (e: any) {
      console.error(e);
      toast.error('දත්ත ලබා ගැනීමට අසමත් විය');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rangeLabel = useMemo(() => {
    const f = fromNo.trim() || '—';
    const t = toNo.trim() || '—';
    return `${f}  →  ${t}`;
  }, [fromNo, toNo]);

  const summary = useMemo(() => {
    const breakdown: OrderSummary[] = rows.map((r) => {
      const units = r.order_tables?.reduce((sum, t) => sum + (t.quantity || 0), 0) || 0;
      return {
        id: r.id,
        order_form_number: r.order_form_number,
        customer_name: r.customer_name,
        created_at: r.created_at,
        units,
      };
    });
    const totalUnits = breakdown.reduce((sum, o) => sum + o.units, 0);
    return {
      totalOrders: rows.length,
      totalUnits,
      breakdown,
    };
  }, [rows]);

  const openReport = (kind: ReportKind) => {
    if (!rows.length) {
      toast.warning('තෝරාගත් පරාසය තුළ පොරොත්තු ඕඩර නොමැත');
    }
    const html = buildReportHtml(kind, rows, rangeLabel);
    const w = window.open('', '_blank');
    if (!w) {
      toast.error('Pop-up blocked. Please allow pop-ups.');
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  return (
    <div className="container py-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck size={20} /> Transport
          </CardTitle>
          <CardDescription>
            Download printable delivery documents for drivers and the transport manager.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-sm font-medium block mb-1">From Order No</label>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="e.g. 1700"
                value={fromNo}
                onChange={(e) => setFromNo(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">To Order No</label>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="e.g. 1800"
                value={toNo}
                onChange={(e) => setToNo(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">From Date/Time</label>
              <Input
                type="datetime-local"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">To Date/Time</label>
              <Input
                type="datetime-local"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <Button variant="outline" onClick={fetchRows} disabled={loading}>
              {loading ? 'Loading...' : 'Apply'}
            </Button>

            <div className="sm:ml-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button>
                    <Download className="mr-2 h-4 w-4" />
                    Download Delivery Documents
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuItem onClick={() => openReport('driver')}>
                    <FileText className="mr-2 h-4 w-4" />
                    Driver Report (රියදුරු)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openReport('manager')}>
                    <FileText className="mr-2 h-4 w-4" />
                    Transport Manager Report
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            {rows.length} pending orders in range
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar size={20} /> Range Summary
          </CardTitle>
          <CardDescription>
            Order count and total units for the selected range.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="border border-primary/20 bg-primary/5">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
                  <p className="text-3xl font-bold">{summary.totalOrders}</p>
                </div>
                <Package className="h-8 w-8 text-primary opacity-80" />
              </CardContent>
            </Card>
            <Card className="border border-primary/20 bg-primary/5">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Units</p>
                  <p className="text-3xl font-bold">{summary.totalUnits}</p>
                </div>
                <Truck className="h-8 w-8 text-primary opacity-80" />
              </CardContent>
            </Card>
          </div>

          <Separator />

          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order No</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Units</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.breakdown.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                      No orders in selected range
                    </TableCell>
                  </TableRow>
                ) : (
                  summary.breakdown.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.order_form_number ?? '-'}</TableCell>
                      <TableCell>{order.customer_name}</TableCell>
                      <TableCell>{format(new Date(order.created_at), 'yyyy-MM-dd HH:mm')}</TableCell>
                      <TableCell className="text-right">{order.units}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Transport;
