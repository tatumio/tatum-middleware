# Tatum Middleware 
Tatum Middleware is a client to Tatum Blockchain API Core.

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
 Endpoint                                      | Method | Auth? | Description                                                                                                                                                                                                      
 --------------------------------------------- | ------ | ----- | -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 `/api/v1/account`                             | POST   | Yes   | Creates new account for the customer. This will create account on Tatum's private ledger.                                                                                                                        
 `/api/v1/account/detail/{id}`                 | GET    | Yes   | Get account by ID.                                                                                                                                                                                               
 `/api/v1/account/qr/{currency}/{address}`     | GET    | Yes   | Creates QR code for given currency and address.                                                                                                                                                                  
 `/api/v1/account/{customerId}`                | GET    | Yes   | List all accounts associated with the customer.                                                                                                                                                                  
 `/api/v1/account/{id}/address`                | GET    | Yes   | Get all deposit addresses generated for account.                                                                                                                                                                 
 `/api/v1/account/{id}/address/{xpub}`         | POST   | Yes   | Creates new deposit address for account. This method associate public blockchain's ledger address with account of Tatum's private ledger.                                                                        
 `/api/v1/account/{id}/balance`                | GET    | Yes   | Get balance for the account.                                                                                                                                                                                     
 `/api/v1/account/{id}/block`                  | PUT    | Yes   | Blocked amount affects account available balance and does not allow to go with balance under the blocked amount.                                                                                                 
 `/api/v1/account/{id}/deactivate`             | PUT    | Yes   | Deactivate account. Only accounts with non-zero balance can be deactivated.                                                                                                                                      
 `/api/v1/account/{id}/freeze`                 | PUT    | Yes   | Freeze account will disable all outgoing payments. Deposits on account will remain available.                                                                                                                    
 `/api/v1/account/{id}/unfreeze`               | PUT    | Yes   | Unfreeze previously frozen account. Unfreezing non-frozen account will do no harm to the account.                                                                                                                
 `/api/v1/customer`                            | GET    | Yes   | List of all customers. Please limit calls as much as possible, especially if you have more customers                                                                                                             
 `/api/v1/customer`                            | POST   | Yes   | Creates new customer. Customer is just an envelope to accounts holder. Every customer can have unlimited accounts. In order to crate accounts and connect them to blockchain addresses, customer must be created.
 `/api/v1/customer/{externalId}`               | GET    | Yes   | Using anonymized external ID you can access customer detail information including internal ID. Internal ID is needed to call other customer related methods.                                                     
 `/api/v1/customer/{id}`                       | PUT    | Yes   | This method is helpful in case your primary system will change ID's or customer will change the country he/she is supposed to be in compliance with.                                                             
 `/api/v1/customer/{id}/deactivate`            | PUT    | Yes   | Deactivate customer is not able to do any operation. Customer can be deactivated only when all their accounts are already deactivated.                                                                           
 `/api/v1/customer/{id}/disable`               | PUT    | Yes   | Disabled customer cannot perform end-user operations, such as create new accounts or send payments. Available balance on all accounts is set to 0. Account balance will stay untouched.                          
 `/api/v1/customer/{id}/enable`                | PUT    | Yes   | Enabled customer can perform all operations. By default all customers are enabled.                                                                                                                               
 `/api/v1/erc20/{id}`                          | POST   | Yes   | Create new ERC20 token with given supply. Whole supply is stored in newly created account.                                                                                                                       
 `/api/v1/erc20/{symbol}/{address}`            | POST   | Yes   | Set contract address of ERC20 token. This must be done in order to communicate with ERC20 smart contract.                                                                                                        
 `/api/v1/payment`                             | POST   | Yes   | Send payment within the Tatum's ledger. All assets are settled instantly. This method will notmodify any blockchain connected to the accounts used within payment.                                               
 `/api/v1/payment/account/{id}`                | POST   | Yes   | Search payments across the whole system.                                                                                                                                                                         
 `/api/v1/payment/customer/{id}`               | POST   | Yes   | Search payments across the whole system.                                                                                                                                                                         
 `/api/v1/settings/key`                        | POST   | Yes   | Create new API key.                                                                                                                                                                                              
 `/api/v1/settings/key/{id}`                   | DELETE | Yes   | Do not remove last used API key, otherwise you will not be able to use API.                                                                                                                                      
 `/api/v1/virtualCurrency/mint`                | PUT    | Yes   | Create new supply of virtual currency linked with given accountId. Method increases total supply of currency.                                                                                                    
 `/api/v1/virtualCurrency/revoke`              | PUT    | Yes   | Destroy supply of virtual currency linked with given accountId. Method decreases total supply of currency.                                                                                                       
 `/api/v1/virtualCurrency/{id}`                | POST   | Yes   | Create new virtual currency with given supply stored in account. This will create Tatum internal virtual currency. For creation of ERC20 token, see /erc20 API.                                                  
 `/api/v1/withdrawal/hint`                     | POST   | Yes   | Check available addresses with enough balance to withdraw. Only for Ethereum based accounts.                                                                                                                     
 `/api/v1/withdrawal/{id}`                     | DELETE | Yes   | This method is helpful if you need to cancel withdrawal in case of blockchain transaction failed or is not yet processed. This does not cancel already broadcast blockchain transaction.                         
 `/api/v1/withdrawal/{id}/{txId}`              | PUT    | Yes   | Invoke complete withdrawal as soon as blockchain transaction ID is available. Otherwise withdrawal will be processed automatically in next block and all other withdrawals will be pending.                      
 `/util/v1/jwt/{key}/{secret}`                 | GET    | No    | Generate valid JWT token from API Key.                                                                                                                                                                           
 `/util/v1/xrp/wallet`                         | POST   | No    | Generate XRP account.                                                                                                                                                                                            
 `/util/v1/xrp/transfer`                       | POST   | Yes   | Send XRP / TXRP from account to account                                                                                                                                                                          
 `/util/v1/btc/wallet`                         | POST   | No    | Generate wallet.                                                                                                                                                                                                 
 `/util/v1/btc/wallet/xpub/{chain}/{xpub}/{i}` | GET    | No    | Calculate address from xpub on Testnet / Mainnet for given derivation index                                                                                                                                      
 `/util/v1/btc/wallet/xpriv`                   | POST   | No    | Calculate private key of address from mnemonic on Testnet / Mainnet for given derivation index                                                                                                                   
 `/util/v1/btc/withdrawal`                     | POST   | Yes   | Send BTC / TBTC from address to address                                                                                                                                                                          
 `/util/v1/eth/wallet`                         | POST   | No    | Generate ETH wallet.                                                                                                                                                                                             
 `/util/v1/eth/wallet/xpub/{pub}/{i}`          | GET    | No    | Calculate address from xpub on Ropsten / Mainnet for given derivation index                                                                                                                                      
 `/util/v1/eth/wallet/xpriv`                   | POST   | No    | Calculate private key of address from mnemonic on Ropsten / Mainnet for given derivation index                                                                                                                   
 `/util/v1/eth/transfer`                       | POST   | Yes   | Send ETH / Ropsten ETH from account to account                                                                                                                                                                   
 `/util/v1/eth/erc20/deploy`                   | POST   | Yes   | Deploy ETH / Ropsten ETH ERC20 Smart Contract. Response could take quite a lot of time, average time of creation is 3-4 minutes.                                                                                 
 `/util/v1/eth/erc20/transfer`                 | POST   | Yes   | Transfer ETH / Ropsten ETH ERC20 Smart Contract Tokens from account to account                                                                                                                                   
<!-- /markdown-swagger -->
