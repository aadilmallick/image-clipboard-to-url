import ImageConverter from "./ImageConverter";
import {
  AbortControllerManager,
  appStorage,
  createReactiveProxy,
  DOM,
  html,
} from "./utils";

export class App {
  private resizeSettings = {
    resizeWidth: -1,
    resizeHeight: -1,
    displayWidth: -1,
    displayHeight: -1,
  };
  private imageInfo = {
    originalWidth: -1,
    originalHeight: -1,
    originalDisplayWidth: -1,
    originalDisplayHeight: -1,
  };
  private imagePreviewAborter = new AbortControllerManager();
  private Elements = {
    settingsSection: DOM.$throw("#settings"),
    downloadTypeSelect: DOM.$throw("#download-type") as HTMLSelectElement,
    superCompressCheckbox: DOM.$throw("#super-compress") as HTMLInputElement,
    ratioRange: DOM.$throw("#scale") as HTMLInputElement,
    imageContainer: DOM.$throw("#image-container"),
    uploadButton: DOM.createDomElement(html`
      <button
        id="upload-button"
        class="w-full block px-4 py-2 bg-black text-white font-semibold text-base rounded-lg shadow-md cursor-pointer hover:opacity-75 transition-opacity duration-200"
      >
        Upload
      </button>
    `) as HTMLButtonElement,
    dimensionsLabel: DOM.createDomElement(html`
      <span class="dimensions-label"></span>
    `) as HTMLSpanElement,
  };
  private settingsProxy = createReactiveProxy(
    "showSettings",
    false,
    (newShowSettings) => {
      if (newShowSettings) {
        this.Elements.settingsSection.style.display = "block";
        if (appStorage.get("downloadType")) {
          this.Elements.downloadTypeSelect.value =
            appStorage.get("downloadType")!;
        }
        if (appStorage.get("shouldSuperCompress")) {
          this.Elements.superCompressCheckbox.checked = appStorage.get(
            "shouldSuperCompress"
          )!;
        }
      } else {
        this.Elements.settingsSection.style.display = "none";
      }
    }
  );
  private showImagePreviewProxy = createReactiveProxy(
    "showImagePreview",
    false,
    (showImagePreview) => {
      if (showImagePreview) {
      } else {
        this.imagePreviewAborter.abort();
        this.imagePreviewAborter.reset();
      }
    }
  );

  private async setImagePreviewData(blobUrl: string) {
    const imgPreview = this.Elements.imageContainer.querySelector("img");
    if (!imgPreview) throw new Error("Image not found");
    const originalDimensions = await ImageConverter.getOriginalDimensions(
      blobUrl
    );
    this.imageInfo.originalWidth = originalDimensions.width;
    this.imageInfo.originalHeight = originalDimensions.height;
    this.imageInfo.originalDisplayWidth = imgPreview.clientWidth;
    this.imageInfo.originalDisplayHeight = imgPreview.clientHeight;
  }

  private onSelectChange() {
    this.Elements.downloadTypeSelect.addEventListener(
      "change",
      (e) => {
        const target = e.target as HTMLSelectElement;
        const value = target.value as "png" | "jpeg" | "webp";
        appStorage.set("downloadType", value);
      },
      {
        signal: this.imagePreviewAborter.signal,
      }
    );
  }

  private onCheckboxChange() {
    this.Elements.superCompressCheckbox.addEventListener(
      "change",
      (e) => {
        const target = e.target as HTMLInputElement;
        const value = target.checked;
        appStorage.set("shouldSuperCompress", value);
      },
      {
        signal: this.imagePreviewAborter.signal,
      }
    );
  }

  private async onRatioSliderChange(blobUrl: string) {
    this.Elements.ratioRange.addEventListener(
      "change",
      async (e) => {
        const target = e.target as HTMLInputElement;
        const value = target.value;
        this.Elements.ratioRange.setAttribute("value", value);

        // get image width and height
        // console.log(`imgWidth: ${width}, imgHeight: ${height}`);
        // this.Elements.dimensionsLabel.innerText = `${width} x ${height}`;

        const ratio = parseFloat(value);
        this.setResizeFactor(ratio);

        const newRealWidth = Math.floor(this.resizeSettings.resizeWidth);
        const newRealHeight = Math.floor(this.resizeSettings.resizeHeight);
        const newDisplayWidth = Math.floor(this.resizeSettings.displayWidth);
        const newDisplayHeight = Math.floor(this.resizeSettings.displayHeight);
        console.table({
          newRealWidth,
          newRealHeight,
          newDisplayWidth,
          newDisplayHeight,
        });

        this.Elements.dimensionsLabel.innerText = `Real Dims: ${newRealWidth} x ${newRealHeight} \n Display Dims: ${newDisplayWidth} x ${newDisplayHeight}`;

        this.Elements.imageContainer.style.transform = `scale(${ratio})`;
      },
      {
        signal: this.imagePreviewAborter.signal,
      }
    );
  }

  setShowSettings(showSettings: boolean) {
    this.settingsProxy.showSettings = showSettings;
  }

  async addImagePreview(blobUrl: string) {
    // add image preview and upload button
    const img = document.createElement("img");
    img.src = blobUrl;
    img.className = "image-preview";
    this.Elements.imageContainer.appendChild(img);
    this.Elements.imageContainer.insertAdjacentElement(
      "beforebegin",
      this.Elements.uploadButton
    );
    this.showImagePreviewProxy.showImagePreview = true;

    // show image preview dimensions

    this.Elements.settingsSection.appendChild(this.Elements.dimensionsLabel);
    await this.setImagePreviewData(blobUrl);
    this.resizeSettings.resizeWidth = this.imageInfo.originalWidth;
    this.resizeSettings.resizeHeight = this.imageInfo.originalHeight;
    this.resizeSettings.displayWidth = this.imageInfo.originalDisplayWidth;
    this.resizeSettings.displayHeight = this.imageInfo.originalDisplayHeight;
    this.Elements.dimensionsLabel.innerText = `Real Dims: ${Math.floor(
      this.resizeSettings.resizeWidth
    )} x ${Math.floor(
      this.resizeSettings.resizeHeight
    )} \n Display Dims: ${Math.floor(
      this.resizeSettings.displayWidth
    )} x ${Math.floor(this.resizeSettings.displayHeight)}`;

    this.onRatioSliderChange(blobUrl);
    this.onCheckboxChange();
    this.onSelectChange();
  }

  setResizeFactor(resize: number) {
    this.resizeSettings.resizeWidth = this.imageInfo.originalWidth * resize;
    this.resizeSettings.resizeHeight = this.imageInfo.originalHeight * resize;
    this.resizeSettings.displayWidth =
      this.imageInfo.originalDisplayWidth * resize;
    this.resizeSettings.displayHeight =
      this.imageInfo.originalDisplayHeight * resize;
  }

  addUploadUrl(url: string) {
    const urlElem = DOM.createDomElement(html`
      <p
        class="bg-gray-200 text-center mx-auto p-1 wrap-break-word text-wrap max-w-[30rem] cursor-pointer hover:bg-gray-400 rounded-md"
      >
        ${url}
      </p>
    `);
    this.Elements.settingsSection.appendChild(urlElem);
    urlElem.addEventListener(
      "click",
      () => {
        navigator.clipboard.writeText(url);
        urlElem.textContent = "Copied to clipboard!";
        setTimeout(() => {
          urlElem.textContent = url;
        }, 2000);
      },
      {
        signal: this.imagePreviewAborter.signal,
      }
    );
  }

  getSettings() {
    const shouldSuperCompress = this.Elements.superCompressCheckbox.checked;
    const downloadType = this.Elements.downloadTypeSelect.value as
      | "png"
      | "jpeg"
      | "webp";
    return {
      resizeBasedOnDisplayDims: shouldSuperCompress,
      downloadType,
      resizeSettings: this.resizeSettings,
    };
  }

  removeImagePreview() {
    this.showImagePreviewProxy.showImagePreview = false;
    this.Elements.imageContainer.innerHTML = "";
  }

  onUpload(callback: () => void) {
    this.Elements.uploadButton.addEventListener(
      "click",
      () => {
        callback();
      },
      {
        signal: this.imagePreviewAborter.signal,
      }
    );
  }

  onNewPaste(blobUrl: string) {
    this.setShowSettings(false);
    this.removeImagePreview();
    this.setShowSettings(true);
    this.imagePreviewAborter.reset();
    this.addImagePreview(blobUrl);
  }
}
