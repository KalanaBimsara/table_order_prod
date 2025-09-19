import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { useEffect, useState } from "react";
import { Moon, Sun, Factory, Shield } from "lucide-react";
import { useTheme } from "@/components/ui/theme-provider";
import NotificationButton from "@/components/NotificationButton";
import { useApp } from "@/contexts/AppContext";

const AppHeaderWrapper = () => {
  const { user, signOut } = useAuth();
  const { userRole } = useApp();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  return (
    <header className="bg-background sticky top-0 z-40 w-full border-b">
      <div className="container flex h-16 items-center justify-between py-4">
        <Button variant="ghost" onClick={() => navigate("/")}>
          Table Flow
        </Button>

        <div className="flex items-center space-x-2 sm:space-x-4"> {/* Adjusted space-x for mobile */}

          {/* ✅ Show "Production" button for admin users */}
          {userRole === "admin" && (
            <Button
              variant="outline"
              onClick={() => navigate("/production")}
              size={isMobile ? "icon" : "default"}
              aria-label={isMobile ? "Production" : undefined}
            >
              <Factory size={16} className={isMobile ? "" : "mr-2"} />
              {!isMobile && "Production"}
            </Button>
          )}

          {/* ✅ Show "Production Queue" button for admin and manager users */}
          {(userRole === "admin" || userRole === "manager") && (
            <Button
              variant="outline"
              onClick={() => navigate("/production-queue")}
              size={isMobile ? "icon" : "default"}
              aria-label={isMobile ? "Production Queue" : undefined}
            >
              <Factory size={16} className={isMobile ? "" : "mr-2"} />
              {!isMobile && "Production Queue"}
            </Button>
          )}

          {/* ✅ Show "Super Admin" button for admin users */}
          {userRole === "admin" && (
            <Button
              variant="outline"
              onClick={() => navigate("/super-admin/login")}
              className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
              size={isMobile ? "icon" : "default"}
              aria-label={isMobile ? "Super Admin" : undefined}
            >
              <Shield size={16} className={isMobile ? "" : "mr-2"} />
              {!isMobile && "Super Admin"}
            </Button>
          )}

          {mounted && (
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
          )}

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src="https://github.com/shadcn.png"
                      alt="User"
                    />
                    <AvatarFallback>U</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {userRole === "admin" && (
                  <>
                    <DropdownMenuItem onClick={() => navigate("/super-admin/login")}>
                      <Shield className="mr-2 h-4 w-4" />
                      Super Admin
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={() => signOut()}>
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button onClick={() => navigate("/auth")} size={isMobile ? "sm" : "default"}> {/* Optionally adjust login button size too */}
              {isMobile ? "Login" : "Login / Register"}
            </Button>
          )}

          <NotificationButton />
        </div>
      </div>
    </header>
  );
};

export default AppHeaderWrapper;
