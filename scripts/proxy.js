const http = require('http');
const { createProxyServer } = require('http-proxy');
const fetch = require('node-fetch'); // Ensure node-fetch is installed

const proxy = createProxyServer();
const solidServer = 'http://localhost:3000'; // Solid server URL
const fusekiEndpoint = 'http://localhost:3030/meteorite/query'; // Fuseki SPARQL endpoint

const proxyServer = http.createServer((req, res) => {
    //console.log(`Received request: ${req.method} ${req.url}`);
    let requestBody = '';
    req.on('data', chunk => requestBody += chunk);
    req.on('end', async () => {
        console.log("-----------------");
        console.log(`Received request: ${req.method} ${req.url}`);
        console.log(`Request body received: ${requestBody.substring(0, 200)}...`);

        try {
            console.log(`Forwarding request to Solid: ${solidServer}${req.url}`);
            
            const solidResponse = await fetch(`${solidServer}${req.url}`, {
                method: req.method,
                headers: req.headers,
                body: requestBody || undefined
            });
            const solidData = await solidResponse.text();
            
            console.log(`Solid server responded with status: ${solidResponse.status}`);

            
            // If the request is a PUT and Solid responds with 205, forward to Fuseki
            if (req.method === 'PUT' && solidResponse.status === 205) {
                console.log('PUT request successful on Solid, forwarding to Fuseki...');
                try {
                    const fusekiResponse = await fetch(fusekiEndpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/sparql-query' },
                        body: requestBody
                    });
                    const fusekiData = await fusekiResponse.text();
                    console.log(`Fuseki server responded with status: ${fusekiResponse.status}`);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(fusekiData);
                } catch (error) {
                    res.writeHead(500);
                    res.end('Error processing SPARQL query');
                }
            } else {
                res.writeHead(solidResponse.status, {
                    ...Object.fromEntries(solidResponse.headers), // Preserve Solid headers
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                });
                res.end(solidData);                
            }

        } catch (error) {
            console.error('Error forwarding to Solid:', error);
            res.writeHead(500);
            res.end('Error contacting Solid server');
        }
    });
});

proxyServer.listen(3001, () => {
    console.log(`Proxy en marche sur http://localhost:3001`);
});
