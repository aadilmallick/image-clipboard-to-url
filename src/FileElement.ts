export class FileElement {
  constructor(private fileInput: HTMLInputElement) {}

  onSingleFileUpload(cb: (file: File) => void) {
    this.fileInput.addEventListener("change", (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        const file = target.files[0];
        cb(file);
        target.value = ""; // Clear the input value
      }
    });
  }
  onFilesUpload(cb: (files: File[]) => void) {
    this.fileInput.addEventListener("change", (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        const files = [...target.files];
        cb(files);
        target.value = ""; // Clear the input value
      }
    });
  }
}
