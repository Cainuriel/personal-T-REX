/* eslint-disable */
const { ethers } = require("hardhat");
const fs = require('fs');

async function main() {
    console.log("=== ANÁLISIS DETALLADO DEL ERROR ===\n");
    
    const [deployer] = await ethers.getSigners();
    console.log(`Deployer: ${deployer.address}`);

    const deploymentFile = 'deployments/factory-deployment-latest.json';
    const deployment = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
    const token = await ethers.getContractAt("Token", deployment.core.token);
    
    console.log("=== INVESTIGACIÓN DEL FALLO DE addAgent ===");
    
    // Hash de la transacción que falló en la prueba anterior
    const failedTxHash = "0x7341203a639709ec8ceeb9aedd0bfc9398acee98a4ca8536b7fc22cff8188dbc";
    
    try {
        console.log(`Obteniendo receipt de transacción: ${failedTxHash}`);
        const receipt = await ethers.provider.getTransactionReceipt(failedTxHash);
        
        if (receipt) {
            console.log(`Status: ${receipt.status}`);
            console.log(`Gas usado: ${receipt.gasUsed.toString()}`);
            console.log(`Block number: ${receipt.blockNumber}`);
            
            if (receipt.status === 0) {
                console.log("❌ Transacción falló");
                
                // Intentar obtener el revert reason
                try {
                    const tx = await ethers.provider.getTransaction(failedTxHash);
                    console.log("Detalles de la transacción:");
                    console.log(`From: ${tx.from}`);
                    console.log(`To: ${tx.to}`);
                    console.log(`Value: ${tx.value.toString()}`);
                    console.log(`Gas limit: ${tx.gasLimit.toString()}`);
                    console.log(`Gas price: ${tx.gasPrice.toString()}`);
                    
                    // Intentar reproducir la transacción para obtener el error
                    console.log("\n=== REPRODUCIENDO TRANSACCIÓN PARA OBTENER ERROR ===");
                    try {
                        await ethers.provider.call({
                            to: tx.to,
                            from: tx.from,
                            data: tx.data,
                            gasLimit: tx.gasLimit,
                            gasPrice: tx.gasPrice,
                            value: tx.value
                        }, receipt.blockNumber);
                        
                    } catch (error) {
                        console.log(`Revert reason: ${error.reason || error.message}`);
                        if (error.data) {
                            console.log(`Error data: ${error.data}`);
                        }
                    }
                    
                } catch (error) {
                    console.log(`Error obteniendo detalles: ${error.message}`);
                }
            }
        } else {
            console.log("❌ No se pudo obtener el receipt");
        }
        
    } catch (error) {
        console.log(`Error analizando transacción: ${error.message}`);
    }
    
    console.log("\n=== NUEVA PRUEBA CON DEBUGGING ===");
    
    // Intentar una nueva transacción con debugging
    try {
        console.log("Intentando addAgent con callStatic para obtener mejor error...");
        await token.callStatic.addAgent(deployer.address);
        console.log("✅ callStatic exitoso - no debería haber error");
        
    } catch (error) {
        console.log(`❌ callStatic falló: ${error.reason || error.message}`);
        
        // Decodificar el error si es posible
        if (error.data) {
            console.log(`Error data: ${error.data}`);
            
            // Intentar decodificar el error
            try {
                const errorInterface = new ethers.utils.Interface([
                    "error Error(string)",
                    "error Panic(uint256)"
                ]);
                
                const decodedError = errorInterface.parseError(error.data);
                console.log(`Error decodificado: ${decodedError.name} - ${decodedError.args}`);
                
            } catch (decodeError) {
                console.log("No se pudo decodificar el error");
            }
        }
    }
    
    console.log("\n=== VERIFICACIÓN DE PREREQUISITES ===");
    
    // Verificar si hay algún prerequisito que no se esté cumpliendo
    try {
        const owner = await token.owner();
        const paused = await token.paused();
        const isAgent = await token.isAgent(deployer.address);
        
        console.log("Estado actual:");
        console.log(`- Owner: ${owner}`);
        console.log(`- Deployer es owner: ${owner.toLowerCase() === deployer.address.toLowerCase()}`);
        console.log(`- Token pausado: ${paused}`);
        console.log(`- Deployer es agent: ${isAgent}`);
        
        // Verificar si el address es válido
        console.log(`- Address a añadir: ${deployer.address}`);
        console.log(`- Es address zero: ${deployer.address === ethers.constants.AddressZero}`);
        
    } catch (error) {
        console.log(`Error verificando prerequisites: ${error.message}`);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
