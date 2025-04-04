# Project

## How to upload an image to cloudinary

1. Create an **upload preset** in your account settings, and make sure its public read and write to a folder. Based on the name of this upload preset, we'll be able to upload images to a specific folder without authentication.
2. Store your cloudinary cloud name in an ENV variable and use it to request a certain URL.

```ts
async function uploadImage(file: File) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;

  // 1. construct fetch request
  const url = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;
  const fd = new FormData();
  fd.append("upload_preset", uploadPreset);
  fd.append("file", file);

  // 2. fetch request as POST
  const response = await fetch(url, {
    method: "POST",
    body: fd,
  });
  if (!response.ok) {
    console.error("Error uploading image", response);
    throw new Error("Error uploading image");
  }

  // 3. get resulting uploaded cloudinary url pointing to uploaded image
  const json = await response.json();
  const cloudinary_image_url = json.secure_url as string;
}
```
