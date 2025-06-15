# 📋 Guía de Despliegue ERC-3643 T-REX Suite

## 🚀 Scripts Disponibles

### 1. `deploy-simple.js` - Despliegue con Factory (Rápido) 
**🏭 Método recomendado para desarrollo y testing**

```bash
npx hardhat run scripts/deploy-simple.js --network taycan
```

**Características:**
- ✅ Una sola transacción para desplegar toda la suite
- ✅ Más rápido y económico en gas
- ✅ Ideal para desarrollo y testing
- ⚠️ Requiere que el TREXFactory funcione correctamente
- 📁 Genera: `deployments/factory-deployment-latest.json`

### 2. `deploy.js` - Despliegue Paso a Paso (Robusto)
**🔧 Método para producción con máximo control**

```bash 
npx hardhat run scripts/deploy.js --network taycan
```

**Características:**
- ✅ Control total sobre cada paso del despliegue
- ✅ Más robusto ante fallos
- ✅ Ideal para producción
- ⚠️ Más transacciones y mayor costo de gas
- 📁 Genera: `deployments/manual-deployment-latest.json`

## 📁 Salidas del Despliegue

Ambos scripts generan archivos JSON con todas las direcciones:

```
deployments/
├── factory-deployment-latest.json     # Último despliegue con factory
├── manual-deployment-latest.json      # Último despliegue manual
├── factory-deployment-[timestamp].json # Historial de despliegues
└── manual-deployment-[timestamp].json  # Historial de despliegues
```

### Estructura del JSON:

```json
{
  "network": {
    "name": "unknown",
    "chainId": 2023
  },
  "deploymentMethod": "factory", // o "manual"
  "timestamp": "2025-06-15T...",
  "deployer": "0x542dD28258357Cc0a4d3EdC4F6eDA03d93106744",
  "tokenOwner": "0x542dD28258357Cc0a4d3EdC4F6eDA03d93106744",
  "agent": "0x542dD28258357Cc0a4d3EdC4F6eDA03d93106744",
  "core": {
    "token": "0x...",
    "identityRegistry": "0x...",
    "compliance": "0x...",
    "identityRegistryStorage": "0x...",
    "claimTopicsRegistry": "0x...",
    "trustedIssuersRegistry": "0x..."
  },
  "infrastructure": {
    "trexFactory": "0x...",           // Solo en factory
    "trexImplementationAuthority": "0x...",
    "identityFactory": "0x..."
  },
  "implementations": {              // Solo en factory
    "tokenImplementation": "0x...",
    "claimTopicsRegistryImplementation": "0x...",
    // ...
  }
}
```

## 🔧 Configuración Requerida

### Variables de Entorno (`.env`)
```bash
# Clave privada de la cuenta (sin 0x al inicio)
ADMIN_WALLET_PRIV_KEY=tu_clave_privada_sin_0x

# URLs de RPC para las redes
TAYCAN_URL=https://rpc.taycan.alastria.io
# Agregar más redes según necesidad
```

### Red en `hardhat.config.ts`
```javascript
networks: {
  taycan: {
    url: process.env.TAYCAN_URL,
    accounts: process.env.ADMIN_WALLET_PRIV_KEY ? [`0x${process.env.ADMIN_WALLET_PRIV_KEY}`] : [],
  }
}
```

## 📋 Verificación del Despliegue

```bash
npx hardhat run scripts/verify-deployment.js --network taycan
```

## 🎯 Próximos Pasos Post-Despliegue

1. **Configurar Trusted Issuers** - Agregar emisores de claims autorizados
2. **Registrar Identidades** - Registrar identidades de inversores  
3. **Configurar Compliance** - Agregar módulos de compliance necesarios
4. **Mintear Tokens** - Emitir tokens iniciales

## 📖 Documentación Adicional

- [ERC-3643 Standard](https://eips.ethereum.org/EIPS/eip-3643)
- [T-REX Documentation](https://docs.tokeny.com/)
- [Hardhat Documentation](https://hardhat.org/docs)

---

### ⚡ Comandos Rápidos

```bash
# Despliegue rápido con factory
npm run deploy:simple

# Despliegue robusto paso a paso  
npm run deploy:manual

# Verificar despliegue
npm run verify
```
