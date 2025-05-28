const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export class ImageManager {
  async uploadFile(file: File) {
    if (!cloudName || !uploadPreset) {
      throw new Error("Cloudinary credentials not found");
    }
    const url = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;
    const fd = new FormData();
    fd.append("upload_preset", uploadPreset);
    fd.append("file", file);
    // fd.append("signature", crypto.randomUUID());
    // fd.append("api_key", apiKey);
    // fd.append("timestamp", Date.now().toString());
    // fd.append("use_filename", "true");

    const response = await fetch(url, {
      method: "POST",
      body: fd,
    });
    if (!response.ok) {
      console.error("Error uploading image", response);
      throw new Error("Error uploading image");
    }
    const json = await response.json();
    return json.secure_url as string;
  }
}
