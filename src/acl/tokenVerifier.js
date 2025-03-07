const jwt = require('jsonwebtoken');

async function verifyToken(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error("Missing or invalid token");
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.decode(token, { complete: true });

        if (!decoded || !decoded.payload.webid) {
            throw new Error("Invalid token format");
        }

        return decoded.payload.webid;
    } catch (err) {
        throw new Error("Invalid token");
    }
}

module.exports = { verifyToken };
