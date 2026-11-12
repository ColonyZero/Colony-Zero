# Testnet coin setup (Stage 4)

Until you fill in the token settings, the game uses the mock coin balance. Once filled, the game uses the real wallet balance and real token payments.

## 1. Make the coin (free, about 10 minutes)
1. Install a wallet (MetaMask) and switch it to your testnet. Get free test gas from that testnet's faucet.
2. Open remix.ethereum.org, create a file ColonyCoin.sol, paste the contract below.
3. Compile (Solidity 0.8.20 or newer). Deploy tab: Environment "Injected Provider", Deploy.
4. Copy the deployed contract address.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ColonyCoin is ERC20 {
    mapping(address => uint256) public lastClaim;
    constructor() ERC20("Colony Coin", "TC") {
        _mint(msg.sender, 1000000 * 10 ** decimals());
    }
    function claim() external {
        require(block.timestamp >= lastClaim[msg.sender] + 1 days, "Come back later");
        lastClaim[msg.sender] = block.timestamp;
        _mint(msg.sender, 500 * 10 ** decimals());
    }
}
```
claim() is a free faucet: each wallet gets 500 TC once a day, so players can buy characters. It is unlimited on purpose (testnet only). Delete it if you want to hand out coins yourself.

## 2. Fill in characters.js
- CHAIN: id (number), name, rpc (HTTPS RPC URL), explorer (optional), currency (name, symbol, decimals of the gas coin)
- TOKEN_ADDRESS: the contract address
- TOKEN_DECIMALS: 18 (default for the contract above)
- RECEIVER: the wallet address that receives the payments. Use a fresh wallet. Never put a private key anywhere in the site.
- FAUCET: true (shows a Claim button; only works with the contract above)
- TOKEN_SYMBOL: change "TC" if you named it differently

Prices in characters.js are whole tokens (250 means 250 TC).

## 3. How buying works
Buy opens the wallet to send the token to RECEIVER. The game waits for the transaction, checks the Transfer event (token, sender, receiver, amount), then unlocks the character.

## Known limits
- The check runs in the browser. A determined player can edit their own save and unlock characters without paying. Before real value is involved, verify payments on a server (Supabase Edge Function reading the transaction).
- If a player pays and closes the tab before the confirmation, the character is not granted. A server check would also fix this.
- Ownership lives in the game save (browser, plus Supabase if enabled), not in the wallet.
