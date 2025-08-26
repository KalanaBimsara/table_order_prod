
import { Button } from "@/components/ui/button";
import { Bell, BellOff, BellRing } from "lucide-react";
import { useNotification } from "@/hooks/useNotification";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export function NotificationButton() {
  const { isSupported, permission, loading, subscribeToPushNotifications } = useNotification();

  const handleTestNotification = async () => {
    try {
      const showResult = await import("@/services/NotificationService").then(
        module => module.default.testNotification()
      );
      
      if (showResult) {
        toast.success("Test notification sent!");
      } else {
        toast.error("Failed to send test notification");
      }
    } catch (error) {
      console.error("Error testing notification:", error);
      toast.error("Error testing notification");
    }
  };

  if (!isSupported) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" disabled>
            <BellOff className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Push notifications are not supported by your browser</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          disabled={loading}
        >
          {permission === 'granted' ? (
            <BellRing className="h-5 w-5 text-green-500" />
          ) : (
            <Bell className="h-5 w-5" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {permission !== 'granted' && (
          <DropdownMenuItem onClick={subscribeToPushNotifications} disabled={loading}>
            Enable notifications
          </DropdownMenuItem>
        )}
        {permission === 'granted' && (
          <DropdownMenuItem onClick={handleTestNotification}>
            Test notification
          </DropdownMenuItem>
        )}
        {permission === 'denied' && (
          <DropdownMenuItem disabled>
            Notifications blocked (update browser settings)
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default NotificationButton;
