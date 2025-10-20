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
        contactNumber: data.contact_number,
        tables: data.order_tables?.map((table: any) => ({
          id: table.id,
          size: table.size,
          topColour: table.top_colour || '',
          frameColour: table.frame_colour || '',
          colour: table.colour,
          quantity: table.quantity,
          price: Number(table.price),
          legSize: table.leg_size,
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

  const FormCopy = ({ copyNumber }: { copyNumber: number }) => (
    <div className="form-copy">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .form-copy { 
            page-break-after: ${copyNumber === 1 ? 'always' : 'auto'};
            page-break-inside: avoid;
          }
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        }
      `}</style>

      <div className="border-2 border-black p-4 bg-white text-black" style={{ fontFamily: 'Arial, sans-serif', fontSize: '12px' }}>
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-start gap-4">
            <div>
              <div className="text-sm">Order No.:</div>
              <div className="text-3xl font-bold mt-1">{order.id.slice(-8)}</div>
            </div>
          </div>

          <div className="text-center flex-1">
            <h1 className="text-2xl font-bold">BOSS FURNITURE (PVT) LTD.</h1>
            <p className="text-xs mt-1">No. 31/A/02, Gammanpila, Bandaragama.</p>
            <p className="text-xs">Tel: 075 / 076 / 077 | 078 8443776</p>
          </div>

          <div className="text-right">
            <div className="font-bold border-b border-black pb-1">ORDER FORM</div>
            <div className="mt-2">
              <div className="text-xs">Delivery Date:</div>
              {editMode ? (
                <Input
                  type="text"
                  value={editableDetails.deliveryDate}
                  onChange={(e) => setEditableDetails({ ...editableDetails, deliveryDate: e.target.value })}
                  className="h-8 text-xs"
                />
              ) : (
                <div className="text-sm font-medium">{editableDetails.deliveryDate || '_______________'}</div>
              )}
            </div>
          </div>
        </div>

        {/* Customer Information */}
        <div className="grid grid-cols-2 gap-4 mb-4 text-xs">
          <div>
            <div className="mb-2">
              <span className="font-medium">Page Name:</span>
              {editMode ? (
                <Input
                  type="text"
                  value={editableDetails.pageName}
                  onChange={(e) => setEditableDetails({ ...editableDetails, pageName: e.target.value })}
                  className="h-7 text-xs mt-1"
                />
              ) : (
                <span className="ml-2">{editableDetails.pageName || '________________'}</span>
              )}
            </div>
            <div className="mb-2">
              <span className="font-medium">Page Tel. No.:</span>
              {editMode ? (
                <Input
                  type="text"
                  value={editableDetails.pageTel}
                  onChange={(e) => setEditableDetails({ ...editableDetails, pageTel: e.target.value })}
                  className="h-7 text-xs mt-1"
                />
              ) : (
                <span className="ml-2">{editableDetails.pageTel || '________________'}</span>
              )}
            </div>
          </div>
          <div>
            <div className="mb-2">
              <span className="font-medium">Contact Person:</span>
              {editMode ? (
                <Input
                  type="text"
                  value={editableDetails.contactPerson}
                  onChange={(e) => setEditableDetails({ ...editableDetails, contactPerson: e.target.value })}
                  className="h-7 text-xs mt-1"
                />
              ) : (
                <span className="ml-2">{editableDetails.contactPerson || '________________'}</span>
              )}
            </div>
          </div>
        </div>

        <div className="mb-4">
          <div className="text-xs mb-1">
            <span className="font-medium">Customer Name:</span> {order.customerName}
          </div>
          <div className="text-xs mb-1">
            <span className="font-medium">Address:</span> {order.address}
          </div>
          <div className="text-xs mb-1">
            <span className="font-medium">Cus. Tel. No1:</span> {order.contactNumber}
          </div>
          <div className="text-xs">
            <span className="font-medium">Assembling Type:</span>
            {editMode ? (
              <Input
                type="text"
                placeholder="FIX / H/PAC / F/PAC"
                value={editableDetails.assemblingType}
                onChange={(e) => setEditableDetails({ ...editableDetails, assemblingType: e.target.value })}
                className="h-7 text-xs ml-2 inline-block w-48"
              />
            ) : (
              <span className="ml-2">{editableDetails.assemblingType || '________________'}</span>
            )}
          </div>
        </div>

        {/* Order Table */}
        <div className="border-2 border-black mb-4">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b-2 border-black">
                <th colSpan={3} className="border-r-2 border-black p-2 text-center font-bold">Top Details</th>
                <th className="border-r-2 border-black p-2 text-center font-bold">Qty</th>
                <th colSpan={3} className="border-r-2 border-black p-2 text-center font-bold">Leg Details</th>
                <th colSpan={2} className="border-r-2 border-black p-2 text-center font-bold">Side Returns (L)</th>
                <th className="p-2 text-center font-bold">Special Notes & Pictures</th>
              </tr>
              <tr className="border-b-2 border-black">
                <th className="border-r border-black p-1 font-medium">Size</th>
                <th className="border-r border-black p-1 font-medium">Colour</th>
                <th className="border-r-2 border-black p-1 font-medium">Holes<br/>N/SP</th>
                <th className="border-r-2 border-black p-1 font-medium"></th>
                <th className="border-r border-black p-1 font-medium">Size</th>
                <th className="border-r border-black p-1 font-medium">Height</th>
                <th className="border-r-2 border-black p-1 font-medium">Colour</th>
                <th className="border-r border-black p-1 font-medium">Normal</th>
                <th className="border-r-2 border-black p-1 font-medium">Reverse</th>
                <th className="p-1 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {order.tables.map((table, index) => (
                <tr key={index} className="border-b border-black">
                  <td className="border-r border-black p-2">{table.size}</td>
                  <td className="border-r border-black p-2">{table.topColour || table.colour}</td>
                  <td className="border-r-2 border-black p-2">{table.wireHoles || ''}</td>
                  <td className="border-r-2 border-black p-2 text-center font-bold">{table.quantity}</td>
                  <td className="border-r border-black p-2">{table.legSize || ''}</td>
                  <td className="border-r border-black p-2">{table.legHeight || ''}</td>
                  <td className="border-r-2 border-black p-2">{table.frameColour || ''}</td>
                  <td className="border-r border-black p-2"></td>
                  <td className="border-r-2 border-black p-2"></td>
                  <td className="p-2">{table.wireHolesComment || ''}</td>
                </tr>
              ))}
              {/* Empty rows for printing */}
              {[...Array(Math.max(0, 3 - order.tables.length))].map((_, i) => (
                <tr key={`empty-${i}`} className="border-b border-black">
                  <td className="border-r border-black p-2 h-12">&nbsp;</td>
                  <td className="border-r border-black p-2">&nbsp;</td>
                  <td className="border-r-2 border-black p-2">&nbsp;</td>
                  <td className="border-r-2 border-black p-2">&nbsp;</td>
                  <td className="border-r border-black p-2">&nbsp;</td>
                  <td className="border-r border-black p-2">&nbsp;</td>
                  <td className="border-r-2 border-black p-2">&nbsp;</td>
                  <td className="border-r border-black p-2">&nbsp;</td>
                  <td className="border-r-2 border-black p-2">&nbsp;</td>
                  <td className="p-2">&nbsp;</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Total and Special Notes */}
        <div className="mb-4">
          <div className="text-xs mb-2">
            <span className="font-bold">Total Qty:</span>
            <span className="ml-2 border-b border-black inline-block w-24 text-center font-bold">{getTotalQuantity()}</span>
          </div>
          {editMode ? (
            <div className="mt-4">
              <div className="font-bold text-xs mb-1">Special Notes:</div>
              <Textarea
                value={editableDetails.specialNotes}
                onChange={(e) => setEditableDetails({ ...editableDetails, specialNotes: e.target.value })}
                className="text-xs h-20"
              />
            </div>
          ) : editableDetails.specialNotes ? (
            <div className="mt-2">
              <div className="font-bold text-xs">Special Notes:</div>
              <div className="text-xs mt-1 border border-gray-300 p-2 rounded">{editableDetails.specialNotes}</div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="grid grid-cols-3 gap-4 mt-6 text-xs">
          <div>
            <div className="mb-1">
              <span className="font-medium">W/App No.:</span>
              {editMode ? (
                <Input
                  type="text"
                  value={editableDetails.wAppNo}
                  onChange={(e) => setEditableDetails({ ...editableDetails, wAppNo: e.target.value })}
                  className="h-7 text-xs mt-1"
                />
              ) : (
                <span className="ml-2">{editableDetails.wAppNo || '________________'}</span>
              )}
            </div>
            <div className="mt-4 text-xs">Approved via W/App</div>
          </div>
          <div className="text-center">
            <div className="mb-1 font-medium">Contact Person:</div>
            <div className="border-b border-black mt-8">&nbsp;</div>
          </div>
          <div className="text-center">
            <div className="mb-1 font-medium">Entered by</div>
            <div className="border-b border-black mt-8">&nbsp;</div>
            <div className="mt-6 mb-1 font-medium">Approved by</div>
            <div className="border-b border-black mt-8">&nbsp;</div>
          </div>
        </div>

        {order.note && (
          <div className="mt-4 pt-4 border-t-2 border-gray-300">
            <div className="font-bold text-xs">Additional Order Notes:</div>
            <div className="text-xs mt-1">{order.note}</div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; padding: 0; }
          .container { max-width: 100% !important; padding: 0 !important; }
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
              Print Form
            </Button>
          </div>
        </div>
      </div>

      {/* Forms Container */}
      <div className="container py-8 space-y-8">
        <FormCopy copyNumber={1} />
        <FormCopy copyNumber={2} />
      </div>
    </div>
  );
};

export default OrderForm;
