## Serverless shortlinker

### How to use

1 npm install
2 sls deploy

### Endpoints

1 POST /auth/signin {email:string, password: string} - signin
2 POST /auth/signup {email:string, password: string} - signup
3 GET /{linkId} - redirect to your link
4 GET /links {Bearer Token} - get all users links
5 DELETE /links/{id} {BearerToken} - delete link by id
6 PUT /links {BearerToken + {url: original url, ttl: "one-time" | "1d" | "3d" | "7d" } } - create link
