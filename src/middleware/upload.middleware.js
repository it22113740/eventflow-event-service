const multer = require("multer");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /^image\/(jpeg|png|webp|gif)$/.test(file.mimetype);
    if (ok) cb(null, true);
    else cb(new Error("Only JPEG, PNG, WebP, or GIF images are allowed"));
  },
});

/** Only multipart requests run the file parser; JSON stays JSON. */
function optionalMultipartSingle(fieldName) {
  return (req, res, next) => {
    if (req.is("multipart/form-data")) {
      return upload.single(fieldName)(req, res, next);
    }
    next();
  };
}

module.exports = { upload, optionalMultipartSingle };
