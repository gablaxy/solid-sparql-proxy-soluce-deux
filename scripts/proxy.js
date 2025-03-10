const http = require('http');
const url = require('url');
const { createProxyServer } = require('http-proxy');
const cors = require('cors');  // Pour ajouter la gestion des CORS
const { Transform } = require('stream');  // Importer le module Transform pour manipuler les données du corps
const { query } = require('express');

const proxy = createProxyServer();

// Local Solid server instance configuration
const targetHost = 'localhost';  // Adresse locale du serveur Solid
const targetPort = 3000;         // Le port sur lequel le serveur Solid écoute

// Proxy Server Configuration
const proxyServer = http.createServer((req, res) => {
    // Construction de l'URL cible pour la redirection
    const targetUrl = `http://${targetHost}:${targetPort}`;

    // Configuration des en-têtes à transmettre
    req.headers['X-Forwarded-Host'] = req.headers.host;
    req.headers['X-Forwarded-Proto'] = req.connection.encrypted ? 'https' : 'http';
    req.headers['X-Forwarded-For'] = req.connection.remoteAddress; // Ajout de l'adresse IP du client

    console.log('URL cible :', targetUrl);
    console.log('En-têtes :', req.headers);
    //console.log('Method :', req.method);

    // Si la requête est GET, loguer les paramètres GET
    if (req.method === 'GET') {
        console.log('Paramètres GET :', req.url);  // Logue les paramètres GET
        const parsedUrl = url.parse(req.url, true);  // Analyse l'URL et extrait les paramètres GET
        console.log('Paramètres GET :', parsedUrl.query);  // Logue les paramètres GET
    } else {
        console.log('Paramètres Not-GET :', req.url);  // Logue les paramètres GET
    }

    // Créer un Transform stream pour loguer le corps de la requête et la sauvegarder
    const logTransformStream = new Transform({
        transform(chunk, encoding, callback) {
            if(req.method === 'PUT') {
                console.log('📦 Chunk:', chunk.toString());  // Loguer le corps de la requête
                // sauvegarder le chunk dans une variable globale
                global.sparqlrequest = chunk;
            }
            this.push(chunk);  // Passer le chunk au prochain stream
            callback();  // Terminer le traitement du chunk
        }
    });

    // Si la requête a un corps, on l'intercepte avec le Transform stream
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
        req.pipe(logTransformStream);  // Connecter la requête au stream de transformation
    }

    // Ajouter la gestion des CORS
    cors()(req, res, () => {
        // Proxy la requête vers le serveur cible
        proxy.web(req, res, { target: targetUrl });
    });
});

// Ajout de la gestion des erreurs
proxy.on('error', (err, req, res) => {
    console.error('Erreur du proxy:', err);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Erreur du proxy');
});

// Start the proxy server
const port = 3001;  // Le port du proxy (peut être personnalisé)
proxyServer.listen(port, () => {
    console.log(`Proxy en marche sur http://localhost:${port}`);
});

proxy.on('proxyRes', (proxyRes, req, res) => {
    console.log(`✅ Réponse du serveur Solid pour ${req.method} ${req.url} : ${proxyRes.statusCode}`);

    // Si la réponse est un succès, loguer le corps de la réponse
    if (proxyRes.statusCode === 205) {
        console.log('🔍 ok le statut est 205 !!!!');
        console.log(global.sparqlrequest.toString());

        // envoyer la requête SPARQL au serveur fuseki
        var XMLHttpRequest = require("xhr2");
        const xmlHttp = new XMLHttpRequest();
        xmlHttp.open("POST", "http://localhost:3030/meteorite/query", true);
        xmlHttp.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        xmlHttp.send("query=" + global.sparqlrequest.toString());
        console.log('🔍 Requête SPARQL envoyé par le proxy vers fuseki');

        // Attendre la réponse du serveur fuseki
        xmlHttp.onreadystatechange = function() {
            if (xmlHttp.readyState == 4 && xmlHttp.status == 200) {
                console.log('🔍  Réponse SPARQL de fuseki reçue par le proxy');
                console.log(xmlHttp.responseText);
                res.end(xmlHttp.responseText);
            }
        }
    }
});
