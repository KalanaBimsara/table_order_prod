import React from 'react';
import {
  Menu,
  Home,
  Package,
  History,
  Table,
  X,
  ShoppingBag,
  Factory,
  Settings,
  MapPin,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useApp } from '@/contexts/AppContext';
import { Link, useLocation } from 'react-router-dom';
import UserMenu from './UserMenu';

const AppHeader = () => {
  const { userRole } = useApp();
  const location = useLocation();
  const [open, setOpen] = React.useState(false);

  // All menu items in hamburger
  const menuItems = [
    { href: '/', label: 'Dashboard', icon: Home },
    { href: '/orders', label: 'Orders', icon: Package },
    { href: '/history', label: 'Order History', icon: History },
    { href: '/track', label: 'Track Order', icon: MapPin },
  ];
  
  if (userRole === 'admin') {
    menuItems.push(
      { href: '/production', label: 'Production', icon: Factory },
      { href: '/production-queue', label: 'Production Queue', icon: Factory }
    );
  }

  if (userRole === 'manager' || userRole === 'admin') {
    menuItems.push({ href: '/management', label: 'Management', icon: Settings });
  }

  if (userRole === 'admin') {
    menuItems.push({ href: '/super-admin/dashboard', label: 'Super Admin', icon: Settings });
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
      <div className="container flex h-14 items-center">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="relative overflow-hidden">
                <div className={`transition-all duration-300 ${open ? 'rotate-90 opacity-0' : 'rotate-0 opacity-100'}`}>
                  <Menu className="h-5 w-5" />
                </div>
                <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${open ? 'rotate-0 opacity-100' : '-rotate-90 opacity-0'}`}>
                  <X className="h-5 w-5" />
                </div>
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] sm:w-[320px] p-0">
              <div className="flex items-center justify-between p-6 pb-4 border-b">
                <div className="flex items-center font-semibold">
                  <Table className="h-6 w-6 mr-2 text-primary" />
                  <span className="text-lg">Menu</span>
                </div>
              </div>
              <nav className="flex flex-col p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-100px)]">
                {menuItems.map((item, idx) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={`px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-3 animate-fade-in ${
                      location.pathname === item.href
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                    style={{ animationDelay: `${idx * 50}ms` }}
                    onClick={() => setOpen(false)}
                  >
                    <item.icon size={18} />
                    {item.label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>

        <div className="flex items-center mr-4 font-semibold ml-2">
          <Table className="h-6 w-6 mr-2" />
          <span className="hidden sm:inline">TableFlow</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Link to="/order">
            <Button variant="default" className="hidden md:flex">
              <ShoppingBag size={16} className="mr-2" />
              Place Order
            </Button>
          </Link>
          <UserMenu />
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
