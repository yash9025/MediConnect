import jwt from "jsonwebtoken";

// USER AUTHENTICATION MIDDLEWARE
const authUser = async (req, res, next) => {
    try {
        const { token } = req.headers; // Extract token from headers

        if (!token) {
            return res.json({ success: false, message: 'Not Authorized. Please Login Again.' });
        }

        // Verify the token and decode its payload
        const token_decode = jwt.verify(token, process.env.JWT_SECRET);

        req.body.userId = token_decode.id;  

        next(); // Proceed to the next middleware
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: 'Invalid Token. Please Login Again.' });
    }
};

export default authUser;
