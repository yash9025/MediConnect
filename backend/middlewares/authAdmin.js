import jwt from "jsonwebtoken";

// ADMIN AUTHENTICATION MIDDLEWARE
const authAdmin = async (req, res, next) => {
    try {
        const { atoken } = req.headers; // Extract token from headers

        if (!atoken) {
            return res.json({ success: false, message: 'Not Authorized. Please Login Again.' });
        }

        // Verify the token and decode its payload
        const token_decode = jwt.verify(atoken, process.env.JWT_SECRET);

        // Check if the decoded token contains the correct admin email
        if (token_decode !== process.env.ADMIN_EMAIL + process.env.ADMIN_PASSWORD) {
            return res.json({ success: false, message: 'Not Authorized. Please Login Again.' });
        }

        next(); // Proceed to the next middleware
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: 'Invalid Token. Please Login Again.' });
    }
};

export default authAdmin;
