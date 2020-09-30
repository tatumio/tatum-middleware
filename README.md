# Tatum Middleware 
Tatum Middleware is a client to Tatum API.

## Where to start
In order to start work with Tatum API, please contact us at <a target="_blank" href="mailto:hello@tatum.io">hello@tatum.io</a> in order to obtain access API key.

## Install docker image
Tatum Middleware docker image is available in Docker HUB under `tatumio/tatum-middleware` tag, see <a href="https://hub.docker.com/r/tatumio/tatum-middleware">https://hub.docker.com/r/tatumio/tatum-middleware</a>.

#### Example command, how to pull Tatum Middleware image from Docker HUB
```docker pull tatumio/tatum-middleware```

## Run docker image
Tatum Middleware Docker container must/can be run with following environment variables:
  * API_URL - URL of Tatum API that Tatum Middleware will communicate with.<br/>
    Use `https://api-eu1.tatum.io`.<br/>
  * MODE - Mode of Tatum API that Tatum Middleware will communicate with.<br/>
    For testnet installation, use `TESTNET`.<br/>
    For production installation, use `MAINNET`.<br/>
  * TATUM_API_KEY - API key to communicate with Tatum API.<br/>
<p>
Tatum Middleware Docker container exposes port `6543`, on which REST API server listens for incoming HTTP requests.
In order to publish exposed port outside of the docker container, `-p` flag should be used with defined mapping.
</p>

#### Example script to start docker container<br/>
```docker run -e API_URL=https://api-eu1.tatum.io -e MODE=MAINNET -e TATUM_API_KEY=12345 -p 6543:6543/tcp tatumio/tatum-middleware```

## Usage
Tatum Middleware wraps Tatum API.<br/>
On top of it, it brings simple utility functions such as the creation of BIP44 compatible wallets, that are used within Tatum Core.<br/>
Also, it gives developers simple options to send Ethereum and Bitcoin payments via local REST API.
Some of the helper methods send mnemonic or private keys via the HTTP protocol. It is highly recommended to
run Tatum Middleware from private LAN with limited access from the outside world, since there are very sensitive
data to be transferred, and there is a high risk of loss of funds.
