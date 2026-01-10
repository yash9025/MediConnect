import jwt from "jsonwebtoken";

// DOCTOR AUTHENTICATION MIDDLEWARE
const authDoctor = async (req, res, next) => {
    try {
        // 1. Try to find the token in the custom header 'dtoken'
        let dtoken = req.headers.dtoken;

        // 2. If not found, check the standard 'Authorization' header (Bearer Token)
        if (!dtoken && req.headers.authorization) {
            const authHeader = req.headers.authorization;
            if (authHeader.startsWith("Bearer ")) {
                dtoken = authHeader.split(" ")[1]; // Remove "Bearer " to get just the token
            }
        }

        // 3. If still no token found, reject
        if (!dtoken) {
            return res.json({ success: false, message: 'Not Authorized. Please Login Again.' });
        }

        // Verify the token and decode its payload
        const token_decode = jwt.verify(dtoken, process.env.JWT_SECRET);
        
        // Attach Doctor ID to the request body
        req.body.docId = token_decode.id;

        next(); // Proceed to the next middleware

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: 'Invalid Token. Please Login Again.' });
    }
};

export default authDoctor;