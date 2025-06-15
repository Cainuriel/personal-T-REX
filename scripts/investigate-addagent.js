/* eslint-disable */
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("🔎 INVESTIGACIÓN ESPECÍFICA: addAgent en Token Contract");
    console.log("=".repeat(60));

    const network = await ethers.provider.getNetwork();
    const [deployer] = await ethers.getSigners();
    
    // Load factory deployment
    const deploymentsDir = path.join(__dirname, "..", "deployments");
    const factoryPath = path.join(deploymentsDir, "factory-deployment-latest.json");
    const factoryData = JSON.parse(fs.readFileSync(factoryPath, "utf8"));
    
    const token = await ethers.getContractAt("Token", factoryData.core.token);
    
    console.log(`🪙 Token Address: ${token.address}`);
    console.log(`👤 Deployer: ${deployer.address}`);
    
    try {
        // Check current state
        const owner = await token.owner();
        const paused = await token.paused();
        console.log(`\n📊 Estado actual:`);
        console.log(`   Owner: ${owner}`);
        console.log(`   Pausado: ${paused}`);
        console.log(`   Owner == Deployer: ${owner.toLowerCase() === deployer.address.toLowerCase()}`);
        
        // Try to call addAgent and capture the exact error
        console.log(`\n🧪 Intentando addAgent(${deployer.address})...`);
        
        try {
            // First try to estimate gas
            const gasEstimate = await token.addAgent.estimateGas(deployer.address);
            console.log(`   Gas estimado: ${gasEstimate.toString()}`);
            
            // If gas estimation succeeds, try the actual call
            console.log(`   Ejecutando transacción...`);
            const tx = await token.addAgent(deployer.address);
            console.log(`   ✅ Transacción enviada: ${tx.hash}`);
            
            const receipt = await tx.wait();
            console.log(`   ✅ Transacción confirmada. Status: ${receipt.status}`);
            
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
            
            // Get more detailed error info
            if (error.reason) {
                console.log(`   Razón: ${error.reason}`);
            }
            
            if (error.code) {
                console.log(`   Código: ${error.code}`);
            }
            
            // Check if it's related to paused state
            if (paused) {
                console.log(`   🔍 HALLAZGO CLAVE: El token está PAUSADO`);
                console.log(`   💡 Los tokens pausados no permiten ciertas operaciones`);
                
                // Check if there's an unpause function
                try {
                    console.log(`   🔧 Intentando despausar el token...`);
                    const unpauseTx = await token.unpause();
                    console.log(`   Transacción unpause enviada: ${unpauseTx.hash}`);
                    
                    const unpauseReceipt = await unpauseTx.wait();
                    console.log(`   ✅ Token despausado. Status: ${unpauseReceipt.status}`);
                    
                    // Now try addAgent again
                    console.log(`   🔄 Reintentando addAgent después de despausar...`);
                    const addAgentTx = await token.addAgent(deployer.address);
                    console.log(`   Transacción addAgent enviada: ${addAgentTx.hash}`);
                    
                    const addAgentReceipt = await addAgentTx.wait();
                    console.log(`   ✅ addAgent exitoso después de despausar! Status: ${addAgentReceipt.status}`);
                    
                } catch (unpauseError) {
                    console.log(`   ❌ Error al despausar: ${unpauseError.message}`);
                    if (unpauseError.reason) {
                        console.log(`   Razón del error: ${unpauseError.reason}`);
                    }
                }
            }
        }
        
    } catch (error) {
        console.error(`❌ Error general: ${error.message}`);
    }
    
    // Final state check
    try {
        const finalPaused = await token.paused();
        const finalIsAgent = await token.isAgent(deployer.address);
        console.log(`\n📊 Estado final:`);
        console.log(`   Token pausado: ${finalPaused}`);
        console.log(`   Deployer es Agent: ${finalIsAgent}`);
    } catch (error) {
        console.log(`Error verificando estado final: ${error.message}`);
    }
}

main()
    .then(() => {
        console.log("\n✅ Investigación específica completada");
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Error:", error);
        process.exit(1);
    });
