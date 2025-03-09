import jwt from "jsonwebtoken";

// DOCTOR AUTHENTICATION MIDDLEWARE
const authDoctor = async (req, res, next) => {
    try {
        const { dtoken } = req.headers; // Extract token from headers

        if (!dtoken) {
            return res.json({ success: false, message: 'Not Authorized. Please Login Again.' });
        }

        // Verify the token and decode its payload
        const token_decode = jwt.verify(dtoken, process.env.JWT_SECRET);
        req.body.docId = token_decode.id;

        next(); // Proceed to the next middleware
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: 'Invalid Token. Please Login Again.' });
    }
};

export default authDoctor;
