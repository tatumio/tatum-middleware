# Tatum Middleware 
Tatum Middleware is a client to Tatum Blockchain API Core.

## Install docker image
Tatum Middleware docker image is available in Docker HUB under `tatumio/tatum-middleware` tag, see <a href="https://hub.docker.com/r/tatumio/tatum-middleware">https://hub.docker.com/r/tatumio/tatum-middleware</a>.

#### Example command, how to pull Tatum Middleware image from Docker HUB
```docker pull tatumio/tatum-middleware```

## Run docker image
Tatum Middleware Docker container must/can be run with following environment variables:
  * API_URL - URL of Tatum Core API that Tatum Middleware will communicate with, must be present<br/>
  For sandbox installation, use `https://sandbox.tatum.io`.<br/>
  For production installation, use `https://api.tatum.io`.<br/>
  * INFURA_KEY - API key to Infura to communicate with Ethereum blockchain. Defaults to Tatum internal key.<br/>
  <b>It is highly recommended to change this value.</b>
<p>
Tatum Middleware Docker container exposes port `6543`, on which REST API server listens for incoming HTTP requests.
In order to publish exposed port outside of the docker container, `-p` flag should be used with defined mapping.
</p>

#### Example script to start docker container: <br/>
```docker run -e API_URL=https://sandbox.tatum.io -p 6543:6543/tcp tatumio/tatum-middleware```

## Usage
Tatum Middleware wraps Tatum Core API as is described in <a target="_blank" href="https://www.tatum.io/apidoc.html#tatum-middleware-api">Developer Section</a>.<br/>
On top of it, it brings simple utility functions such as creation of BIP44 compatible wallets, that are used within Tatum Core.<br/>
Also, it gives developers simple options to send Ethereum and Bitcoin payments via local REST API.
Some of the helpers methods sends mnemonic or private keys via HTTP protocol. It is highly recommended to
run Tatum Middleware from private LAN with limited access from outside world, since there are very sensitive
data to be transferred and there is high risk of loss of funds.

## API docs
Local Swagger UI available at `/api-docs` of your running docker container.

### API endpoints
<!-- markdown-swagger -->
 Endpoint                              | Method | Auth? | Description                                                                                                          
 ------------------------------------- | ------ | ----- | ---------------------------------------------------------------------------------------------------------------------
 `/btc/wallet`                         | POST   | No    | Generate wallet.                                                                                                     
 `/btc/wallet/xpub/{chain}/{xpub}/{i}` | GET    | No    | Calculate address from xpub on Testnet / Mainnet for given derivation index                                          
 `/btc/wallet/xpriv`                   | POST   | No    | Calculate private key of address from mnemonic on Testnet / Mainnet for given derivation index                       
 `/btc/transfer`                       | POST   | No    | Send BTC / TBTC from address to address                                                                              
 `/eth/wallet`                         | POST   | No    | Generate wallet.                                                                                                     
 `/eth/wallet/xpub/{pub}/{i}`          | GET    | No    | Calculate address from xpub on Ropsten / Mainnet for given derivation index                                          
 `/eth/wallet/xpriv`                   | POST   | No    | Calculate private key of address from mnemonic on Ropsten / Mainnet for given derivation index                       
 `/eth/transfer`                       | POST   | No    | Send ETH / Ropsten ETH from account to account                                                                       
 `/eth/erc20/deploy`                   | POST   | No    | Deploy ETH / Ropsten ETH ERC20 Smart Contract                                                                        
 `/eth/erc20/transfer`                 | POST   | No    | Transfer ETH / Ropsten ETH ERC20 Smart Contract Tokens from account to account                                       
 `/**`                                 | GET    | No    | Methods of Tatum Core API. Resends all HTTP headers, paths, query params and HTTP body to set up Tatum Core Endpoint.
 `/**`                                 | POST   | No    | Methods of Tatum Core API. Resends all HTTP headers, paths, query params and HTTP body to set up Tatum Core Endpoint.
 `/**`                                 | PUT    | No    | Methods of Tatum Core API. Resends all HTTP headers, paths, query params and HTTP body to set up Tatum Core Endpoint.
 `/**`                                 | DELETE | No    | Methods of Tatum Core API. Resends all HTTP headers, paths, query params and HTTP body to set up Tatum Core Endpoint.
<!-- /markdown-swagger -->
