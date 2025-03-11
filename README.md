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

Run fuseki server
```
docker pull stain/jena-fuseki
docker run -p 3030:3030 -e ADMIN_PASSWORD=admin stain/jena-fuseki
```
Mettre ses données dans le fuseki

Run on client (read a file):
```
./tests/readFileProxy.js bob@solid.org bob http://localhost:3001/alice/sparql-permissions.ttl http://localhost:3001
```
Should display the content of sparql-permissions.ttl

Run on client (write to a file), solution utilisée pour le moment pour faire une requête au fuseki:
```
./tests/writeFileProxy.js bob@solid.org bob http://localhost:3001/alice/sparql-permissions.ttl http://localhost:3001 "<requête sparql>"
```
