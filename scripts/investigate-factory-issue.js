/* eslint-disable */
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("🔬 INVESTIGACIÓN PROFUNDA: Factory Deployment vs Manual");
    console.log("=".repeat(70));

    // Get network and signer info
    const network = await ethers.provider.getNetwork();
    const [deployer] = await ethers.getSigners();
    
    console.log(`🌐 Red: ${network.name} (Chain ID: ${network.chainId})`);
    console.log(`👤 Investigador: ${deployer.address}`);

    // Load factory deployment
    const deploymentsDir = path.join(__dirname, "..", "deployments");
    const factoryPath = path.join(deploymentsDir, "factory-deployment-latest.json");
    
    if (!fs.existsSync(factoryPath)) {
        console.log("❌ No se encontró factory deployment");
        return;
    }

    const factoryData = JSON.parse(fs.readFileSync(factoryPath, "utf8"));
    console.log("\n📋 INFORMACIÓN DEL FACTORY DEPLOYMENT:");
    console.log(`   Deployer: ${factoryData.deployer}`);
    console.log(`   Token Owner: ${factoryData.tokenOwner}`);
    console.log(`   Agent: ${factoryData.agent}`);
    console.log(`   Salt usado: ${factoryData.salt}`);

    // Get contract instances
    const token = await ethers.getContractAt("Token", factoryData.core.token);
    const identityRegistry = await ethers.getContractAt("IdentityRegistry", factoryData.core.identityRegistry);
    const trexFactory = await ethers.getContractAt("TREXFactory", factoryData.infrastructure.trexFactory);

    console.log("\n🔍 ANÁLISIS DETALLADO DE CONTRATOS:");
    
    try {
        // 1. Verificar ownership del Token
        console.log("\n🪙 TOKEN CONTRACT ANALYSIS:");
        const tokenOwner = await token.owner();
        const tokenPaused = await token.paused();
        console.log(`   Owner: ${tokenOwner}`);
        console.log(`   Está pausado: ${tokenPaused}`);
        console.log(`   Owner es deployer: ${tokenOwner.toLowerCase() === deployer.address.toLowerCase()}`);
        
        // Check if token has AgentRole functionality
        try {
            const hasAgentRole = await token.isAgent(deployer.address);
            console.log(`   Deployer es Agent: ${hasAgentRole}`);
        } catch (error) {
            console.log(`   Error verificando Agent role: ${error.message}`);
        }

        // 2. Verificar IdentityRegistry
        console.log("\n🆔 IDENTITY REGISTRY ANALYSIS:");
        const irOwner = await identityRegistry.owner();
        console.log(`   Owner: ${irOwner}`);
        console.log(`   Owner es deployer: ${irOwner.toLowerCase() === deployer.address.toLowerCase()}`);
        
        try {
            const isIRAgent = await identityRegistry.isAgent(deployer.address);
            console.log(`   Deployer es Agent: ${isIRAgent}`);
        } catch (error) {
            console.log(`   Error verificando Agent role: ${error.message}`);
        }

        // 3. Verificar configuración del TREXFactory
        console.log("\n🏭 TREX FACTORY ANALYSIS:");
        try {
            const factoryOwner = await trexFactory.owner();
            console.log(`   Factory Owner: ${factoryOwner}`);
            
            // Check if the token was deployed correctly by factory
            const deployedToken = await trexFactory.getToken(factoryData.salt);
            console.log(`   Token registrado en factory: ${deployedToken}`);
            console.log(`   Coincide con deployment: ${deployedToken.toLowerCase() === factoryData.core.token.toLowerCase()}`);
            
        } catch (error) {
            console.log(`   Error verificando factory: ${error.message}`);
        }

        // 4. Verificar la configuración inicial del token via factory
        console.log("\n📜 DEPLOYMENT TRANSACTION ANALYSIS:");
        console.log("   Analizando cómo se configuró el token durante el deployment...");
        
        // Get deployment transaction details if available
        const currentBlock = await ethers.provider.getBlockNumber();
        console.log(`   Block actual: ${currentBlock}`);
        
        // Check token initialization
        try {
            const tokenName = await token.name();
            const tokenSymbol = await token.symbol();
            const tokenDecimals = await token.decimals();
            console.log(`   Token info: ${tokenName} (${tokenSymbol}) - ${tokenDecimals} decimals`);
            
            // Check compliance module
            const compliance = await token.compliance();
            console.log(`   Compliance contract: ${compliance}`);
            
            // Check identity registry connection
            const tokenIR = await token.identityRegistry();
            console.log(`   Token Identity Registry: ${tokenIR}`);
            console.log(`   IR coincide: ${tokenIR.toLowerCase() === factoryData.core.identityRegistry.toLowerCase()}`);
            
        } catch (error) {
            console.log(`   Error obteniendo info del token: ${error.message}`);
        }

        // 5. Intentar entender por qué addAgent falla
        console.log("\n🧪 DEBUGGING addAgent FAILURE:");
        
        // Check if the account calling addAgent has the right permissions
        console.log("   Verificando precondiciones para addAgent...");
        
        try {
            // Try to simulate the addAgent call
            const canAddAgent = await token.addAgent.staticCall(deployer.address);
            console.log(`   Simulación addAgent exitosa: ${canAddAgent}`);
        } catch (error) {
            console.log(`   ❌ Simulación addAgent falló: ${error.message}`);
            
            // Extract more detailed error info
            if (error.reason) {
                console.log(`   Razón específica: ${error.reason}`);
            }
            
            if (error.data) {
                console.log(`   Datos del error: ${error.data}`);
                // Try to decode the error
                try {
                    const errorInterface = new ethers.utils.Interface([
                        "error Ownable(string)",
                        "error AgentRole(string)"
                    ]);
                    const decoded = errorInterface.parseError(error.data);
                    console.log(`   Error decodificado: ${decoded}`);
                } catch (decodeError) {
                    console.log(`   No se pudo decodificar el error`);
                }
            }
        }

        // 6. Check if there are any implementation issues
        console.log("\n🔧 IMPLEMENTATION ANALYSIS:");
        
        try {
            // Check if this is a proxy contract
            const implementationSlot = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
            const implementation = await ethers.provider.getStorageAt(token.address, implementationSlot);
            
            if (implementation !== "0x" + "0".repeat(64)) {
                console.log(`   Es un proxy contract`);
                console.log(`   Implementation: 0x${implementation.slice(-40)}`);
                
                // Check if the implementation has the expected functions
                const implementationContract = await ethers.getContractAt("Token", "0x" + implementation.slice(-40));
                try {
                    await implementationContract.addAgent.staticCall(deployer.address);
                    console.log(`   Implementation tiene función addAgent`);
                } catch (impError) {
                    console.log(`   Implementation addAgent error: ${impError.message}`);
                }
            } else {
                console.log(`   No es un proxy contract (implementación directa)`);
            }
        } catch (error) {
            console.log(`   Error verificando implementación: ${error.message}`);
        }

    } catch (error) {
        console.error("❌ Error durante el análisis:", error.message);
    }

    console.log("\n" + "=".repeat(70));
    console.log("🎯 CONCLUSIONES DE LA INVESTIGACIÓN:");
    console.log("   Los resultados se mostrarán arriba. Buscar:");
    console.log("   - Diferencias en ownership");
    console.log("   - Problemas de inicialización");
    console.log("   - Errores específicos en addAgent");
    console.log("   - Configuración de proxy/implementation");
}

main()
    .then(() => {
        console.log("\n✅ Investigación completada");
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Error en investigación:", error);
        process.exit(1);
    });
