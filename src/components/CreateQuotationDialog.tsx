import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { Order } from '@/types/order';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

type CreateQuotationDialogProps = {
  order: Order;
  isMobile?: boolean;
};

const businessNames = [
  "Niayana Furniture",
  "Table LK",
  "Maduwa Furniture",
  "Smart Desk Lanka",
  "Bisora Furniture"
];

const CreateQuotationDialog: React.FC<CreateQuotationDialogProps> = ({
  order,
  isMobile = false
}) => {
  const [selectedBusiness, setSelectedBusiness] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const handleCreateQuotation = () => {
    if (!selectedBusiness) {
      toast.error('Please select a business name');
      return;
    }

    // Create quotation and navigate to invoice page with business name
    const quotationData = {
      ...order,
      businessName: selectedBusiness,
      isQuotation: true
    };

    // Store the quotation data in localStorage temporarily
    localStorage.setItem(`quotation-${order.id}`, JSON.stringify(quotationData));
    
    // Navigate to invoice page with quotation flag
    navigate(`/invoice/${order.id}?quotation=true&business=${encodeURIComponent(selectedBusiness)}`);
    
    setIsOpen(false);
    toast.success('Quotation created successfully!');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          size={isMobile ? "sm" : "default"} 
          variant="outline" 
          className={`${isMobile ? 'text-sm w-full sm:w-auto' : 'text-base'}`}
        >
          <FileText size={isMobile ? 14 : 18} className="mr-1" />
          Create Quotation
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Quotation</DialogTitle>
          <DialogDescription>
            Select a business name to create a quotation for order #{order.id.slice(0, 8)}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="business" className="text-right">
              Business
            </Label>
            <div className="col-span-3">
              <Select value={selectedBusiness} onValueChange={setSelectedBusiness}>
                <SelectTrigger>
                  <SelectValue placeholder="Select business name" />
                </SelectTrigger>
                <SelectContent>
                  {businessNames.map((business) => (
                    <SelectItem key={business} value={business}>
                      {business}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleCreateQuotation}>
            Create Quotation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateQuotationDialog;
