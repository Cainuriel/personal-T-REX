/* eslint-disable */
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("🔍 Verificando estado de contratos y permisos...\n");

    // Get network info
    const network = await ethers.provider.getNetwork();
    console.log(`🌐 Red actual: ${network.name} (Chain ID: ${network.chainId})`);

    // Get the signer
    const [deployer] = await ethers.getSigners();
    console.log("Cuenta activa:", deployer.address);

    // Load deployment info
    const deploymentsDir = path.join(__dirname, "..", "deployments");    const contractsPath = path.join(deploymentsDir, "factory-deployment-latest.json");
    // const contractsPath = path.join(deploymentsDir, "manual-deployment-latest.json");
    
    if (!fs.existsSync(contractsPath)) {
        console.log("❌ No se encontró deployment ");
        return;
    }

    const deploymentInfo = JSON.parse(fs.readFileSync(contractsPath, "utf8"));
    console.log("\n📄 Deployment Info:");
    console.log(`   Red del deployment: ${deploymentInfo.network?.name || 'unknown'} (Chain ID: ${deploymentInfo.network?.chainId || 'unknown'})`);
    console.log(`   Deployer: ${deploymentInfo.deployer}`);
    console.log(`   Token Owner: ${deploymentInfo.tokenOwner}`);
    console.log(`   Agent: ${deploymentInfo.agent}`);
    
    // Check if we're on the same network
    if (deploymentInfo.network?.chainId && deploymentInfo.network.chainId !== network.chainId) {
        console.log("\n⚠️  ADVERTENCIA: Estás en una red diferente al deployment!");
        console.log(`   Deployment: Chain ID ${deploymentInfo.network.chainId}`);
        console.log(`   Red actual: Chain ID ${network.chainId}`);
        console.log("   Los contratos pueden no existir en esta red.");
    }

    // Get contracts
    const token = await ethers.getContractAt("Token", deploymentInfo.core.token);
    const identityRegistry = await ethers.getContractAt("IdentityRegistry", deploymentInfo.core.identityRegistry);
    const trustedIssuersRegistry = await ethers.getContractAt("TrustedIssuersRegistry", deploymentInfo.core.trustedIssuersRegistry);    console.log("\n🔍 Verificando permisos...");
    
    // First, check if contracts exist
    console.log("\n📋 Verificando existencia de contratos:");
    const tokenCode = await ethers.provider.getCode(deploymentInfo.core.token);
    const irCode = await ethers.provider.getCode(deploymentInfo.core.identityRegistry);
    const tirCode = await ethers.provider.getCode(deploymentInfo.core.trustedIssuersRegistry);
    
    console.log(`Token existe: ${tokenCode !== "0x" ? "✅ SÍ" : "❌ NO"}`);
    console.log(`IdentityRegistry existe: ${irCode !== "0x" ? "✅ SÍ" : "❌ NO"}`);
    console.log(`TrustedIssuersRegistry existe: ${tirCode !== "0x" ? "✅ SÍ" : "❌ NO"}`);
    
    if (tokenCode === "0x" || irCode === "0x" || tirCode === "0x") {
        console.log("\n❌ Algunos contratos no existen. Posibles causas:");
        console.log("   1. La red cambió y los contratos no están desplegados");
        console.log("   2. El deployment falló parcialmente");
        console.log("   3. Estás en una red diferente a la del deployment");
        return;
    }
    
    console.log("\n🔍 Verificando permisos de contratos...");
    
    try {
        // Check token ownership and agent status
        console.log("\n🪙 TOKEN:");
        const tokenOwner = await token.owner();
        console.log(`   Owner: ${tokenOwner}`);
        
        const isTokenAgent = await token.isAgent(deployer.address);
        console.log(`   Deployer es Agent: ${isTokenAgent}`);
        
        // Check identity registry ownership and agent status
        console.log("\n🆔 IDENTITY REGISTRY:");
        const irOwner = await identityRegistry.owner();
        console.log(`   Owner: ${irOwner}`);
        
        const isIRAgent = await identityRegistry.isAgent(deployer.address);
        console.log(`   Deployer es Agent: ${isIRAgent}`);
        
        // Check trusted issuers registry
        console.log("\n🏛️ TRUSTED ISSUERS REGISTRY:");
        const tirOwner = await trustedIssuersRegistry.owner();
        console.log(`   Owner: ${tirOwner}`);
        
        console.log("\n💡 RESUMEN DE PERMISOS:");
        if (tokenOwner.toLowerCase() === deployer.address.toLowerCase()) {
            console.log("✅ Tienes ownership del Token");
        } else {
            console.log("❌ NO tienes ownership del Token");
            console.log(`   Owner actual: ${tokenOwner}`);
        }
        
        if (isIRAgent) {
            console.log("✅ Tienes rol de Agent en IdentityRegistry");
        } else {
            console.log("❌ NO tienes rol de Agent en IdentityRegistry");
        }
        
        if (tirOwner.toLowerCase() === deployer.address.toLowerCase()) {
            console.log("✅ Tienes ownership del TrustedIssuersRegistry");
        } else {
            console.log("❌ NO tienes ownership del TrustedIssuersRegistry");
            console.log(`   Owner actual: ${tirOwner}`);
        }

    } catch (error) {
        console.error("❌ Error verificando permisos:", error.message);
        console.log("\n🔍 Información de debug:");
        console.log(`   Error code: ${error.code}`);
        console.log(`   Error method: ${error.method}`);
        console.log(`   Contract address: ${error.address}`);
    }
}

main()
    .then(() => {
        console.log("\n✅ Verificación completada");
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Error:", error);
        process.exit(1);
    });
