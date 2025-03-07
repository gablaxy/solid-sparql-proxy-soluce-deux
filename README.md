# Quick notes:
Install solid : npm install -g @solid/community-server

Lancement avec proxy:
```
community-solid-server -c @css:config/file.json -f data/solidproxy --baseUrl http://localhost:3001
```


Using --baseURL correspond to the proxy URL !!
data/solidproxy -> the webid are on 3001 now !!!



- Create user bob@solid.org, password bob, create pod bob (and logout !!)
- Create user alice@solid.org, paswword alice, create pod alice (and logout !!)
- Create file : data/solidproxy/alice/sparql-permission.ttl

```
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.

<> rdf:type rdf:Property.
```

Create file : data/solidproxy/alice/sparql-permission.ttl.acl
```
@prefix acl: <http://www.w3.org/ns/auth/acl#>.
@prefix foaf: <http://xmlns.com/foaf/0.1/>.

# Autorisation pour l'admin (Alice) avec tous les droits
<#owner>
    a acl:Authorization;
    acl:agent <http://localhost:3001/alice/profile/card#me>;
    acl:accessTo <http://localhost:3001/alice/sparql-permissions.ttl>;
    acl:default <http://localhost:3001/alice/>;
    acl:mode acl:Read, acl:Write, acl:Control.

# Autorisation pour Bob en lecture seule sur les requêtes SPARQL
<#readAuth>
    a acl:Authorization;
    acl:agent <http://localhost:3001/bob/profile/card#me>;
    acl:accessTo <http://localhost:3001/alice/sparql-permissions.ttl>;
    acl:mode acl:Read.
```


Install node http-proxy ; npm install http-proxy

Run proxy:
```
node ./scripts/proxy.js
```

Run client (read a file):
```
./tests/readFileProxy.js bob@solid.org bob http://localhost:3001/alice/sparql-permissions.ttl http://localhost:3001
```

Run client (write to a file):
```
./tests/writeFileProxy.js bob@solid.org bob http://localhost:3001/alice/sparql-permissions.ttl http://localhost:3001 "je viens d'écrire dans le fichier"
```

Should display the content of sparql-permissions.ttl

# Solid SPARQL Proxy

This project provides a proxy to secure a SPARQL endpoint using Solid-based ACLs. It authenticates users via their WebID and checks their access rights stored in a Solid Pod.

## 🚀 Features

- **Community Solid Server (CSS)** to manage WebID authentication.
- **Apache Jena Fuseki** as the SPARQL endpoint.
- **A Node.js proxy** that intercepts and secures SPARQL queries.
- **Automatic creation of Alice’s Pod** with a WebID and predefined ACL permissions.

## 📦 Installation & Setup

### 5️⃣ **Start all services with Docker Compose**

```sh
docker-compose up --build
```

This will start:

- **Solid Server** at `http://localhost:3000`
- **Fuseki SPARQL Endpoint** at `http://localhost:3030`
- **Solid SPARQL Proxy** at `http://localhost:4000`

## 🏰 How to Use

### 🔹 **Create a Solid User & Verify Alice’s Pod**

Open Solid Server in your browser:

```
http://localhost:3000/alice/profile/card
```

👌 Alice should already be created automatically with a valid WebID.

### 🔹 **Verify Alice's ACL Permissions**

Check that Alice has access rights by inspecting the ACL file:

```
http://localhost:3000/alice/.acl
```

### 🔹 **Execute a SPARQL query as Alice**

Use a **valid WebID token** to query the SPARQL endpoint securely:

```sh
curl -X POST http://localhost:4000/sparql      -H "Authorization: Bearer VALID_JWT_TOKEN"      -H "Content-Type: application/sparql-query"      --data "SELECT * WHERE { ?s ?p ?o } LIMIT 10"
```

🔒 If Alice has permissions, the request will be forwarded to Fuseki.🚫 Otherwise, `403 Forbidden - Access denied` is returned.

## ⚙ Configuration

Modify the `.env` file if necessary:

```ini
PORT=4000
SPARQL_ENDPOINT=http://fuseki:3030/ds/query
SOLID_POD_BASE=http://localhost:3000/
SOLID_ACL_FILE=http://localhost:3000/data/sparql-permissions.ttl.acl
SOLID_ISSUER=http://localhost:3000
```

## 📌 Stopping the services

To stop all running containers, use:

```sh
docker-compose down
```

