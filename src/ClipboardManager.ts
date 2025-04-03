export default class ClipboardModel {
  static async readText() {
    try {
      return await navigator.clipboard.readText();
    } catch (err) {
      return null;
    }
  }

  static async readClipboardDataAsText() {
    if (await ClipboardModel.hasTextCopied()) {
      const [clipboardItem] = await navigator.clipboard.read();
      let blob = await clipboardItem.getType("text/plain");
      return blob.text();
    }
    return null;
  }

  static async readClipboardDataAsHTML() {
    if (await ClipboardModel.hasTextCopied()) {
      const [clipboardItem] = await navigator.clipboard.read();
      let blob = await clipboardItem.getType("text/html");
      return blob.text();
    }
    return null;
  }

  static async readClipboardDataAsImage(options?: { asBlob?: boolean }) {
    if (await ClipboardModel.hasImageCopied()) {
      const [clipboardItem] = await navigator.clipboard.read();
      const mimeType = clipboardItem.types.find((type) =>
        type.startsWith("image/")
      );
      if (!mimeType) return null;
      const blob = await clipboardItem.getType(mimeType);
      if (options?.asBlob) {
        return blob;
      }
      const blobUrl = URL.createObjectURL(blob);
      return blobUrl;
    }
    return null;
  }

  static async copyText(text: string) {
    await navigator.clipboard.writeText(text);
  }

  static async hasTextCopied() {
    const [clipboardItem] = await navigator.clipboard.read();
    const typeMapping = clipboardItem.types.map((type) => type.split("/")[0]);
    return typeMapping.includes("text");
  }

  static async hasImageCopied() {
    const [clipboardItem] = await navigator.clipboard.read();
    const typeMapping = clipboardItem.types.map((type) => type.split("/")[0]);
    return typeMapping.includes("image");
  }

  static async copyImage(path: string, mimeType: `image/${string}`) {
    if (mimeType === "image/png") {
      const response = await fetch(path);
      const imageBlob = await response.blob();
      await ClipboardModel.copyBlobToClipboard(imageBlob, mimeType);
    } else {
      const imageBlob = await ClipboardModel.setCanvasImage(path);
      await ClipboardModel.copyBlobToClipboard(imageBlob, mimeType);
    }
  }

  private static async copyBlobToClipboard(blob: Blob, mimeType: string) {
    const data = [ClipboardModel.createClipboardItem(blob, mimeType)];
    await navigator.clipboard.write(data);
  }

  private static createClipboardItem(blob: Blob, mimeType: string) {
    const _blob = new Blob([blob], { type: mimeType });
    return new ClipboardItem({ [mimeType]: _blob });
  }

  private static setCanvasImage(path: string): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const c = document.createElement("canvas");
      const ctx = c.getContext("2d")!;

      img.onload = function () {
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        ctx.drawImage(img, 0, 0);
        c.toBlob((blob) => {
          if (!blob) {
            reject("Failed to convert canvas to blob");
          } else {
            resolve(blob);
          }
        }, `image/png`);
      };
      img.src = path;
    });
  }
}
