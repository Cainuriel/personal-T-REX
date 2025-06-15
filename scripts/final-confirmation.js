/* eslint-disable */
const { ethers } = require("hardhat");
const fs = require('fs');

async function main() {
    console.log("=== CONFIRMACIÓN FINAL DE LA CAUSA RAÍZ ===\n");
    
    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    console.log(`Network: ${network.name} (chainId: ${network.chainId})`);
    console.log(`Deployer: ${deployer.address}\n`);

    const deploymentFile = 'deployments/factory-deployment-latest.json';
    const deployment = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
    const token = await ethers.getContractAt("Token", deployment.core.token);
    
    console.log("=== ESTADO ACTUAL ===");
    const owner = await token.owner();
    const paused = await token.paused();
    const isAgent = await token.isAgent(deployer.address);
    
    console.log(`Owner: ${owner}`);
    console.log(`Paused: ${paused}`);
    console.log(`Es Agent: ${isAgent}`);
    console.log(`Es Owner: ${owner.toLowerCase() === deployer.address.toLowerCase()}\n`);
    
    console.log("=== PRUEBA DEFINITIVA: addAgent CON TOKEN PAUSADO ===");
    try {
        // Intentar la transacción real, no solo estimateGas
        const addAgentTx = await token.addAgent(deployer.address);
        console.log(`✅ addAgent EXITOSO! Hash: ${addAgentTx.hash}`);
        await addAgentTx.wait();
        console.log("✅ Transacción confirmada");
        
        // Verificar que se añadió
        const isAgentNow = await token.isAgent(deployer.address);
        console.log(`Ahora es Agent: ${isAgentNow}`);
        
        if (isAgentNow) {
            console.log("\n=== AHORA INTENTAR DESPAUSAR ===");
            try {
                const unpauseTx = await token.unpause();
                console.log(`✅ unpause EXITOSO! Hash: ${unpauseTx.hash}`);
                await unpauseTx.wait();
                console.log("✅ Token despausado exitosamente");
                
                const newPaused = await token.paused();
                console.log(`Estado pausado: ${newPaused}`);
                
            } catch (error) {
                console.log(`❌ Error despausando: ${error.reason || error.message}`);
            }
        }
        
    } catch (error) {
        console.log(`❌ addAgent FALLÓ: ${error.reason || error.message}`);
        
        // Intentar obtener más detalles del error
        if (error.data) {
            console.log(`Error data: ${error.data}`);
        }
        
        // Si falla, verificar por qué
        console.log("\n=== ANÁLISIS DEL ERROR ===");
        console.log("Posibles causas:");
        console.log("1. addAgent requiere whenNotPaused");
        console.log("2. addAgent tiene otro prerequisito");
        console.log("3. Problema de configuración del contrato");
    }
    
    console.log("\n=== RESUMEN DE HALLAZGOS ===");
    console.log("Configuración después del factory deployment:");
    console.log("- ✅ Deployer es Owner del token");
    console.log("- ❌ Deployer NO es Agent");
    console.log("- ⚠️  Token está PAUSADO");
    console.log("- 🔍 addAgent() tiene modifier onlyOwner (OK)");
    console.log("- 🔍 unpause() tiene modifier onlyAgent (PROBLEMA)");
    console.log("\nEsto confirma que el factory NO asigna automáticamente");
    console.log("el rol de Agent al deployer, creando un estado problemático.");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
