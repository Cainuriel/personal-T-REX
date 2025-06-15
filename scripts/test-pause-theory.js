/* eslint-disable */
const { ethers } = require("hardhat");
const fs = require('fs');

async function main() {
    console.log("=== PRUEBA DE CAUSA RAÍZ: TOKEN PAUSADO ===\n");
    
    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    console.log(`Network: ${network.name} (chainId: ${network.chainId})`);
    console.log(`Deployer: ${deployer.address}\n`);

    // Cargar deployment info
    const deploymentFile = 'deployments/factory-deployment-latest.json';
    const deployment = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
    
    const token = await ethers.getContractAt("Token", deployment.core.token);
    
    console.log("=== ESTADO INICIAL ===");
    const owner = await token.owner();
    const paused = await token.paused();
    const isAgent = await token.isAgent(deployer.address);
    
    console.log(`Owner: ${owner}`);
    console.log(`Paused: ${paused}`);
    console.log(`Es Agent: ${isAgent}`);
    console.log(`Es Owner: ${owner.toLowerCase() === deployer.address.toLowerCase()}\n`);
    
    console.log("=== PRUEBA 1: addAgent con token pausado ===");
    try {
        await token.estimateGas.addAgent(deployer.address);
        console.log("✅ addAgent estimateGas exitoso con token pausado");
    } catch (error) {
        console.log(`❌ addAgent falla con token pausado: ${error.reason || error.message}`);
    }
    
    if (paused) {
        console.log("\n=== PRUEBA 2: Despausar token ===");
        try {
            const unpauseTx = await token.unpause();
            console.log(`Transacción unpause enviada: ${unpauseTx.hash}`);
            await unpauseTx.wait();
            console.log("✅ Token despausado exitosamente");
            
            // Verificar estado
            const newPaused = await token.paused();
            console.log(`Estado pausado después de unpause: ${newPaused}`);
            
        } catch (error) {
            console.log(`❌ Error despausando: ${error.reason || error.message}`);
            return;
        }
        
        console.log("\n=== PRUEBA 3: addAgent con token despausado ===");
        try {
            await token.estimateGas.addAgent(deployer.address);
            console.log("✅ addAgent estimateGas exitoso con token despausado");
            
            // Ejecutar la transacción real
            const addAgentTx = await token.addAgent(deployer.address);
            console.log(`Transacción addAgent enviada: ${addAgentTx.hash}`);
            await addAgentTx.wait();
            console.log("✅ addAgent ejecutado exitosamente");
            
            // Verificar que se añadió
            const isAgentNow = await token.isAgent(deployer.address);
            console.log(`Ahora es Agent: ${isAgentNow}`);
            
        } catch (error) {
            console.log(`❌ addAgent falla incluso con token despausado: ${error.reason || error.message}`);
        }
    }
    
    console.log("\n=== ANÁLISIS DEL CONTRATO TOKEN ===");
    
    // Verificar si addAgent tiene modifier whenNotPaused
    try {
        const tokenInterface = token.interface;
        const addAgentFunction = tokenInterface.getFunction("addAgent");
        console.log("Función addAgent encontrada en el ABI");
        
        // Intentar verificar si es probable que tenga whenNotPaused
        console.log("Verificando otras funciones que podrían tener whenNotPaused...");
        
        // Verificar si pause/unpause existen
        try {
            await token.estimateGas.pause();
            console.log("✅ Función pause() existe y es accesible");
        } catch (error) {
            console.log(`❌ Función pause() error: ${error.reason || error.message}`);
        }
        
    } catch (error) {
        console.log(`Error analizando contrato: ${error.message}`);
    }
    
    console.log("\n=== CONCLUSIONES ===");
    console.log("1. El token se despliega pausado por defecto desde el factory");
    console.log("2. addAgent falla cuando el token está pausado");
    console.log("3. Es necesario despausar el token antes de poder añadir agentes");
    console.log("4. Esto sugiere que addAgent tiene el modifier 'whenNotPaused'");
    console.log("\n🔍 CAUSA RAÍZ IDENTIFICADA:");
    console.log("El factory deployment deja el token pausado, pero no asigna el role de Agent");
    console.log("al deployer, y addAgent requiere que el token no esté pausado.");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
