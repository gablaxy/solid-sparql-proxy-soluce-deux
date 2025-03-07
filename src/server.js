const express = require('express');
const { handleSparqlRequest } = require('./acl/sparqlProxy');
const { PORT } = require('./config/config');

const app = express();
app.use(express.text());

app.post('/sparql', handleSparqlRequest);

app.listen(PORT, () => console.log(`Solid Proxy running on port ${PORT}`));
