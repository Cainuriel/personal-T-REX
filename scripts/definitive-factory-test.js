/* eslint-disable */
const { ethers } = require("hardhat");

/**
 * PRUEBA DEFINITIVA PARA DIAGNOSTICAR EL PROBLEMA DEL FACTORY
 * 
 * Esta prueba simulará exactamente lo que debería haber pasado durante
 * el factory deployment para determinar si el problema está en:
 * 1. El factory contract (bug)
 * 2. La configuración pasada al factory (vacía o incorrecta)
 * 3. Un fallo en la ejecución del factory
 */
async function main() {
    console.log("=== PRUEBA DEFINITIVA DEL FACTORY ===\n");
    
    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    console.log(`Network: ${network.name} (chainId: ${network.chainId})`);
    console.log(`Deployer: ${deployer.address}\n`);

    // Cargar deployment info del factory existente
    const deploymentFile = 'deployments/factory-deployment-latest.json';
    const deployment = JSON.parse(require('fs').readFileSync(deploymentFile, 'utf8'));
    
    const factory = await ethers.getContractAt("TREXFactory", deployment.infrastructure.trexFactory);
    
    console.log("=== PRUEBA 1: NUEVO DEPLOYMENT CON CONFIGURACIÓN EXPLÍCITA ===");
    
    // Crear un nuevo deployment con configuración explícita para confirmar
    const testSalt = `TEST_${Date.now()}`;
    
    const tokenDetails = {
        owner: deployer.address,
        name: "Test Token",
        symbol: "TEST",
        decimals: 18,
        irs: ethers.constants.AddressZero,
        ONCHAINID: ethers.constants.AddressZero,
        irAgents: [deployer.address], // Explícitamente el deployer
        tokenAgents: [deployer.address], // Explícitamente el deployer
        complianceModules: [],
        complianceSettings: []
    };
    
    const claimDetails = {
        claimTopics: [1, 2],
        issuers: [],
        issuerClaims: []
    };
    
    console.log("Configuración del test:");
    console.log(`- Salt: ${testSalt}`);
    console.log(`- Owner: ${tokenDetails.owner}`);
    console.log(`- Token Agents: ${JSON.stringify(tokenDetails.tokenAgents)}`);
    console.log(`- IR Agents: ${JSON.stringify(tokenDetails.irAgents)}`);
    
    try {
        console.log("\nIntentando deployment de prueba...");
        
        // Verificar si ya existe
        const existingToken = await factory.getToken(testSalt);
        if (existingToken !== ethers.constants.AddressZero) {
            console.log(`❌ Ya existe un token con este salt: ${existingToken}`);
            console.log("Usando ese token para las pruebas...");
            
            const token = await ethers.getContractAt("Token", existingToken);
            const isAgent = await token.isAgent(deployer.address);
            console.log(`¿Deployer es agent en token existente? ${isAgent}`);
            
        } else {
            console.log("✅ Salt disponible, procediendo con deployment...");
            
            const tx = await factory.connect(deployer).deployTREXSuite(
                testSalt,
                tokenDetails,
                claimDetails
            );
            
            console.log(`Transacción enviada: ${tx.hash}`);
            const receipt = await tx.wait();
            console.log(`✅ Deployment exitoso! Gas usado: ${receipt.gasUsed.toString()}`);
            
            // Verificar el token desplegado
            const tokenAddress = await factory.getToken(testSalt);
            console.log(`Token desplegado en: ${tokenAddress}`);
            
            const token = await ethers.getContractAt("Token", tokenAddress);
            
            // Verificar estado
            const owner = await token.owner();
            const paused = await token.paused();
            const isAgent = await token.isAgent(deployer.address);
            
            console.log("\n=== VERIFICACIÓN DEL NUEVO TOKEN ===");
            console.log(`Owner: ${owner}`);
            console.log(`Paused: ${paused}`);
            console.log(`Deployer es agent: ${isAgent}`);
            
            if (isAgent) {
                console.log("✅ ¡SUCCESS! El factory SÍ añadió el agent correctamente");
                console.log("Esto significa que el problema fue con el deployment anterior,");
                console.log("no con el factory contract en sí mismo.");
            } else {
                console.log("❌ PROBLEMA CONFIRMADO: El factory NO añadió el agent");
                console.log("Esto indica un bug en el factory contract.");
            }
            
            // Buscar eventos AgentAdded
            console.log("\n=== VERIFICANDO EVENTOS ===");
            const filter = token.filters.AgentAdded();
            const events = await token.queryFilter(filter, receipt.blockNumber, receipt.blockNumber);
            console.log(`Eventos AgentAdded en este bloque: ${events.length}`);
            events.forEach((event, i) => {
                console.log(`  ${i + 1}. Agent añadido: ${event.args.agent}`);
            });
        }
        
    } catch (error) {
        console.log(`❌ Error en deployment de prueba: ${error.message}`);
        
        if (error.message.includes("already deployed")) {
            console.log("El salt ya está en uso, esto es normal en pruebas repetidas.");
        } else {
            console.log("Error inesperado, esto puede indicar un problema del factory.");
        }
    }
    
    console.log("\n=== PRUEBA 2: ANÁLISIS DEL DEPLOYMENT ORIGINAL ===");
    
    // Analizar el deployment original más a fondo
    const originalToken = await ethers.getContractAt("Token", deployment.core.token);
    
    try {
        // Verificar la función addAgent directamente
        console.log("Intentando addAgent manual en el token original...");
        await originalToken.estimateGas.addAgent(deployer.address);
        console.log("✅ addAgent manual es posible (estimateGas exitoso)");
        
        // Ejecutar la transacción real
        const addAgentTx = await originalToken.addAgent(deployer.address);
        console.log(`Transacción addAgent enviada: ${addAgentTx.hash}`);
        await addAgentTx.wait();
        console.log("✅ addAgent manual EXITOSO!");
        
        // Verificar que se añadió
        const isAgentNow = await originalToken.isAgent(deployer.address);
        console.log(`Ahora deployer es agent: ${isAgentNow}`);
        
        if (isAgentNow) {
            console.log("\n🎯 PROBLEMA RESUELTO TEMPORALMENTE:");
            console.log("- El factory NO añadió el agent automáticamente");
            console.log("- Pero addAgent manual SÍ funciona");
            console.log("- Esto indica un problema en el factory deployment logic");
        }
        
    } catch (error) {
        console.log(`❌ addAgent manual falló: ${error.reason || error.message}`);
    }
    
    console.log("\n=== CONCLUSIONES FINALES ===");
    console.log("Basado en las pruebas realizadas:");
    console.log("1. Si el nuevo deployment funciona → Problema en deployment anterior");
    console.log("2. Si el nuevo deployment falla → Bug en factory contract");
    console.log("3. Si addAgent manual funciona → Factory no ejecutó esa lógica");
    console.log("\nEsto nos permitirá determinar exactamente dónde está el problema.");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
