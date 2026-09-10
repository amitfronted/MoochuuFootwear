import multer from 'multer';

const storage = multer.memoryStorage();

const fileFilter = (request, file, callback) => {
  if (file.mimetype.startsWith('image/')) {
    callback(null, true);
  } else {
    callback(new Error('Only image file are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, //2mb
  },
});

export default upload;
