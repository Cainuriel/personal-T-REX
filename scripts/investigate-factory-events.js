/* eslint-disable */
const { ethers } = require("hardhat");
const fs = require('fs');

async function main() {
    console.log("=== INVESTIGACIÓN DEL FACTORY DEPLOYMENT ===\n");
    
    const [deployer] = await ethers.getSigners();
    console.log(`Deployer: ${deployer.address}`);

    const deploymentFile = 'deployments/factory-deployment-latest.json';
    const deployment = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
      console.log("=== INFORMACIÓN DEL DEPLOYMENT ===");
    console.log(`Token: ${deployment.core.token}`);
    console.log(`Factory: ${deployment.infrastructure.trexFactory}`);
    console.log(`Deployer: ${deployment.deployer}`);
    console.log(`Token Owner: ${deployment.tokenOwner}`);
    console.log(`Agent configurado: ${deployment.agent}\n`);
    
    // Verificar si son iguales
    console.log("=== COMPARACIÓN DE ADDRESSES ===");
    console.log(`Deployer actual: ${deployer.address}`);
    console.log(`Deployer en deployment: ${deployment.deployer}`);
    console.log(`Son iguales: ${deployer.address.toLowerCase() === deployment.deployer.toLowerCase()}`);
    console.log(`Token owner: ${deployment.tokenOwner}`);
    console.log(`Agent configurado: ${deployment.agent}`);
    console.log(`Agent es deployer: ${deployment.agent.toLowerCase() === deployer.address.toLowerCase()}\n`);
      // Obtener contratos
    const token = await ethers.getContractAt("Token", deployment.core.token);
    const factory = await ethers.getContractAt("TREXFactory", deployment.infrastructure.trexFactory);
    
    console.log("=== VERIFICACIÓN DEL ESTADO ACTUAL ===");
    const owner = await token.owner();
    const paused = await token.paused();
    const isAgent = await token.isAgent(deployer.address);
    const isAgentConfigured = await token.isAgent(deployment.agent);
    
    console.log(`Token owner: ${owner}`);
    console.log(`Token pausado: ${paused}`);
    console.log(`Deployer es agent: ${isAgent}`);
    console.log(`Agent configurado es agent: ${isAgentConfigured}`);
    
    console.log("\n=== BÚSQUEDA DE EVENTOS AgentAdded ===");
    
    try {
        // Buscar eventos AgentAdded desde los últimos 1000 bloques
        const currentBlock = await ethers.provider.getBlockNumber();
        const fromBlock = Math.max(0, currentBlock - 1000);
        
        console.log(`Buscando desde bloque ${fromBlock} hasta ${currentBlock}`);
        
        const filter = token.filters.AgentAdded();
        const events = await token.queryFilter(filter, fromBlock);
        
        console.log(`Eventos AgentAdded encontrados: ${events.length}`);
        events.forEach((event, i) => {
            console.log(`  ${i + 1}. Agent añadido: ${event.args.agent} en bloque ${event.blockNumber}`);
        });
        
        if (events.length === 0) {
            console.log("❌ NO se encontraron eventos AgentAdded");
            console.log("Esto confirma que el factory NO añadió ningún agent");
        }
        
    } catch (error) {
        console.log(`Error buscando eventos: ${error.message}`);
        
        // Intentar búsqueda más específica
        console.log("Intentando búsqueda desde bloque 0...");
        try {
            const filter = token.filters.AgentAdded();
            const events = await token.queryFilter(filter, 0, 100);
            console.log(`Eventos en primeros 100 bloques: ${events.length}`);
        } catch (error2) {
            console.log(`Error en búsqueda específica: ${error2.message}`);
        }
    }
    
    console.log("\n=== VERIFICACIÓN DE LA TRANSACCIÓN DEL FACTORY ===");
    
    if (deployment.transactionHash) {
        console.log(`Hash de deployment: ${deployment.transactionHash}`);
        try {
            const receipt = await ethers.provider.getTransactionReceipt(deployment.transactionHash);
            if (receipt) {
                console.log(`Status del deployment: ${receipt.status === 1 ? 'Exitoso' : 'Fallido'}`);
                console.log(`Gas usado: ${receipt.gasUsed.toString()}`);
                console.log(`Logs: ${receipt.logs.length}`);
                
                // Analizar logs para eventos
                receipt.logs.forEach((log, i) => {
                    try {
                        const parsed = token.interface.parseLog(log);
                        console.log(`  Log ${i + 1}: ${parsed.name} - ${JSON.stringify(parsed.args)}`);
                    } catch (error) {
                        // No es un evento del token
                    }
                });
            }
        } catch (error) {
            console.log(`Error analizando transacción: ${error.message}`);
        }
    } else {
        console.log("❌ No hay hash de transacción en el deployment");
    }
    
    console.log("\n=== CONCLUSIONES ===");
    console.log("Si no se encontraron eventos AgentAdded, esto confirma que:");
    console.log("1. El factory deployment NO añadió agents automáticamente");
    console.log("2. Hay un problema en la configuración del factory");
    console.log("3. O el tokenAgents array estaba vacío durante el deployment");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
