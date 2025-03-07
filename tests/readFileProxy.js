#!/usr/bin/env node

// ./tests/readFileProxy.js bob@solid.org bob http://localhost:3001/alice/sparql-permissions.ttl http://localhost:3001

const fetch = require('node-fetch');
const { createDpopHeader, generateDpopKeyPair, buildAuthenticatedFetch } = require('@inrupt/solid-client-authn-core');
const { getFile, getContentType, getSourceUrl } = require('@inrupt/solid-client');

// Ensure command-line arguments are provided
if (process.argv.length < 6) {
    console.error("Usage: node read.js <email> <password> <solid_file_url> <server_url>");
    process.exit(1);
}

// Extract command-line arguments
const email = process.argv[2];
const password = process.argv[3];
const fileUrl = process.argv[4];
const serverUrl = process.argv[5];  // New parameter for server URL

// Function to log in and get an authorization token
async function loginAndGetAuthorization(email, password) {
    try {
        const indexResponse = await fetch(`${serverUrl}/.account/`);
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
        const indexResponse = await fetch(`${serverUrl}/.account/`, {
            headers: { authorization: `CSS-Account-Token ${authorization}` }
        });
        const { controls } = await indexResponse.json();

        const response = await fetch(controls.account.clientCredentials, {
            method: 'POST',
            headers: { authorization: `CSS-Account-Token ${authorization}`, 'content-type': 'application/json' },
            body: JSON.stringify({ name: 'my-token', webId: `${serverUrl}/${email.split('@')[0]}/profile/card#me` }),
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
        const tokenUrl = `${serverUrl}/.oidc/token`;

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

// Function to fetch and read a file from a Solid POD
async function readFile(fileUrl, authFetch) {
    try {
        const file = await getFile(fileUrl, { fetch: authFetch });
        const fileText = await file.text();
        console.log("File Content:\n", fileText);
        console.log("MIME Type:", getContentType(file));
        console.log("Source URL:", getSourceUrl(file));
    } catch (error) {
        console.error("Error reading file:", error);
        process.exit(1);
    }
}

// Main function to orchestrate the process
async function main() {
    try {
        const dpopKey = await generateDpopKeyPair();
        const authorization = await loginAndGetAuthorization(email, password);
        console.log("Authorization:", authorization);
        const { id, secret } = await getClientCredentials(authorization, email);
        console.log("ID:", id);
        const accessToken = await getAccessToken(id, secret, dpopKey);
        console.log("Access Token:", accessToken);

        const authFetch = await buildAuthenticatedFetch(accessToken, { dpopKey });
        console.log("Auth Fetch:", authFetch);
        await readFile(fileUrl, authFetch);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

// Execute the main function
main();
