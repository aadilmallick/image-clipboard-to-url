export default class ImageConverter {
  static async resize(image: File | Blob, ratio: number) {
    if (ratio <= 0) {
      throw new Error("Invalid ratio");
    }
    return await this.processImage(image, {
      getNewDims: (width, height) => {
        return {
          width: Math.floor(width * ratio),
          height: Math.floor(height * ratio),
        };
      },
    });
    // return new Promise(function (resolve, reject) {
    //   const reader = new FileReader();

    //   // Read the file
    //   reader.readAsDataURL(image);

    //   // Manage the `load` event
    //   reader.addEventListener("load", function (e) {
    //     // Create new image element
    //     const ele = new Image();
    //     ele.addEventListener("load", function () {
    //       // Create new canvas
    //       const canvas = document.createElement("canvas");

    //       // Draw the image that is scaled to `ratio`
    //       const context = canvas.getContext("2d")!;
    //       const w = ele.width * ratio;
    //       const h = ele.height * ratio;
    //       canvas.width = w;
    //       canvas.height = h;
    //       context.drawImage(ele, 0, 0, w, h);

    //       // Get the data of resized image
    //       canvas.toBlob((blob) => {
    //         resolve(blob);
    //       }, image.type);
    //     });

    //     // Set the source
    //     ele.src = e.target!.result as string;
    //   });

    //   reader.addEventListener("error", function () {
    //     reject();
    //   });
    // });
  }

  static async resizeToWidth(image: File | Blob, width: number) {
    if (width <= 20) {
      throw new Error("Width too small");
    }
    return await this.processImage(image, {
      getNewDims: (w, h) => {
        const ratio = width / w;
        return {
          width: w * ratio,
          height: h * ratio,
        };
      },
    });
  }

  static async resizeToDims(image: File | Blob, width: number, height: number) {
    if (width <= 20) {
      throw new Error("Width too small");
    }
    return await this.processImage(image, {
      getNewDims: (w, h) => {
        return {
          width: width,
          height: height,
        };
      },
    });
  }

  static getOriginalDimensions(blobUrl: string): Promise<{
    width: number;
    height: number;
  }> {
    return new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = function () {
        const width = img.naturalWidth;
        const height = img.naturalHeight;
        resolve({ width, height });
      };
      img.src = blobUrl;
    });
  }

  static downloadBlob(blob: Blob | File, name?: string) {
    // 1. create blob url
    const blobUrl = URL.createObjectURL(blob);

    let filename = "";
    if ("name" in blob) {
      filename = blob.name;
    } else {
      filename = `${crypto.randomUUID()}.${blob.type.split("/")[1]}`;
    }

    // 2. create a download link and automatically click it
    const link = document.createElement("a");
    link.href = blobUrl;
    link.setAttribute("download", name || filename);
    link.click();

    URL.revokeObjectURL(blobUrl);
  }

  static async resizeAndDownload(
    image: File | Blob,
    ratio: number,
    name?: string
  ) {
    try {
      const blob = await ImageConverter.resize(image, ratio);
      if (!blob) {
        throw new Error("Failed to resize the image");
      }
      ImageConverter.downloadBlob(blob, name);
      return { success: true };
    } catch (e) {
      return { success: false };
    }
  }

  static async convertImage(
    image: File | Blob,
    type: "png" | "jpeg" | "webp" = "png"
  ) {
    return await this.processImage(image, {
      type,
    });
  }

  private static processImage(
    image: File | Blob,
    options?: {
      type?: "png" | "jpeg" | "webp";
      getNewDims?: (
        width: number,
        height: number
      ) => {
        width: number;
        height: number;
      };
    }
  ): Promise<Blob> {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();

      // Read the file
      reader.readAsDataURL(image);

      // Manage the `load` event
      reader.addEventListener("load", function (e) {
        // Create new image element
        const ele = new Image();
        ele.addEventListener("load", function () {
          // Create new canvas
          const canvas = document.createElement("canvas");

          // Draw the image that is scaled to `ratio`
          const context = canvas.getContext("2d")!;
          context.imageSmoothingEnabled = false;
          context.imageSmoothingQuality = "high";
          let w = ele.naturalWidth;
          let h = ele.naturalHeight;
          if (options?.getNewDims) {
            const newDims = options.getNewDims(w, h);
            w = newDims.width;
            h = newDims.height;
          }
          canvas.width = w;
          canvas.height = h;
          context.drawImage(ele, 0, 0, w, h);

          // Get the data of resized image
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject("Failed to convert canvas to blob");
                return;
              }
              resolve(blob);
            },
            options?.type ? `image/${options.type}` : image.type
          );
        });

        // Set the source
        ele.src = e.target!.result as string;
      });

      reader.addEventListener("error", function () {
        reject();
      });
    });
  }
}

async function convertImage({
  h,
  img,
  mimetype,
  w,
}: {
  img: HTMLImageElement;
  w: number;
  h: number;
  mimetype: string;
}) {
  // 1. create new canvas
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d")!;

  // 2. draw image
  context.drawImage(img, 0, 0, w, h);

  // 3. asynchronously convert current canvas drawing to blob with mimetype
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      return blob !== null ? resolve(blob) : reject("no blob");
    }, mimetype);
  });
}

function loadImage(blob: Blob) {
  const reader = new FileReader();

  // Read the file
  reader.readAsDataURL(blob);
  return new Promise<HTMLImageElement>((resolve, reject) => {
    reader.addEventListener("load", (e) => {
      const dataUrl = e.target!.result as string;
      const img = new Image();
      img.src = dataUrl;
      resolve(img);
    });

    reader.addEventListener("error", function () {
      reject();
    });
  });
}

function getImageDimensions(img: HTMLImageElement) {
  return new Promise<{
    originalWidth: number;
    originalHeight: number;
  }>((resolve, reject) => {
    img.addEventListener("load", () => {
      resolve({
        originalWidth: img.naturalWidth,
        originalHeight: img.naturalHeight,
      });
    });
  });
}

async function convertImageToWebp(blob: Blob) {
  const img = await loadImage(blob);
  const { originalHeight, originalWidth } = await getImageDimensions(img);
  return await convertImage({
    h: originalHeight,
    w: originalWidth,
    img,
    mimetype: blob.type || "image/webp",
  });
}
