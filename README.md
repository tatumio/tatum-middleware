# Tatum Middleware 
Tatum Middleware is a client to Tatum Blockchain API.

## Where to start
In order to start work with Tatum Blockchain API, please reach us directly at <a href="mailto:hello@tatum.io">hello@tatum.io</a> in order to create access API key.

## Install docker image
Tatum Middleware docker image is available in Docker HUB under `tatumio/tatum-middleware` tag, see <a href="https://hub.docker.com/r/tatumio/tatum-middleware">https://hub.docker.com/r/tatumio/tatum-middleware</a>.

#### Example command, how to pull Tatum Middleware image from Docker HUB
```docker pull tatumio/tatum-middleware```

## Run docker image
Tatum Middleware Docker container must/can be run with following environment variables:
  * API_URL - URL of Tatum Core API that Tatum Middleware will communicate with, must be present<br/>
  For sandbox installation, use `https://sandbox.tatum.io`.<br/>
  For production installation, use `https://api.tatum.io`.<br/>
  * JWT_KEY - If only 1 JWT Authorization Bearer is used for this Middleware, JWT_KEY and JWT_SECRET may 
  be added to autogenerate fresh valid Authorization Bearer JWT before each request. 
  Both JWT_KEY and JWT_SECRET must be present, otherwise Authorization HTTP Header value will be used instead.  
  * JWT_SECRET - If only 1 JWT Authorization Bearer is used for this Middleware, JWT_KEY and JWT_SECRET may 
    be added to autogenerate fresh valid Authorization Bearer JWT before each request. 
    Both JWT_KEY and JWT_SECRET must be present, otherwise Authorization HTTP Header value will be used instead.
  * INFURA_KEY - API key to Infura to communicate with Ethereum blockchain. Defaults to Tatum internal key.<br/>
  <b>It is highly recommended to change this value.</b>
<p>
Tatum Middleware Docker container exposes port `6543`, on which REST API server listens for incoming HTTP requests.
In order to publish exposed port outside of the docker container, `-p` flag should be used with defined mapping.
</p>

#### Example script to start docker container without JWT Bearer auto generation: <br/>
```docker run -e API_URL=https://sandbox.tatum.io -p 6543:6543/tcp tatumio/tatum-middleware```

#### Example script to start docker container with JWT Bearer auto generation: <br/>
```docker run -e API_URL=https://sandbox.tatum.io -e JWT_KEY=3d1197f3-cc43-48ea-9a39-1af141a41605 -e JWT_SECRET=26e2c367-4d98-43cc-802e-75bf2255cabb -p 6543:6543/tcp tatumio/tatum-middleware```

## Usage
Tatum Middleware wraps Tatum Core API as is described in <a target="_blank" href="https://www.tatum.io/apidoc.html#tatum-middleware-api">Developer Section</a>.<br/>
On top of it, it brings simple utility functions such as creation of BIP44 compatible wallets, that are used within Tatum Core.<br/>
Also, it gives developers simple options to send Ethereum and Bitcoin payments via local REST API.
Some of the helpers methods sends mnemonic or private keys via HTTP protocol. It is highly recommended to
run Tatum Middleware from private LAN with limited access from outside world, since there are very sensitive
data to be transferred and there is high risk of loss of funds.
