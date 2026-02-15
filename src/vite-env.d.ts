/// <reference types="vite/client" />

// Extend ServiceWorkerRegistration with Push API support
declare global {
  interface ServiceWorkerRegistration {
    readonly pushManager: PushManager;
  }

  interface PushManager {
    getSubscription(): Promise<PushSubscription | null>;
    subscribe(options?: PushSubscriptionOptionsInit): Promise<PushSubscription>;
    permissionState(options?: PushSubscriptionOptionsInit): Promise<PushPermissionState>;
  }

  interface PushSubscriptionOptionsInit {
    userVisibleOnly?: boolean;
    applicationServerKey?: BufferSource | string | null;
  }

  type PushPermissionState = 'denied' | 'granted' | 'prompt';
}

export {};
