# Factory deployment leaves token in inconsistent state - deployer is owner but not agent, cannot be unpaused

## Summary

After deploying a T-REX suite using the `TREXFactory.deployTREXSuite()` method, the deployed token is left in an inconsistent state where the deployer is the owner but does not have the agent role. This creates a deadlock situation where the token cannot be unpaused or properly managed.

## Problem Description

### Expected Behavior
When deploying a T-REX suite via factory with `tokenAgents` configured, the factory should:
1. Deploy all contracts successfully
2. Set the deployer as owner of the token
3. Add the configured addresses to the agent role via `addAgent()`
4. Leave the token in a manageable state

### Actual Behavior
The factory deployment:
1. ✅ Deploys all contracts successfully
2. ✅ Sets the deployer as owner of the token
3. ❌ **Fails to add configured agents** (no `AgentAdded` events emitted)
4. ❌ Leaves token paused with no way to unpause (deadlock)

### Deadlock Situation
This creates an impossible situation:
- `unpause()` requires `onlyAgent` modifier → deployer cannot unpause
- `addAgent()` fails for unknown reasons → deployer cannot add themselves as agent
- Token remains permanently paused and unusable

## Steps to Reproduce

### 1. Deploy via Factory
```javascript
const tokenDetails = {
    owner: deployer.address,
    name: "Test Token",
    symbol: "TEST",
    decimals: 18,
    irs: ethers.constants.AddressZero,
    ONCHAINID: ethers.constants.AddressZero,
    irAgents: [deployer.address],
    tokenAgents: [deployer.address], // This should add deployer as agent
    complianceModules: [],
    complianceSettings: []
};

await trexFactory.deployTREXSuite(salt, tokenDetails, claimDetails);
```

### 2. Verify State
```javascript
const token = await ethers.getContractAt("Token", tokenAddress);
const owner = await token.owner();
const paused = await token.paused();
const isAgent = await token.isAgent(deployer.address);

console.log(`Owner: ${owner}`); // ✅ deployer.address
console.log(`Paused: ${paused}`); // ❌ true
console.log(`Is Agent: ${isAgent}`); // ❌ false
```

### 3. Attempt to Fix
```javascript
// This fails because token is paused and deployer is not agent
await token.unpause(); // ❌ "AgentRole: caller does not have the Agent role"

// This also fails for unknown reasons
await token.addAgent(deployer.address); // ❌ Transaction reverts
```

## Evidence and Investigation

### Factory Code Analysis
The factory code appears correct in `TREXFactory.sol` lines 160-162:
```solidity
for (uint256 i = 0; i < (_tokenDetails.tokenAgents).length; i++) {
    AgentRole(address(token)).addAgent(_tokenDetails.tokenAgents[i]);
}
```

### Testing Results
We performed extensive testing to isolate the issue:

1. **✅ Factory Contract Works**: A new test deployment with identical configuration successfully added the agent
2. **❌ Original Deployment Failed**: No `AgentAdded` events found in the problematic deployment
3. **❌ Manual addAgent Fails**: Even manual `addAgent()` calls fail on the problematic token
4. **✅ callStatic Works**: `callStatic.addAgent()` succeeds, indicating no logical barriers

### Network Information
- **Network**: Taycan (Chain ID: 2023)
- **Problematic Token**: `0x4348B73043Fc32e062A735E30456Eb07bB6F34f1`
- **Factory**: `0x97F1d03d78e015dc8a982384f4216e3F73E8aC8c`
- **Working Test Token**: `0x3b88DdD0c10C29C775395DDaf06c20eF63E076a0`

## Impact

This issue has severe consequences:
- **Critical**: Tokens become permanently unusable if deployed in this state
- **User Experience**: Complete deployment failure requiring redeployment
- **Trust**: Users lose confidence in factory reliability
- **Resources**: Wasted gas and time on unusable deployments

## Root Cause Analysis

Based on our investigation, the issue appears to be:

1. **Not a factory contract bug** (proven by successful test deployment)
2. **Specific to certain deployment conditions** (configuration, network state, or timing)
3. **Possibly a silent failure** in the agent assignment logic during deployment
4. **State inconsistency** that prevents manual recovery

## Proposed Solutions

### Short-term Mitigation
1. Add validation in factory to verify agents were added successfully
2. Emit explicit events for debugging failed agent assignments
3. Add recovery mechanism for stuck tokens

### Long-term Fix
1. Investigate why certain deployments fail to add agents
2. Add comprehensive state validation after deployment
3. Implement automatic retry mechanism for failed agent assignments
4. Consider making `unpause()` accessible to owner in emergency situations

## Additional Context

### Related Code Files
- `contracts/factory/TREXFactory.sol` - Factory implementation
- `contracts/roles/AgentRole.sol` - Agent role management
- `contracts/token/Token.sol` - Token pause/unpause logic

### Environment
- **Hardhat**: Latest version
- **Solidity**: ^0.8.17
- **Network**: Custom EVM network (Taycan)

### Test Scripts
We have comprehensive test scripts that reproduce this issue and can be provided for debugging purposes.

## Priority
**High** - This affects core functionality and can result in unusable deployments, breaking the entire T-REX deployment process.
