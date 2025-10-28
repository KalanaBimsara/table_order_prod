import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Printer, Edit, X, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Order } from '@/types/order';

const OrderForm: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [salesPersonContact, setSalesPersonContact] = useState<string>('');
  const [editableDetails, setEditableDetails] = useState({
    pageName: '',
    pageTel: '',
    contactPerson: '',
    deliveryDate: '',
    assemblingType: '',
    specialNotes: '',
    wAppNo: '',
  });

  useEffect(() => {
    if (orderId) {
      fetchOrder();
    }
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_tables(*)')
        .eq('id', orderId)
        .single();

      if (error) throw error;

      const formattedOrder: Order = {
        id: data.id,
        customerName: data.customer_name,
        address: data.address,
        deliveryDate: (data as any).delivery_date,
        contactNumber: data.contact_number,
        orderFormNumber: (data as any).order_form_number,
        tables: data.order_tables?.map((table: any) => ({
          id: table.id,
          size: table.size,
          topColour: table.top_colour || '',
          frameColour: table.frame_colour || '',
          colour: table.colour,
          quantity: table.quantity,
          price: Number(table.price),
          legSize: table.leg_size,
          legShape: table.leg_shape,
          legHeight: table.leg_height,
          wireHoles: table.wire_holes,
          wireHolesComment: table.wire_holes_comment
        })) || [],
        note: data.note,
        status: data.status as any,
        createdAt: new Date(data.created_at),
        completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
        totalPrice: Number(data.price),
        deliveryFee: data.delivery_fee ? Number(data.delivery_fee) : undefined,
        additionalCharges: data.additional_charges ? Number(data.additional_charges) : undefined,
        assignedTo: data.delivery_person_id,
        delivery_person_id: data.delivery_person_id,
        createdBy: data.created_by,
        salesPersonName: data.sales_person_name,
        deliveryStatus: (data.delivery_status || 'pending') as 'pending' | 'ready'
      };

      setOrder(formattedOrder);

      // Fetch sales person's contact number
      if (data.sales_person_name) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('contact_no')
          .eq('name', data.sales_person_name)
          .maybeSingle() as { data: { contact_no?: string } | null };
        
        if (profileData?.contact_no) {
          setSalesPersonContact(profileData.contact_no);
        }
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      toast.error('Failed to fetch order details');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getTotalQuantity = () => {
    return order?.tables.reduce((sum, table) => sum + table.quantity, 0) || 0;
  };

  if (loading) {
    return (
      <div className="container py-6">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container py-6">
        <div className="text-center">Order not found</div>
      </div>
    );
  }

  const FormCopy = ({
      copyNumber,
      colorName,
      copyLabel,
      singleTable,
      tableIndex
    }: {
      copyNumber: number;
      colorName: 'cyan' | 'magenta' | 'yellow' | 'black';
      copyLabel: string;
      singleTable: any;
      tableIndex: number;
    }) => {
    const colorStyles = {
      cyan: { bg: '#E0F7FA', border: '#00ACC1', text: '#00ACC1' },
      magenta: { bg: '#FCE4EC', border: '#C2185B', text: '#C2185B' },
      yellow: { bg: '#dafcdfff', border: '#00d636ff', text: '#00ff00ff' },
      black: { bg: '#F5F5F5', border: '#000000', text: '#000000' }
    };
    
    const colors = colorStyles[colorName];
    const formattedOrderNumber = order.orderFormNumber || '000000';
    
    return (
      <div className="form-copy" style={{ height: '50vh', pageBreakAfter:!(tableIndex === order.tables.length - 1 && copyNumber === 4)? 'always': 'auto', pageBreakInside: 'avoid' }}>
        <div className="p-3 h-full" style={{ 
          fontFamily: 'Arial, sans-serif', 
          fontSize: '11px',
          backgroundColor: colors.bg,
          color: colors.text
        }}>
          {/* Header - Condensed */}
          <div className="flex justify-between items-start mb-2">
            <div>
              <div className="text-xs font-bold mt-1" style={{ color: colors.text }}>{copyLabel}</div>
            </div>

            <div className="text-center flex-1">
              <h1 className="text-sm font-bold">BOSS FURNITURE (PVT) LTD.</h1>
              <p className="text-xs">No. 31/A/02, Gammanpila, Bandaragama. Tel: 075 166 3775 / 078 844 3776</p>
            </div>

            <div className="text-right text-xs">
              <div className="font-bold">ORDER NO: {formattedOrderNumber}</div>
              <div>Delivery Date: {order.deliveryDate || '______'}</div>
              <div>Ordered Date:{' '}{order.createdAt? new Date(order.createdAt).toLocaleDateString('en-GB'): '______'}</div>
            </div>
          </div>

          {/* Customer Information - Condensed */}
          <div className="grid grid-cols-2 gap-2 mb-2" style={{ fontSize: '12px' }}>
            <div><span className="font-medium">Page:</span> {order.salesPersonName || '______'}</div>
            <div><span className="font-medium">Page Contact:</span> {salesPersonContact || '______'}</div>
          </div>

          <div className="mb-2" style={{ fontSize: '12px' }}>
            <div><span className="font-medium">Customer:</span> {order.customerName} | <span className="font-medium">Tel:</span> {order.contactNumber}</div>
            <div><span className="font-medium">Address:</span> {order.address}</div>
            <div><span className="font-medium">Assembly:</span> {editableDetails.assemblingType || '______'}</div>
          </div>

          {/* Order Table - Condensed Single Row */}
          <div className="border mb-2" style={{ borderColor: colors.border }}>
            <table className="w-full" style={{ fontSize: '11px' }}>
              <thead>
                <tr className="border-b" style={{ borderColor: colors.border }}>
                  <th className="border-r p-1 font-medium" style={{ borderColor: colors.border }}>Size</th>
                  <th className="border-r p-1 font-medium" style={{ borderColor: colors.border }}>Top Color</th>
                  <th className="border-r p-1 font-medium" style={{ borderColor: colors.border }}>Holes</th>
                  <th className="border-r p-1 font-medium" style={{ borderColor: colors.border }}>Qty</th>
                  <th className="border-r p-1 font-medium" style={{ borderColor: colors.border }}>Leg Size</th>
                  <th className="border-r p-1 font-medium" style={{ borderColor: colors.border }}>Leg Shape</th>
                  <th className="border-r p-1 font-medium" style={{ borderColor: colors.border }}>Leg height</th>
                  <th className="border-r p-1 font-medium" style={{ borderColor: colors.border }}>Leg Color</th>
                  <th className="border-r p-1 font-medium" style={{ borderColor: colors.border }}>L Normal</th>
                  <th className="border-r p-1 font-medium" style={{ borderColor: colors.border }}>L Reverse</th>
                  <th className="p-1 font-medium">Notes</th>
                  
                </tr>
              </thead>
              <tbody>
                <tr className="border-b" style={{ borderColor: colors.border }}>
                  <td className="border-r p-1" style={{ borderColor: colors.border }}>{singleTable.size}</td>
                  <td className="border-r p-1" style={{ borderColor: colors.border }}>{singleTable.topColour || singleTable.colour}</td>
                  <td className="border-r p-1" style={{ borderColor: colors.border }}>{singleTable.wireHoles || 'normal'}</td>
                  <td className="border-r p-1 text-center font-bold" style={{ borderColor: colors.border }}>{singleTable.quantity}</td>
                  <td className="border-r p-1" style={{ borderColor: colors.border }}>{singleTable.legSize || ''}</td>
                  <td className="border-r p-1" style={{ borderColor: colors.border }}>{singleTable.legShape || ''}</td>
                  <td className="border-r p-1" style={{ borderColor: colors.border }}>{singleTable.legHeight || ''}</td>
                  <td className="border-r p-1" style={{ borderColor: colors.border }}>{singleTable.frameColour || ''}</td>
                  <td className="border-r p-1" style={{ borderColor: colors.border }}></td>
                  <td className="border-r p-1" style={{ borderColor: colors.border }}></td>
                  <td className="p-1">{singleTable.wireHolesComment || ''}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Total and Footer - Condensed */}
          <div className="text-xs mb-2">
            <span className="font-bold">Total Qty: {getTotalQuantity()}</span>
            {editableDetails.specialNotes && <span className="ml-4 font-medium">Notes: {editableDetails.specialNotes} </span>}
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <span className="font-medium">W/App:</span> {salesPersonContact || '______'}
              <div className="mt-1 text-xs">Approved via W/App</div>
            </div>
            <div className="text-center">
              <div className="font-medium">Contact Person</div>
              <div className="border-b mt-3" style={{ borderColor: colors.border }}>&nbsp;</div>
            </div>
            <div className="text-center">
              <div className="font-medium">Entered/Approved</div>
              <div className="border-b mt-3" style={{ borderColor: colors.border }}>&nbsp;</div>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t text-xs space-y-1" style={{ borderColor: colors.border }}>
            {order.note && (
              <div
                style={{
                  color: 'red',
                  fontWeight: 'bold',
                  fontSize: '13px',
                  marginTop: '6px'
                }}>
                Notes / Drawing: {order.note}
              </div>
            )}
            {singleTable.wireHolesComment && (
              <div
                style={{
                  color: '#ff0000ff',
                  fontWeight: '500',
                  fontSize: '12px',
                  marginTop: '4px'
                }}
              >
                Wire Hole Comment: {singleTable.wireHolesComment}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          header { display: none !important; }
          body { margin: 0; padding: 0; }
          .container { max-width: 100% !important; padding: 0 !important; }
          @page { size: A4; margin: 0; }
          .form-copy { margin: 0; padding: 0; }
        }
      `}</style>
      {/* Control Bar */}
      <div className="no-print bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="container py-4 flex justify-between items-center">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <X size={16} className="mr-2" />
            Close
          </Button>
          <div className="flex gap-2">
            <Button
              variant={editMode ? "default" : "outline"}
              onClick={() => setEditMode(!editMode)}
            >
              {editMode ? (
                <>
                  <Save size={16} className="mr-2" />
                  Save Changes
                </>
              ) : (
                <>
                  <Edit size={16} className="mr-2" />
                  Edit Details
                </>
              )}
            </Button>
            <Button onClick={handlePrint} className="bg-primary">
              <Printer size={16} className="mr-2" />
              Print Form (4 Copies)
            </Button>
          </div>
        </div>
      </div>

      {/* Forms Container - one set of 4 copies per table */}
      <div className="container py-8 space-y-8">
        {order.tables.map((table, tableIndex) => (
          <React.Fragment key={tableIndex}>
            <FormCopy copyNumber={1} colorName="cyan" copyLabel="TRANSPORT COPY" singleTable={table} tableIndex={tableIndex} />
            <FormCopy copyNumber={2} colorName="magenta" copyLabel="ACCOUNT COPY" singleTable={table} tableIndex={tableIndex} />
            <FormCopy copyNumber={3} colorName="yellow" copyLabel="GATE PASS" singleTable={table} tableIndex={tableIndex} />
            <FormCopy copyNumber={4} colorName="black" copyLabel="PRODUCTION COPY" singleTable={table} tableIndex={tableIndex} />
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default OrderForm;
