import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, Truck, FileText, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

type ReportKind = 'driver' | 'manager';

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
}

const buildReportHtml = (kind: ReportKind, rows: OrderRow[], rangeLabel: string) => {
  const isManager = kind === 'manager';
  const title = isManager ? 'ප්‍රවාහන කළමනාකරු වාර්තාව' : 'රියදුරු වාර්තාව';

  const headers = isManager
    ? ['දිනය', 'ඕඩර අංකය', 'විකුණුම්කරු', 'ලිපිනය', 'දු. අංකය', 'මුදල් ලැබුණු ආකාරය', 'ලැබුණු වටිනාකම', 'ලැබීම්', 'ගෙවීම්']
    : ['දිනය', 'ඕඩර අංකය', 'විකුණුම්කරු', 'ලිපිනය', 'දු. අංකය', 'මුදල් ලැබුණු ආකාරය', 'ලැබුණු වටිනාකම'];

  const bodyRows = rows
    .map((r) => {
      const base = `
        <td></td>
        <td>${r.order_form_number ?? ''}</td>
        <td>${r.sales_person_name ?? ''}</td>
        <td>${r.address ?? ''}</td>
        <td>${r.contact_number ?? ''}</td>
        <td></td>
        <td class="num"></td>`;
      const managerExtra = isManager ? `<td class="num"></td><td class="num"></td>` : '';
      return `<tr>${base}${managerExtra}</tr>`;
    })
    .join('');

  // Column widths: optimized for A4 landscape orientation.
  const colgroup = isManager
    ? `<colgroup>
        <col style="width:8%"/>
        <col style="width:8%"/>
        <col style="width:12%"/>
        <col style="width:24%"/>
        <col style="width:12%"/>
        <col style="width:10%"/>
        <col style="width:9%"/>
        <col style="width:8.5%"/>
        <col style="width:8.5%"/>
      </colgroup>`
    : `<colgroup>
        <col style="width:9%"/>
        <col style="width:9%"/>
        <col style="width:14%"/>
        <col style="width:30%"/>
        <col style="width:14%"/>
        <col style="width:12%"/>
        <col style="width:12%"/>
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
    </tbody>
  </table>
  <script>window.addEventListener('load', () => setTimeout(() => window.print(), 400));</script>
</body>
</html>`;
};

const Transport: React.FC = () => {
  const [fromNo, setFromNo] = useState<string>('');
  const [toNo, setToNo] = useState<string>('');
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRows = async () => {
    setLoading(true);
    try {
      let q = supabase
        .from('orders')
        .select('id, order_form_number, sales_person_name, customer_name, address, contact_number, price, delivery_fee, additional_charges, completed_at, delivery_date, created_at, status')
        .eq('status', 'pending')
        .not('order_form_number', 'is', null)
        .order('order_form_number', { ascending: true })
        .limit(1000);
      if (fromNo.trim()) q = q.gte('order_form_number', fromNo.trim());
      if (toNo.trim()) q = q.lte('order_form_number', toNo.trim());
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
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div>
              <label className="text-sm font-medium block mb-1">From Order No</label>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="e.g. 1700"
                value={fromNo}
                onChange={(e) => setFromNo(e.target.value)}
                className="w-40"
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
                className="w-40"
              />
            </div>
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
    </div>
  );
};

export default Transport;
