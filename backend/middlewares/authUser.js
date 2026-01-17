import jwt from "jsonwebtoken";

const authUser = async (req, res, next) => {
    try {
        // 1. Try to find the token in two places
        let token = req.headers.token; // Custom header
        
        // 2. If not found, check standard "Bearer" header
        if (!token && req.headers.authorization) {
            const authHeader = req.headers.authorization;
            if (authHeader.startsWith("Bearer ")) {
                token = authHeader.split(" ")[1]; // Remove "Bearer " word
            }
        }

        // --- DEBUG LOGS ---
        console.log("Token Found:", token ? "YES" : "NO");
        // ------------------

        if (!token) {
            return res.json({ success: false, message: 'Not Authorized. Token Missing.' });
        }

        const token_decode = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = token_decode.id; 
        next();

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: 'Invalid Token.' });
    }
};

export default authUser;