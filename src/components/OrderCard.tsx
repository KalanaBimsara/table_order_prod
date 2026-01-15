import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { MapPin, Phone, Package, Palette, Hash, Calendar, CheckCircle2, Truck, StickyNote, Table, Trash2, DollarSign, User, UserPlus, LockKeyhole, Edit, FileText } from 'lucide-react';
import EditOrderForm from './EditOrderForm';
import CreateQuotationDialog from './CreateQuotationDialog';
import { Order, TableItem, tableSizeOptions, colourOptions } from '@/types/order';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useApp } from '@/contexts/AppContext';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type OrderCardProps = {
  order: Order;
  onComplete?: () => void;
  actionButton?: React.ReactNode;
  showSalesPerson?: boolean;
};

const DELETE_CONFIRMATION_PASSWORD = "kalana123@";

const OrderCard: React.FC<OrderCardProps> = ({
  order,
  onComplete,
  actionButton,
  showSalesPerson = false
}) => {
  const {
    userRole,
    assignOrder,
    completeOrder,
    deleteOrder,
    getDeliveryPersonName
  } = useApp();
  const {
    user
  } = useAuth();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [deliveryPersonName, setDeliveryPersonName] = useState<string | null>(null);
  const [creatorName, setCreatorName] = useState<string | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Fetch delivery person name directly from profiles table
  // Updated to use the correct field delivery_person_id
  useEffect(() => {
    const fetchDeliveryPersonName = async () => {
      // Make sure we're using the correct field from the order object
      const deliveryPersonId = order.assignedTo || order.delivery_person_id;
      if (deliveryPersonId) {
        try {
          const {
            data,
            error
          } = await supabase.from('profiles').select('name').eq('id', deliveryPersonId).maybeSingle();
          if (error) {
            console.error('Error fetching delivery person name:', error);
            setDeliveryPersonName('Unknown Delivery Person');
            return;
          }
          if (data && data.name) {
            setDeliveryPersonName(data.name);
          } else {
            setDeliveryPersonName('Unnamed Delivery Person');
          }
        } catch (error) {
          console.error('Error in fetching delivery person name:', error);
          setDeliveryPersonName('Unknown Delivery Person');
        }
      }
    };

    // Check both possible field names for the delivery person ID
    if (order.assignedTo || order.delivery_person_id) {
      fetchDeliveryPersonName();
    }
  }, [order.assignedTo, order.delivery_person_id]);

  // Fetch order creator name from profiles table
  useEffect(() => {
    const fetchCreatorName = async () => {
      if (order.createdBy && (userRole === 'admin' || userRole === 'delivery')) {
        try {
          const {
            data,
            error
          } = await supabase.from('profiles').select('name').eq('id', order.createdBy).maybeSingle();
          if (error) {
            console.error('Error fetching creator name:', error);
            setCreatorName('Unknown User');
            return;
          }
          if (data && data.name) {
            setCreatorName(data.name);
          } else {
            setCreatorName('Unnamed User');
          }
        } catch (error) {
          console.error('Error in fetching creator name:', error);
          setCreatorName('Unknown User');
        }
      }
    };
    if (order.createdBy && (userRole === 'admin' || userRole === 'delivery')) {
      fetchCreatorName();
    }
  }, [order.createdBy, userRole]);

  const handleAssignOrder = () => {
    if (!user) {
      toast.error("You must be logged in to assign orders");
      return;
    }
    assignOrder(order.id, user.id);
  };
  const handleCompleteOrder = () => {
    if (onComplete) {
      onComplete();
    } else {
      completeOrder(order.id);
    }
  };
  const handleDeleteOrder = () => {
    deleteOrder(order.id);
  };
  const handleDeleteOrderWithPassword = () => {
    if (deletePassword === DELETE_CONFIRMATION_PASSWORD) {
      deleteOrder(order.id);
      toast.success('Order deleted successfully!');
      setIsDeleteDialogOpen(false);
      setDeletePassword(''); // Reset password
    } else {
      toast.error('Incorrect password. Order not deleted.');
    }
  };
  const openDeleteDialog = () => {
    setDeletePassword(''); // Clear password field when dialog opens
    setIsDeleteDialogOpen(true);
  };
  const closeDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setDeletePassword(''); // Clear password field when dialog closes
  };
  const getTableSizeLabel = (value: string) => {
    const option = tableSizeOptions.find(opt => opt.value === value);
    return option ? option.label : value;
  };
  const getColourLabel = (value: string) => {
    const option = colourOptions.find(opt => opt.value === value);
    return option ? option.label : value;
  };
  const getStatusBadge = () => {
    switch (order.status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20 text-sm md:text-base px-2 md:px-3 py-1">Pending</Badge>;
      case 'assigned':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 text-sm md:text-base px-2 md:px-3 py-1">Assigned</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20 text-sm md:text-base px-2 md:px-3 py-1">Completed</Badge>;
      default:
        return null;
    }
  };
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'LKR',
      maximumFractionDigits: 0
    }).format(price);
  };
  return <Card className={`order-card ${order.status === 'pending' ? 'order-pending' : order.status === 'assigned' ? 'order-assigned' : 'order-completed'} ${isMobile ? 'text-base' : 'text-lg'}`}>
      <CardContent className="pt-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-4 relative">
          <h3 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold`}>
            {order.customerName}
          </h3>
        
          <div className="flex flex-col sm:items-end gap-1">
            {/* Order number top-right */}
            {(order.order_form_number || order.orderFormNumber) && (
              <span className="text-sm font-semibold text-muted-foreground bg-muted px-3 py-1 rounded-full shadow-sm">
                #{order.order_form_number || order.orderFormNumber}
              </span>
            )}
            {getStatusBadge()}
          </div>
        </div>

        <div className="space-y-3 text-sm sm:text-base">
          <div className="flex items-center gap-2">
            <MapPin size={isMobile ? 18 : 24} className="flex-shrink-0 text-muted-foreground" />
            <span className="font-medium break-words break-all whitespace-normal">
              {order.address}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Phone size={isMobile ? 18 : 24} className="flex-shrink-0 text-muted-foreground" />
            <a href={`tel:${order.contactNumber}`} className="font-medium text-blue-600 hover:underline">
              {order.contactNumber}
            </a>
          </div>
          
          <div className="mt-3">
            <div className="flex items-center gap-2 mb-2">
              <Table size={isMobile ? 18 : 24} className="flex-shrink-0 text-muted-foreground" />
              <span className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold`}>Table Details</span>
            </div>
            
            <div className="space-y-3">
              {order.tables && order.tables.length > 0 ? order.tables.map((table, index) => <div key={table.id || index} className="border border-border p-2 md:p-4 rounded-lg bg-muted/50">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm md:text-base">
                      <div className="flex items-center gap-2">
                        <Package size={isMobile ? 16 : 20} className="flex-shrink-0 text-muted-foreground" />
                        <span className="font-medium">Size: {getTableSizeLabel(table.size)}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Palette size={isMobile ? 16 : 20} className="flex-shrink-0 text-muted-foreground" />
                        <span className="font-medium">Top Colour: {getColourLabel(table.topColour)}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Palette size={isMobile ? 16 : 20} className="flex-shrink-0 text-muted-foreground" />
                        <span className="font-medium">Leg Colour: {getColourLabel(table.frameColour)}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Hash size={isMobile ? 16 : 20} className="flex-shrink-0 text-muted-foreground" />
                        <span className="font-medium">Quantity: {table.quantity} {table.quantity > 1 ? 'tables' : 'table'}</span>
                      </div>
                    </div>
                    
                    {/* Customization details */}
                    {(table.legSize || table.legHeight || table.wireHoles) && (
                      <div className="mt-3 pt-2 border-t border-border">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs md:text-sm">
                          {table.legSize && (
                            <div className="text-muted-foreground">
                              <span>Leg Size: </span>
                              <span className="font-medium text-foreground">{table.legSize}</span>
                            </div>
                          )}
                          {table.legHeight && (
                            <div className="text-muted-foreground">
                              <span>Leg Height: </span>
                              <span className="font-medium text-foreground">{table.legHeight}</span>
                            </div>
                          )}
                          {table.wireHoles && table.wireHoles !== 'no wire holes' && (
                            <div className="text-muted-foreground sm:col-span-2">
                              <span>Wire Holes: </span>
                              <span className="font-medium text-foreground">{table.wireHoles}</span>
                              {table.wireHoles === 'special' && table.wireHolesComment && (
                                <span className="block mt-1 text-blue-600 italic">{table.wireHolesComment}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>) : <p className="text-muted-foreground text-sm md:text-base">No table details available.</p>}
              
              <div className="flex justify-end items-center gap-2 pt-3 border-t">
                <DollarSign size={isMobile ? 18 : 24} className="flex-shrink-0 text-muted-foreground" />
                <span className="text-lg font-bold">Total: {formatPrice(order.totalPrice || 0)}</span>
              </div>
            </div>
          </div>
          
          {order.note && <div className="flex items-center gap-2 mt-3">
              <StickyNote size={isMobile ? 18 : 24} className="flex-shrink-0 text-muted-foreground" />
              <span className="min-w-0 whitespace-normal break-all sm:break-words text-red-600 dark:text-red-400 font-bold text-lg">{order.note}</span>
            </div>}
          
          {order.deliveryDate && (
            <div className="flex items-center gap-2 mt-3">
              <Truck size={isMobile ? 18 : 24} className="flex-shrink-0 text-orange-500" />
              <span className="font-medium text-orange-600 dark:text-orange-400">
                Delivery Date: {format(new Date(order.deliveryDate), 'MMM d, yyyy')}
              </span>
            </div>
          )}
          
          <div className="flex items-center gap-2 mt-3">
            <Calendar size={isMobile ? 18 : 24} className="flex-shrink-0 text-muted-foreground" />
            <span className="font-medium">
              Created: {format(new Date(order.createdAt), 'MMM d, yyyy, h:mm a')}
            </span>
          </div>

          {showSalesPerson && order.salesPersonName && (
            <div className="flex items-center gap-2 mt-3">
              <UserPlus size={isMobile ? 18 : 24} className="flex-shrink-0 text-muted-foreground" />
              <span className="font-medium text-green-600 dark:text-green-400">
                Sales Person: {order.salesPersonName}
              </span>
            </div>
          )}

          {(userRole === 'admin' || userRole === 'delivery') && order.createdBy && !showSalesPerson && <div className="flex items-center gap-2 mt-3">
              <UserPlus size={isMobile ? 18 : 24} className="flex-shrink-0 text-muted-foreground" />
              <span className="font-medium text-green-600 dark:text-green-400">
                Sales Person: {creatorName || "Loading..."}
              </span>
            </div>}
          
          {/* Update condition to check both possible field names */}
          {(order.status === 'assigned' || order.status === 'completed') && (order.assignedTo || order.delivery_person_id) && <div className="flex items-center gap-2 mt-3">
              <User size={isMobile ? 18 : 24} className="flex-shrink-0 text-muted-foreground" />
              <span className="font-medium text-sky-600 dark:text-sky-400 text-base">
                Delivery Assigned to: {deliveryPersonName || "Loading..."}
              </span>
            </div>}
          
          {order.status === 'assigned' && !order.assignedTo && !order.delivery_person_id && <div className="flex items-center gap-2 mt-3">
              <Truck size={isMobile ? 18 : 24} className="flex-shrink-0 text-muted-foreground" />
              <span className="font-medium">Assigned to delivery</span>
            </div>}
          
          {order.status === 'completed' && order.completedAt && <div className="flex items-center gap-2 mt-3">
              <CheckCircle2 size={isMobile ? 18 : 24} className="flex-shrink-0 text-muted-foreground" />
              <span className="font-medium">Completed: {format(new Date(order.completedAt), 'MMM d, yyyy')}</span>
            </div>}
        </div>
      </CardContent>
      
      <CardFooter className={`flex flex-wrap gap-2 ${isMobile ? 'justify-center' : 'justify-end'}`}>
        {/* Quotation button - show for pending and assigned orders */}
        {(order.status === 'pending' || order.status === 'assigned') && (
          <CreateQuotationDialog order={order} isMobile={isMobile} />
        )}
        
        {/* Invoice button - only show for completed orders */}
        {order.status === 'completed' && (
          <Button 
            size={isMobile ? "sm" : "default"} 
            variant="outline" 
            onClick={() => navigate(`/invoice/${order.id}`)}
            className={`${isMobile ? 'text-sm w-full sm:w-auto' : 'text-base'}`}
          >
            <FileText size={isMobile ? 14 : 18} className="mr-1" />
            Invoice
          </Button>
        )}
        
        {/* Edit button - only show for order creator and only for pending orders */}
        {user && order.createdBy === user.id && order.status === 'pending' && (
          <Button 
            size={isMobile ? "sm" : "default"} 
            variant="outline" 
            onClick={() => setIsEditDialogOpen(true)}
            className={`${isMobile ? 'text-sm w-full sm:w-auto' : 'text-base'}`}
          >
            <Edit size={isMobile ? 14 : 18} className="mr-1" />
            Edit Order
          </Button>
        )}
        
        {userRole === 'admin' && order.status === 'pending' && <Button size={isMobile ? "sm" : "default"} variant="outline" onClick={handleAssignOrder} className={`${isMobile ? 'text-sm w-full sm:w-auto' : 'text-base'}`}>
            Assign to Delivery
          </Button>}
        
        {(userRole === 'admin' && order.status === 'assigned' || userRole === 'delivery' && order.status === 'assigned') && 
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size={isMobile ? "sm" : "default"} variant="default" className={`${isMobile ? 'text-sm w-full sm:w-auto' : 'text-base'}`}>
                Mark Complete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm Order Completion</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to mark this order as completed? This action will finalize the order for customer "{order.customerName}".
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleCompleteOrder}>
                  Yes, Mark Complete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        }

        {actionButton && <div className="w-full sm:w-auto">{actionButton}</div>}
        
        {userRole === 'admin' && (
          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button
                size={isMobile ? "sm" : "default"}
                variant="destructive"
                className={`${isMobile ? 'text-sm w-full sm:w-auto' : 'text-base'} btn-delete-faded`}
                onClick={openDeleteDialog}
              >
                <Trash2 size={isMobile ? 14 : 18} className="mr-1" />
                Delete Order
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm Order Deletion</AlertDialogTitle>
                <AlertDialogDescription>
                  To delete this order, please enter the confirmation password. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-2 my-4">
                <Label htmlFor="delete-password">Password</Label>
                <div className="flex items-center space-x-2">
                  <LockKeyhole className="h-5 w-5 text-muted-foreground" />
                  <Input
                    id="delete-password"
                    type="password"
                    placeholder="Enter deletion password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                  />
                </div>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={closeDeleteDialog}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteOrderWithPassword}>
                  Confirm Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
            </AlertDialog>
        )}
        
        {/* Edit Order Dialog */}
        <EditOrderForm 
          order={order}
          isOpen={isEditDialogOpen}
          onClose={() => setIsEditDialogOpen(false)}
        />
      </CardFooter>
    </Card>;
};

export default OrderCard;
