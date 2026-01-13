import multer from 'multer';

// Set storage engine
const storage = multer.diskStorage({
    filename: function(req, file, callback) {
        callback(null, file.originalname);
    }
});

// Initialize upload
const upload = multer({storage})


export default upload;
