/* eslint-disable */
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("🔍 Debugging IdentityRegistry Agent Role Issue...\n");

    // Get the signer
    const [deployer] = await ethers.getSigners();
    console.log("Deployer address:", deployer.address);

    // Load deployment info
    const deploymentsDir = path.join(__dirname, "..", "deployments");
    let deploymentInfo = null;

    // Try to load factory deployment first
    const factoryPath = path.join(deploymentsDir, "factory-deployment-latest.json");
    if (fs.existsSync(factoryPath)) {
        deploymentInfo = JSON.parse(fs.readFileSync(factoryPath, "utf8"));
        console.log("Using factory deployment");
    } else {
        // Fall back to manual deployment
        const manualPath = path.join(deploymentsDir, "manual-deployment-latest.json");
        if (fs.existsSync(manualPath)) {
            deploymentInfo = JSON.parse(fs.readFileSync(manualPath, "utf8"));
            console.log("Using manual deployment");
        } else {
            throw new Error("No deployment found");
        }
    }

    const identityRegistryAddress = deploymentInfo.core?.identityRegistry || deploymentInfo.contracts?.identityRegistry;
    console.log("IdentityRegistry address:", identityRegistryAddress);

    // Get the contract instance
    const IdentityRegistry = await ethers.getContractFactory("IdentityRegistry");
    const identityRegistry = IdentityRegistry.attach(identityRegistryAddress);

    console.log("\n📋 Contract Information:");
    
    try {
        // Check if contract exists
        const code = await ethers.provider.getCode(identityRegistryAddress);
        console.log("Contract code exists:", code !== "0x");
        
        // Check owner
        const owner = await identityRegistry.owner();
        console.log("Contract owner:", owner);
        console.log("Deployer is owner:", owner.toLowerCase() === deployer.address.toLowerCase());
        
        // Check if deployer is already an agent
        const isAgent = await identityRegistry.isAgent(deployer.address);
        console.log("Deployer is agent:", isAgent);
        
        // Get contract interface info
        console.log("\n🔧 Available functions:");
        const fragment = identityRegistry.interface.getFunction("addAgent");
        console.log("addAgent function exists:", !!fragment);
        if (fragment) {
            console.log("Function signature:", fragment.format());
        }
        
        // Try to get more info about the contract
        console.log("\n🏗️ Contract State:");
        
        // Check if contract is initialized (if it has such a method)
        try {
            // This might not exist, just trying
            const initialized = await identityRegistry.isInitialized?.();
            console.log("Contract initialized:", initialized);
        } catch (error) {
            console.log("No isInitialized method or not accessible");
        }

        // Try to check the identity storage
        try {
            const storageAddress = await identityRegistry.identityStorage();
            console.log("Identity storage address:", storageAddress);
            
            // Check if storage has correct permissions
            const IdentityRegistryStorage = await ethers.getContractFactory("IdentityRegistryStorage");
            const storage = IdentityRegistryStorage.attach(storageAddress);
            
            const storageOwner = await storage.owner();
            console.log("Storage owner:", storageOwner);
            
            const registryIsAgentOnStorage = await storage.isAgent(identityRegistryAddress);
            console.log("IdentityRegistry is agent on Storage:", registryIsAgentOnStorage);
            
        } catch (error) {
            console.log("Could not check identity storage:", error.message);
        }

        console.log("\n🧪 Testing addAgent call...");
        
        // Estimate gas for the call
        try {
            const gasEstimate = await identityRegistry.addAgent.estimateGas(deployer.address);
            console.log("Gas estimate for addAgent:", gasEstimate.toString());
        } catch (error) {
            console.log("❌ Gas estimation failed:", error.message);
            
            // Try to get more specific error
            if (error.reason) {
                console.log("Revert reason:", error.reason);
            }
            
            // Try to call the function to get the revert reason
            try {
                await identityRegistry.addAgent.staticCall(deployer.address);
            } catch (staticError) {
                console.log("Static call error:", staticError.message);
                if (staticError.reason) {
                    console.log("Static call revert reason:", staticError.reason);
                }
            }
        }

    } catch (error) {
        console.error("❌ Error during debugging:", error.message);
    }
}

main()
    .then(() => {
        console.log("\n✅ Debugging completed");
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Debugging failed:", error);
        process.exit(1);
    });
