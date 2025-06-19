import { App } from "./App";
import ClipboardModel from "./ClipboardManager";
import { FileElement } from "./FileElement";
import ImageConverter from "./ImageConverter";
import { ImageManager } from "./ImageManager";
import { PWAModel } from "./pwa/PWAModel";
import "./style.css";
import { DOM, html } from "./utils";
import Toaster from "./web-components/Toaster";

Toaster.registerSelf();

const fileInput = DOM.$throw("#file-upload") as HTMLInputElement;
const fileUploadHandler = new FileElement(fileInput);

const app = new App();
app.setShowSettings(false);

const globalStore = {
  blobUrl: null as string | null,
  transformedBlob: null as Blob | null,
  loading: false,
  originalBlob: null as Blob | null,
  originalFile: null as File | null,
  resetState: () => {
    if (globalStore.blobUrl) {
      URL.revokeObjectURL(globalStore.blobUrl);
      globalStore.blobUrl = null;
      globalStore.originalBlob = null;
      globalStore.transformedBlob = null;
      globalStore.loading = false;
    }
  },
  setBlob: (blob: Blob | File) => {
    globalStore.originalBlob = blob;
    const blobUrl = URL.createObjectURL(blob);
    globalStore.blobUrl = blobUrl;
    return blobUrl;
  },
};

fileUploadHandler.onSingleFileUpload(async (file) => {
  globalStore.resetState();
  const blobUrl = globalStore.setBlob(file);

  app.onNewPaste(blobUrl);
  app.addBlobInfo(file.size);
  setUploadImageListener(file);
});

document.addEventListener("paste", async (e) => {
  e.preventDefault();

  globalStore.resetState();
  // * stage 1: read image from clipboard
  const blob = (await ClipboardModel.readClipboardDataAsImage({
    asBlob: true,
  })) as Blob;
  if (!blob) {
    Toaster.toast("No image found in clipboard", "danger");
    throw new Error("No image found");
  }
  console.log(blob);

  // display image in box
  const blobUrl = globalStore.setBlob(blob);
  app.onNewPaste(blobUrl);
  app.addBlobInfo(blob.size);
  setUploadImageListener(blob);
});

// on ctrl + b press download blob of current image
document.addEventListener("keydown", async (e) => {
  if (e.ctrlKey && e.key === "b") {
    e.preventDefault();
    if (!globalStore.originalBlob || !globalStore.blobUrl) {
      Toaster.toast("No image found", "danger");
      throw new Error("No image found");
    }
    if (globalStore.loading) {
      return;
    }
    // app.onDownload(blobUrl);
    globalStore.loading = true;
    Toaster.toast("Downloading image...", "info");
    const { downloadType, resizeBasedOnDisplayDims, resizeSettings } =
      app.getSettings();
    const transformedBlob = await transformImage(globalStore.originalBlob!, {
      resizeSettings,
      resizeBasedOnDisplayDims,
      type: downloadType,
    });

    app.addBlobInfo(transformedBlob.size);
    globalStore.loading = false;
    Toaster.toast("Downloaded Image!", "success");

    ImageConverter.downloadBlob(transformedBlob);
  }
  if (e.ctrlKey && e.key === "d") {
    e.preventDefault();
    if (!globalStore.originalBlob || !globalStore.blobUrl) {
      Toaster.toast("No image found", "danger");
      throw new Error("No image found");
    }
    if (globalStore.loading) {
      return;
    }
    // app.onDownload(blobUrl);
    globalStore.loading = true;
    Toaster.toast("Downloading image...", "info");

    app.addBlobInfo(globalStore.originalBlob!.size);
    globalStore.loading = false;
    Toaster.toast("Downloaded Image!", "success");

    ImageConverter.downloadBlob(globalStore.originalBlob!);
  }
  if (e.ctrlKey && e.key === "y") {
    e.preventDefault();
    if (!globalStore.originalBlob || !globalStore.blobUrl) {
      Toaster.toast("No image found", "danger");
      throw new Error("No image found");
    }
    if (globalStore.loading) {
      return;
    }
    // app.onDownload(blobUrl);
    globalStore.loading = true;

    Toaster.toast("Uploading image...", "info");

    app.addBlobInfo(globalStore.originalBlob!.size);
    globalStore.loading = false;

    uploadImage(globalStore.originalBlob!);
  }
  if (e.ctrlKey && e.key === "x") {
    e.preventDefault();
    if (!globalStore.originalBlob || !globalStore.blobUrl) {
      Toaster.toast("No image found", "danger");
      throw new Error("No image found");
    }
    if (globalStore.loading) {
      return;
    }
    globalStore.loading = true;
    Toaster.toast("Copying transformed image...", "info");
    const { downloadType, resizeBasedOnDisplayDims, resizeSettings } =
      app.getSettings();
    const transformedBlob = await transformImage(globalStore.originalBlob!, {
      resizeSettings,
      resizeBasedOnDisplayDims,
      type: downloadType,
    });

    app.addBlobInfo(transformedBlob.size);
    await ClipboardModel.copyImageBlob(transformedBlob);
    globalStore.loading = false;
    Toaster.toast("Copied transformed image!", "success");
  }
});

async function setUploadImageListener(blob: Blob) {
  app.onUpload(async () => {
    // * stage 2: compress image and convert to webp
    globalStore.loading = true;
    app.handleAppLoading(true);
    Toaster.toast("Compressing image...", "info");
    const { downloadType, resizeBasedOnDisplayDims, resizeSettings } =
      app.getSettings();
    const transformedBlob = await transformImage(blob, {
      resizeSettings,
      resizeBasedOnDisplayDims,
      type: downloadType,
    });
    // * stage 3: upload image to cloudinary
    const uploadUrl = await uploadImage(transformedBlob);
    console.log(uploadUrl);
    app.handleAppLoading(false);
  });
}

function getFileExtensionFromMimeType(mimeType: string): string {
  const mimeToExtensionMap: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/bmp": "bmp",
    "image/svg+xml": "svg",
    "image/tiff": "tiff",
    "image/x-icon": "ico",
  };

  return mimeToExtensionMap[mimeType] || "bin"; // Default to "bin" if mime type is unknown
}

async function uploadImage(blob: Blob) {
  if (!navigator.onLine) {
    Toaster.toast("No internet connection. Can't upload image.", "danger");
    return null;
  }
  const imageManager = new ImageManager();
  const file = new File(
    [blob],
    `image-${crypto.randomUUID()}.${getFileExtensionFromMimeType(blob.type)}`,
    {
      type: blob.type,
    }
  );
  console.log(file);
  app.addBlobInfo(file.size);

  try {
    const url = await imageManager.uploadFile(file);
    console.log(url);
    app.addUploadUrl(url);
    return url;
  } catch (e) {
    Toaster.toast("Error uploading image", "danger");
    console.error(e);
    return null;
  } finally {
    globalStore.loading = false;
    Toaster.toast("Uploaded Image!", "success");
    return null;
  }
}

async function transformImage(
  blob: Blob,
  options: {
    type?: "png" | "jpeg" | "webp";
    resizeSettings: {
      resizeWidth: number;
      resizeHeight: number;
      displayWidth: number;
      displayHeight: number;
    };
    resizeBasedOnDisplayDims?: boolean;
  }
) {
  let transformedBlob = blob;
  options.type &&
    (transformedBlob = await ImageConverter.convertImage(blob, options.type));

  // super compress to resize based on display dimensions
  if (options.resizeBasedOnDisplayDims) {
    transformedBlob = await ImageConverter.resizeToDims(
      transformedBlob,
      options.resizeSettings.displayWidth,
      options.resizeSettings.displayHeight
    );
  } else {
    transformedBlob = await ImageConverter.resizeToWidth(
      transformedBlob,
      options.resizeSettings.resizeWidth
    );
  }
  return transformedBlob;
}

const { setupInstallPrompt, install } = PWAModel.installPWA();

setupInstallPrompt();

if (!PWAModel.isInPWA()) {
  const appBanner = DOM.createDomElement(html`
    <div
      class="fixed bottom-4 left-4 bg-white/75 py-2 px-8 text-center rounded-lg shadow-lg space-y-2 z-50 border-2 border-gray-300"
    >
      <p class="text-sm">Install App?</p>
      <button
        class="bg-blue-500 text-white px-4 py-2 rounded-md text-sm cursor-pointer"
      >
        Install
      </button>
    </div>
  `);
  const controller = new AbortController();
  appBanner.querySelector("button")?.addEventListener(
    "click",
    async () => {
      const success = await install();
      if (success) {
        Toaster.toast("App installed!", "success");
        appBanner.remove();
        controller.abort();
      } else {
        Toaster.toast("App not installed", "info");
      }
    },
    {
      signal: controller.signal,
    }
  );
  document.body.appendChild(appBanner);
} else {
  Toaster.toast("App already installed", "info");
}
