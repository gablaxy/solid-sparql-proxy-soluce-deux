const fetch = require('node-fetch');
const { createDpopHeader, generateDpopKeyPair } = require("@inrupt/solid-client-authn-core");
const $rdf = require('rdflib');
const { SOLID_ACL_FILE } = require('../config/config');

async function checkAccess(webID, accessToken, dpopHeader) {
    try {
        // Fetch ACL file with the received DPoP-bound authentication
        const response = await fetch(SOLID_ACL_FILE, {
            method: "GET",
            headers: {
                "Accept": "text/turtle",
                "Authorization": `Bearer ${accessToken}`,
                "DPoP": dpopHeader,  // Forward the DPoP header received from the caller
            }
        });

        if (!response.ok) {
            console.error("Cannot retrieve ACL file:", response.status, await response.text());
            return false;
        }

        // Parse the ACL file
        const aclText = await response.text();
        const store = $rdf.graph();
        $rdf.parse(aclText, store, SOLID_ACL_FILE, "text/turtle");

        const ACL = $rdf.Namespace("http://www.w3.org/ns/auth/acl#");

        // Find authorizations for this WebID
        const authorizations = store.match(undefined, ACL("agent"), $rdf.sym(webID));

        return authorizations.length > 0;
    } catch (error) {
        console.error("Error checking ACL:", error);
        return false;
    }
}

module.exports = { checkAccess };
