#!/usr/bin/env node

const fetch = require('node-fetch');
const { createDpopHeader, generateDpopKeyPair } = require('@inrupt/solid-client-authn-core');

// Ensure command-line arguments are provided
if (process.argv.length < 5) {
    console.error("Usage: queryViaProxy.js <email> <password> <sparql_query>");
    process.exit(1);
}

// Extract command-line arguments
const email = process.argv[2];
const password = process.argv[3];
const sparqlQuery = process.argv[4];

const proxyUrl = "http://localhost:4000/sparql";  // Adjust based on your setup

// Function to log in and get an authorization token
async function loginAndGetAuthorization(email, password) {
    try {
        const indexResponse = await fetch('http://localhost:3000/.account/');
        const { controls } = await indexResponse.json();

        const response = await fetch(controls.password.login, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        const { authorization } = await response.json();
        return authorization;
    } catch (error) {
        console.error("Error during authentication:", error);
        process.exit(1);
    }
}

// Function to get client credentials (ID & Secret)
async function getClientCredentials(authorization, email) {
    try {
        const indexResponse = await fetch('http://localhost:3000/.account/', {
            headers: { authorization: `CSS-Account-Token ${authorization}` }
        });
        const { controls } = await indexResponse.json();

        const response = await fetch(controls.account.clientCredentials, {
            method: 'POST',
            headers: { authorization: `CSS-Account-Token ${authorization}`, 'content-type': 'application/json' },
            body: JSON.stringify({ name: 'my-token', webId: `http://localhost:3000/${email.split('@')[0]}/profile/card#me` }),
        });

        const { id, secret } = await response.json();
        return { id, secret };
    } catch (error) {
        console.error("Error retrieving client credentials:", error);
        process.exit(1);
    }
}

// Function to get a DPoP-bound access token
async function getAccessToken(id, secret, dpopKey) {
    try {
        const authString = `${encodeURIComponent(id)}:${encodeURIComponent(secret)}`;
        const tokenUrl = 'http://localhost:3000/.oidc/token';

        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                authorization: `Basic ${Buffer.from(authString).toString('base64')}`,
                'content-type': 'application/x-www-form-urlencoded',
                dpop: await createDpopHeader(tokenUrl, 'POST', dpopKey),
            },
            body: 'grant_type=client_credentials&scope=webid',
        });

        const { access_token: accessToken } = await response.json();
        return accessToken;
    } catch (error) {
        console.error("Error obtaining DPoP access token:", error);
        process.exit(1);
    }
}

// Function to send the SPARQL query through the proxy
async function queryProxy(accessToken, dpopKey, sparqlQuery) {
    try {
        const response = await fetch(proxyUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'DPoP': await createDpopHeader(proxyUrl, 'POST', dpopKey),
                'Content-Type': 'application/sparql-query'
            },
            body: sparqlQuery
        });

        if (response.ok) {
            console.log("SPARQL Query Result:");
            console.log(await response.text());
        } else {
            console.error(`Error: HTTP ${response.status} - ${response.statusText}`);
            console.error(await response.text());
        }
    } catch (error) {
        console.error("Error querying through proxy:", error);
        process.exit(1);
    }
}

// Main function to orchestrate the process
async function main() {
    try {
        const dpopKey = await generateDpopKeyPair();
        const authorization = await loginAndGetAuthorization(email, password);
        const { id, secret } = await getClientCredentials(authorization, email);
        const accessToken = await getAccessToken(id, secret, dpopKey);

        await queryProxy(accessToken, dpopKey, sparqlQuery);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

// Execute the main function
main();
