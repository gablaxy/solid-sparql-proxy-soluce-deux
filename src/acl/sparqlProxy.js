

const fetch = require("node-fetch");
const { buildAuthenticatedFetch } = require("@inrupt/solid-client-authn-core");
const { checkAccess } = require("./acl");  // Function to verify ACLs

const SPARQL_ENDPOINT = "http://fuseki:3030/ds/query";  // 🔹 The real SPARQL endpoint

async function handleSparqlRequest(req, res) {
    try {
        const authHeader = req.headers["authorization"];
        const dpopHeader = req.headers["dpop"];

        if (!authHeader || !dpopHeader) {
            return res.status(401).send("Missing Authorization or DPoP header.");
        }

        // 🔹 Verify the WebID identity (from the access token)
        const webID = await verifyToken(authHeader, dpopHeader);
        console.log("User WebID:", webID);

        // 🔹 Use Solid ACLs to check if the user can access SPARQL
        const dpopKey = req.dpopKey;  // Extract the DPoP key if available
        const hasAccess = await checkAccess(webID, authHeader.split(" ")[1], dpopKey);

        if (!hasAccess) {
            return res.status(403).send("Access denied: You do not have permission to query this endpoint.");
        }

        // 🔹 Forward the SPARQL query to the real endpoint (Fuseki, Blazegraph, etc.)
        const sparqlResponse = await fetch(SPARQL_ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/sparql-query",
                "Authorization": authHeader,  // ✅ Forward user’s token as-is
                "DPoP": dpopHeader,  // ✅ Forward the original DPoP proof
            },
            body: req.body
        });

        // Return the SPARQL response
        res.status(sparqlResponse.status).send(await sparqlResponse.text());

    } catch (err) {
        console.error("SPARQL Proxy Error:", err);
        res.status(401).send(err.message);
    }
}

module.exports = { handleSparqlRequest };

