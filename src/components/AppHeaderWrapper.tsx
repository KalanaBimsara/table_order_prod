import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { useEffect, useState } from "react";
import { Moon, Sun, Factory, Shield, Menu, X, Home, Package, History, Settings, Table, FileText } from "lucide-react";
import { useTheme } from "@/components/ui/theme-provider";
import NotificationButton from "@/components/NotificationButton";
import { useApp } from "@/contexts/AppContext";
const AppHeaderWrapper = () => {
  const {
    user,
    signOut
  } = useAuth();
  const {
    userRole
  } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const {
    theme,
    setTheme
  } = useTheme();
  useEffect(() => {
    setMounted(true);
  }, []);
  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  // Menu items based on user role
  const menuItems = [{
    href: '/',
    label: 'Dashboard',
    icon: Home
  }, {
    href: '/orders',
    label: 'Orders',
    icon: Package
  }, {
    href: '/history',
    label: 'Order History',
    icon: History
  }, {
    href: '/invoicing',
    label: 'Invoicing',
    icon: FileText
  }, {
    href: '/bill-history',
    label: 'Bill History',
    icon: FileText
  }];
  if (userRole === 'admin') {
    menuItems.push({
      href: '/production',
      label: 'Production',
      icon: Factory
    }, {
      href: '/production-queue',
      label: 'Production Queue',
      icon: Factory
    });
  }
  if (userRole === 'manager' || userRole === 'admin') {
    menuItems.push({
      href: '/management',
      label: 'Management',
      icon: Settings
    });
  }
  if (userRole === 'admin') {
    menuItems.push({
      href: '/super-admin/login',
      label: 'Super Admin',
      icon: Shield
    });
  }
  return <header className="bg-background sticky top-0 z-40 w-full border-b">
      <div className="container flex h-16 items-center justify-between py-4">
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="mr-2 relative">
              <div className={`transition-all duration-300 ${menuOpen ? 'rotate-90 opacity-0' : 'rotate-0 opacity-100'}`}>
                <Menu className="h-5 w-5" />
              </div>
              <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${menuOpen ? 'rotate-0 opacity-100' : '-rotate-90 opacity-0'}`}>
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
              {menuItems.map((item, idx) => <button key={item.href} onClick={() => {
              navigate(item.href);
              setMenuOpen(false);
            }} className={`px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-3 w-full text-left ${location.pathname === item.href ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`} style={{
              animationDelay: `${idx * 50}ms`
            }}>
                  <item.icon size={18} />
                  {item.label}
                </button>)}
            </nav>
          </SheetContent>
        </Sheet>

        <Button variant="ghost" onClick={() => navigate("/")} className="ml-2">
          Table Flow
        </Button>

        <div className="flex items-center space-x-2 sm:space-x-4"> {/* Adjusted space-x for mobile */}

          {/* ✅ Show "Production" button for admin users */}
          {userRole === "admin"}

          {/* ✅ Show "Production Queue" button for admin and manager users */}
          {userRole === "admin" || userRole === "manager"}

          {/* ✅ Show "Management Dashboard" button for admin and manager users */}
          {userRole === "admin" || userRole === "manager"}

          {/* ✅ Show "Super Admin" button for admin users */}
          {userRole === "admin"}

          {mounted && <Button variant="ghost" size="icon" onClick={toggleTheme}>
              <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>}

          {user ? <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="https://github.com/shadcn.png" alt="User" />
                    <AvatarFallback>U</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {userRole === "admin" && <>
                    <DropdownMenuItem onClick={() => navigate("/super-admin/login")}>
                      <Shield className="mr-2 h-4 w-4" />
                      Super Admin
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>}
                <DropdownMenuItem onClick={() => signOut()}>
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu> : <Button onClick={() => navigate("/auth")} size={isMobile ? "sm" : "default"}> {/* Optionally adjust login button size too */}
              {isMobile ? "Login" : "Login / Register"}
            </Button>}

          <NotificationButton />
        </div>
      </div>
    </header>;
};
export default AppHeaderWrapper;