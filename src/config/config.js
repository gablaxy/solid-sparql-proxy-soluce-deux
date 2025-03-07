require('dotenv').config();

module.exports = {
    PORT: process.env.PORT || 4000,
    SPARQL_ENDPOINT: process.env.SPARQL_ENDPOINT,
    SOLID_POD_BASE: process.env.SOLID_POD_BASE,
    SOLID_ACL_FILE: process.env.SOLID_ACL_FILE,
    SOLID_ISSUER: process.env.SOLID_ISSUER
};
