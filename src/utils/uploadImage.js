const { Readable } = require("stream");
const { cloudinary, isConfigured } = require("../config/cloudinary");

/**
 * Uploads a buffer to Cloudinary. Returns secure HTTPS URL.
 */
function uploadEventImage(buffer, mimetype) {
  if (!isConfigured()) {
    return Promise.reject(new Error("Cloudinary is not configured"));
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "eventflow/events",
        resource_type: "image",
        allowed_formats: ["jpg", "jpeg", "png", "webp", "gif"],
      },
      (err, result) => {
        if (err) return reject(err);
        resolve(result.secure_url);
      }
    );

    const readable = Readable.from(buffer);
    readable.on("error", reject);
    readable.pipe(stream);
  });
}

module.exports = { uploadEventImage };
