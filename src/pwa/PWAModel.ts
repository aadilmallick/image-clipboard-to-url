export class PWAModel {
  static isInPWA() {
    let displayMode = "browser tab";
    if (window.matchMedia("(display-mode: standalone)").matches) {
      displayMode = "standalone";
    }
    return displayMode === "standalone";
  }

  /**
   * runs when the app is installed
   * @param cb callback function to run when the app is installed
   */
  static onAppInstalled(cb: () => void) {
    window.addEventListener("appinstalled", cb);
  }

  static installPWA() {
    let bipEvent: BeforeInstallPromptEvent | null = null;

    return {
      install: async () => {
        if (bipEvent) {
          await bipEvent.prompt();
          const choiceResult = await bipEvent.userChoice;
          console.log(bipEvent);
          return choiceResult.outcome === "accepted";
        } else {
          throw new Error("Install prompt not available");
        }
      },
      setupInstallPrompt: () => {
        // if the app is not in display mode, and the install prompt is available, then we can install
        window.addEventListener("beforeinstallprompt", (event: Event) => {
          //   event.preventDefault();
          bipEvent = event as BeforeInstallPromptEvent;
        });
      },
    };
  }

  static showInstallPromptBanner({
    banner,
    installButton,
    onInstallSuccess,
    onInstallFailure,
    onAlreadyInstalled,
  }: {
    banner: HTMLElement;
    installButton: HTMLButtonElement;
    onInstallSuccess?: () => void;
    onInstallFailure?: () => void;
    onAlreadyInstalled?: () => void;
  }) {
    banner.style.display = "block";
    const { setupInstallPrompt, install } = PWAModel.installPWA();

    // 1. register the install prompt with event listener
    setupInstallPrompt();

    if (!PWAModel.isInPWA()) {
      // 2. add event listener to button for installation, remove banner on success.
      const controller = new AbortController();
      installButton.addEventListener(
        "click",
        async () => {
          const success = await install();
          if (success) {
            banner.remove();
            controller.abort();
            onInstallSuccess?.();
          } else {
            onInstallFailure?.();
          }
        },
        {
          signal: controller.signal,
        }
      );

      // 3. add the banner to the body if it's not already there
      if (!document.body.contains(banner)) {
        document.body.appendChild(banner);
      } else {
        banner.style.display = "block";
      }
    } else {
      onAlreadyInstalled?.();
    }
  }
}

export class PWAServiceWorkerClient {
  static async registerWorker(url: string) {
    return await navigator.serviceWorker.register(url, {
      type: "module",
      scope: "/",
    });
  }

  static async getCurrentWorker() {
    return await navigator.serviceWorker.ready;
  }

  static async onWorkerChange(cb: (worker: ServiceWorker) => void) {
    navigator.serviceWorker.addEventListener("controllerchange", (event) => {
      cb(event.target as ServiceWorker);
    });
  }
}

export class PWABadger {
  static isBadgeSupported() {
    return "setAppBadge" in navigator && "clearAppBadge" in navigator;
  }

  static async setBadge(badge: number) {
    if (navigator.setAppBadge) {
      await navigator.setAppBadge(badge);
    }
  }

  static async clearBadge() {
    if (navigator.clearAppBadge) {
      await navigator.clearAppBadge();
    }
  }
}

export class MessageSystem<T extends Record<string, any>> {
  getDispatchMessage<K extends keyof T>(key: K, payload: T[K]) {
    return {
      type: key,
      payload,
    };
  }

  messageIsOfType<K extends keyof T>(key: K, message: any): message is T[K] {
    return message.type === key;
  }
}
