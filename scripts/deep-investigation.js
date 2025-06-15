/* eslint-disable */
const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
    console.log("=== INVESTIGACIÓN PROFUNDA DEL PROBLEMA ===\n");
    
    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    console.log(`Network: ${network.name} (chainId: ${network.chainId})`);
    console.log(`Deployer: ${deployer.address}`);
    console.log(`Balance: ${ethers.utils.formatEther(await deployer.getBalance())} ETH\n`);    // Cargar deployment info
    let deploymentFile = `deployments/factory-deployment-${network.name}.json`;
    if (!fs.existsSync(deploymentFile)) {
        // Intentar con latest
        deploymentFile = 'deployments/factory-deployment-latest.json';
        if (!fs.existsSync(deploymentFile)) {
            console.error(`❌ No se encontró archivo de deployment ni para ${network.name} ni latest`);
            return;
        }
        console.log(`⚠ Usando deployment latest en lugar de ${network.name}`);
    }    const deployment = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
    console.log("📋 Deployment cargado:");
    console.log(`Token: ${deployment.core.token}`);
    console.log(`Identity Registry: ${deployment.core.identityRegistry}`);
    console.log(`Compliance: ${deployment.core.compliance}\n`);

    // Obtener contratos
    const token = await ethers.getContractAt("Token", deployment.core.token);
    const identityRegistry = await ethers.getContractAt("IdentityRegistry", deployment.core.identityRegistry);
    
    console.log("=== 1. ANÁLISIS DEL ESTADO ACTUAL ===");
    
    try {
        const owner = await token.owner();
        const paused = await token.paused();
        const isAgent = await token.isAgent(deployer.address);
        
        console.log(`Owner: ${owner}`);
        console.log(`Paused: ${paused}`);
        console.log(`Deployer es Agent: ${isAgent}`);
        console.log(`Deployer es Owner: ${owner.toLowerCase() === deployer.address.toLowerCase()}\n`);
          // Verificar eventos de deployment
        console.log("=== 2. VERIFICANDO EVENTOS DE DEPLOYMENT ===");
        const filter = token.filters.AgentAdded();
        const events = await token.queryFilter(filter, deployment.blockNumber || 0);
        console.log(`Eventos AgentAdded desde deployment: ${events.length}`);
        events.forEach((event, i) => {
            console.log(`  ${i + 1}. Agent añadido: ${event.args.agent}`);
        });
        
        // Verificar eventos de pausa
        const pauseFilter = token.filters.Paused ? token.filters.Paused() : null;
        if (pauseFilter) {
            const pauseEvents = await token.queryFilter(pauseFilter, deployment.blockNumber || 0);
            console.log(`Eventos Paused desde deployment: ${pauseEvents.length}`);
            pauseEvents.forEach((event, i) => {
                console.log(`  ${i + 1}. Pausado en bloque: ${event.blockNumber}`);
            });
        }
        
        console.log("\n=== 3. ANÁLISIS DE LA FUNCIÓN addAgent ===");
        
        // Intentar addAgent con estimateGas para obtener mejor error
        try {
            const gasEstimate = await token.estimateGas.addAgent(deployer.address);
            console.log(`✅ Gas estimado para addAgent: ${gasEstimate.toString()}`);
        } catch (error) {
            console.log(`❌ Error en estimateGas addAgent: ${error.message}`);
            
            // Intentar obtener el código de error específico
            if (error.data) {
                console.log(`Error data: ${error.data}`);
            }
            
            // Decodificar revert reason si está disponible
            if (error.reason) {
                console.log(`Revert reason: ${error.reason}`);
            }
        }
        
        console.log("\n=== 4. VERIFICANDO PREREQUISITOS DE addAgent ===");
        
        // Verificar si hay algún modifier que esté fallando
        console.log("Verificando modifiers potenciales:");
        
        // 1. onlyOwner - ya verificamos
        console.log(`✓ onlyOwner: ${owner.toLowerCase() === deployer.address.toLowerCase()}`);
        
        // 2. whenNotPaused - verificar si addAgent requiere esto
        console.log(`⚠ Token pausado: ${paused}`);
        
        // 3. Verificar si el agente ya existe
        console.log(`✓ Agent ya existe: ${isAgent}`);
        
        // 4. Verificar estado del identity registry
        try {
            const irOwner = await identityRegistry.owner();
            console.log(`✓ IdentityRegistry owner: ${irOwner}`);
            console.log(`✓ IdentityRegistry mismo owner: ${irOwner.toLowerCase() === owner.toLowerCase()}`);
        } catch (error) {
            console.log(`❌ Error verificando IdentityRegistry: ${error.message}`);
        }
        
        console.log("\n=== 5. PROBANDO DESPAUSAR PRIMERO ===");
        
        if (paused) {
            console.log("Token está pausado. Intentando despausar...");
            try {
                const unpauseTx = await token.unpause();
                console.log(`Transacción unpause enviada: ${unpauseTx.hash}`);
                await unpauseTx.wait();
                console.log("✅ Token despausado exitosamente");
                
                // Ahora intentar addAgent
                console.log("Intentando addAgent después de despausar...");
                try {
                    const gasEstimate2 = await token.estimateGas.addAgent(deployer.address);
                    console.log(`✅ Gas estimado para addAgent después de despausar: ${gasEstimate2.toString()}`);
                    
                    const addAgentTx = await token.addAgent(deployer.address);
                    console.log(`Transacción addAgent enviada: ${addAgentTx.hash}`);
                    await addAgentTx.wait();
                    console.log("✅ addAgent exitoso después de despausar");
                    
                } catch (error) {
                    console.log(`❌ addAgent falló incluso después de despausar: ${error.message}`);
                }
                
            } catch (error) {
                console.log(`❌ Error despausando: ${error.message}`);
            }
        }
        
        console.log("\n=== 6. ANÁLISIS DEL CÓDIGO DEL CONTRATO ===");
        
        // Obtener bytecode para verificar si es un proxy
        const code = await ethers.provider.getCode(deployment.token);
        console.log(`Bytecode length: ${code.length}`);
        
        // Verificar si tiene funciones de proxy típicas
        try {
            const implementation = await token.implementation();
            console.log(`Es proxy con implementation: ${implementation}`);
        } catch (error) {
            console.log("No es un proxy standard");
        }
          console.log("\n=== 7. VERIFICANDO FACTORY DEPLOYMENT ===");
        
        if (deployment.infrastructure && deployment.infrastructure.factory) {
            console.log(`Factory address: ${deployment.infrastructure.factory}`);
            try {
                const factory = await ethers.getContractAt("TREXFactory", deployment.infrastructure.factory);
                  // Verificar eventos de deployment del factory
                const deployFilter = factory.filters.TREXSuiteDeployed ? factory.filters.TREXSuiteDeployed() : null;
                if (deployFilter) {
                    const fromBlock = Math.max(0, (deployment.blockNumber || 0) - 100);
                    const toBlock = deployment.blockNumber ? deployment.blockNumber + 100 : 'latest';
                    const deployEvents = await factory.queryFilter(deployFilter, fromBlock, toBlock);
                    console.log(`Eventos TREXSuiteDeployed: ${deployEvents.length}`);
                    deployEvents.forEach((event, i) => {
                        if (event.args.token.toLowerCase() === deployment.core.token.toLowerCase()) {
                            console.log(`  Encontrado deployment de nuestro token:`);
                            console.log(`    Token: ${event.args.token}`);
                            console.log(`    Owner: ${event.args.owner || 'N/A'}`);
                            console.log(`    Block: ${event.blockNumber}`);
                        }
                    });
                }
                
            } catch (error) {
                console.log(`Error verificando factory: ${error.message}`);
            }
        } else {
            console.log("No se encontró información del factory en el deployment");
        }
        
    } catch (error) {
        console.error(`❌ Error en la investigación: ${error.message}`);
        console.error(error);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
