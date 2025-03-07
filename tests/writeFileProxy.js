#!/usr/bin/env node

// ./tests/writeFileProxy.js bob@solid.org bob http://localhost:3001/alice/sparql-permissions.ttl http://localhost:3001

const fetch = require('node-fetch');
const { createDpopHeader, generateDpopKeyPair, buildAuthenticatedFetch } = require('@inrupt/solid-client-authn-core');
const { overwriteFile } = require('@inrupt/solid-client');

// Ensure command-line arguments are provided
if (process.argv.length < 6) {
    console.error("Usage: node write.js <email> <password> <solid_file_url> <server_url>");
    process.exit(1);
}

// Extract command-line arguments
const email = process.argv[2];
const password = process.argv[3];
const fileUrl = process.argv[4];
const serverUrl = process.argv[5];

// Login and authorization functions remain the same as in your original script
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

// Modified function to create/write a file
async function createFile(fileUrl, authFetch) {
    try {
        const content = "test test";

        const response = await authFetch(fileUrl, {
            method: 'PUT',  // PUT is commonly used for writing files
            headers: {
                'Content-Type': 'text/plain', // Change if writing binary files
            },
            body: content,
        });

        if (!response.ok) {
            throw new Error(`Failed to write file. Status: ${response.status} ${response.statusText}`);
        }

        console.log(`File successfully written to ${fileUrl}`);

    } catch (error) {
        console.error("Error writing to file:", error);
        process.exit(1);
    }
}

// Main function remains similar but calls createFile instead
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
        await createFile(fileUrl, authFetch);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

// Execute the main function
main();