import { App } from "./App";
import ClipboardModel from "./ClipboardManager";
import { FileElement } from "./FileElement";
import ImageConverter from "./ImageConverter";
import { ImageManager } from "./ImageManager";
import "./style.css";
import { DOM } from "./utils";
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
    const transformedBlob = await transformImage(globalStore.originalBlob, {
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

    app.addBlobInfo(globalStore.originalBlob.size);
    globalStore.loading = false;
    Toaster.toast("Downloaded Image!", "success");

    ImageConverter.downloadBlob(globalStore.originalBlob);
  }
});

async function setUploadImageListener(blob: Blob) {
  app.onUpload(async () => {
    // * stage 2: compress image and convert to webp
    globalStore.loading = true;
    Toaster.toast("Compressing image...", "info");
    const { downloadType, resizeBasedOnDisplayDims, resizeSettings } =
      app.getSettings();
    const transformedBlob = await transformImage(blob, {
      resizeSettings,
      resizeBasedOnDisplayDims,
      type: downloadType,
    });
    // * stage 3: upload image to cloudinary
    const imageManager = new ImageManager();
    const file = new File(
      [transformedBlob],
      `image-${crypto.randomUUID()}.${blob.type}`,
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
    } catch (e) {
      Toaster.toast("Error uploading image", "danger");
      console.error(e);
    } finally {
      globalStore.loading = false;
      Toaster.toast("Uploaded Image!", "success");
    }
  });
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
