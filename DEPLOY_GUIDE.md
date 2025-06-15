# 🚀 Guía de Despliegue ERC-3643 T-REX Suite

Esta guía te permitirá desplegar un ecosistema completo de tokens de seguridad ERC-3643 usando el framework T-REX.

## 📋 Requisitos Previos

1. **Node.js** (v16 o superior)
2. **Hardhat** configurado
3. **Wallet** con ETH para gas fees
4. **Red blockchain** (mainnet, testnet, o local)

## 🛠️ Instalación

```bash
npm install
npx hardhat compile
```

## 🎯 Opciones de Despliegue

### Opción 1: Despliegue con Factory (RECOMENDADO) 🏭

**Ventajas:**
- ✅ Más simple y rápido
- ✅ Menos propenso a errores
- ✅ Manejo automático de proxies
- ✅ Configuración optimizada

**Usar cuando:**
- Quieres un despliegue estándar
- No necesitas customización avanzada
- Es tu primera vez desplegando T-REX

### Opción 2: Despliegue Manual Paso a Paso 🔧

**Ventajas:**
- ✅ Control total sobre cada paso
- ✅ Customización completa
- ✅ Comprensión profunda del proceso
- ✅ Debugging granular

**Usar cuando:**
- Necesitas configuraciones específicas
- Quieres entender cada componente
- Tienes requisitos customizados

## 🚀 Ejecutar Despliegue

### Para usar Factory:
```bash
# Editar scripts/deploy-simple.js
# Descomentar línea: await deployWithFactory(deployer, tokenOwner, agent);
# Comentar línea: await deployManualStepByStep(deployer, tokenOwner, agent);

npx hardhat run scripts/deploy-simple.js --network <tu-red>
```

### Para despliegue manual:
```bash
# Editar scripts/deploy-simple.js  
# Comentar línea: await deployWithFactory(deployer, tokenOwner, agent);
# Descomentar línea: await deployManualStepByStep(deployer, tokenOwner, agent);

npx hardhat run scripts/deploy-simple.js --network <tu-red>
```

## 📊 Arquitectura de Contratos

```
ERC-3643 T-REX Suite
├── 📋 ClaimTopicsRegistry      # Tópicos de claims requeridos
├── 🏛️ TrustedIssuersRegistry   # Emisores confiables de claims  
├── 💾 IdentityRegistryStorage  # Almacenamiento de identidades
├── 🆔 IdentityRegistry         # Lógica de whitelist de inversores
├── ⚖️ ModularCompliance        # Reglas de cumplimiento
└── 🪙 Token                    # Token de seguridad ERC-3643
```

## 🔄 Flujo de Despliegue Manual (Paso a Paso)

### PASO 1: Claim Topics Registry 📋
```solidity
// Despliega registro de tópicos de claims
ClaimTopicsRegistry ctr = new ClaimTopicsRegistry();
```
**Propósito:** Define qué tipos de claims son requeridos (ej: KYC=1, Acreditado=2)

### PASO 2: Trusted Issuers Registry 🏛️
```solidity  
// Despliega registro de emisores confiables
TrustedIssuersRegistry tir = new TrustedIssuersRegistry();
```
**Propósito:** Lista de entidades autorizadas a emitir claims válidos

### PASO 3: Identity Registry Storage 💾
```solidity
// Despliega almacenamiento de identidades
IdentityRegistryStorage irs = new IdentityRegistryStorage();
```
**Propósito:** Almacena datos de whitelist de inversores verificados

### PASO 4: Identity Registry 🆔
```solidity
// Despliega registro de identidades
IdentityRegistry ir = new IdentityRegistry();
ir.init(tir.address, ctr.address, irs.address);
```
**Propósito:** Lógica para verificar identidades contra claims requeridos

### PASO 5: Enlazar Registry con Storage 🔗
```solidity
// Enlaza registry con su storage
irs.bindIdentityRegistry(ir.address);
```
**Propósito:** Autoriza al registry a escribir en el storage

### PASO 6: Modular Compliance ⚖️
```solidity
// Despliega contrato de cumplimiento
ModularCompliance mc = new ModularCompliance();
mc.init();
```
**Propósito:** Implementa reglas regulatorias (límites, restricciones)

### PASO 7: Security Token 🪙
```solidity
// Despliega token de seguridad
Token token = new Token();
token.init(ir.address, mc.address, "ISBE Token", "AST", 18, onchainID);
```
**Propósito:** Token ERC-3643 que respeta whitelist y compliance

### PASO 8: Enlazar Compliance con Token 🔗
```solidity
// Enlaza compliance con token
mc.bindToken(token.address);
```
**Propósito:** Autoriza al token a consultar reglas de compliance

### PASO 9: Asignar Roles y Permisos 👥
```solidity
// Transferir ownership y asignar agentes
token.transferOwnership(tokenOwner);
token.addAgent(agent);
ir.transferOwnership(tokenOwner);  
ir.addAgent(agent);
```
**Propósito:** Configura permisos operacionales

### PASO 10: Configurar Claim Topics 📋
```solidity
// Añadir tópicos de claims requeridos
ctr.addClaimTopic(1); // KYC
ctr.addClaimTopic(2); // Acreditado
```
**Propósito:** Define claims obligatorios para inversores

## 📝 Configuración Post-Despliegue

Después del despliegue, ejecuta el script de configuración:

```bash
# 1. Actualizar direcciones en scripts/example-usage.js
# 2. Ejecutar configuración
npx hardhat run scripts/example-usage.js --network <tu-red>
```

Este script:
1. ✅ Configura trusted issuers
2. ✅ Registra identidades de ejemplo
3. ✅ Emite tokens iniciales
4. ✅ Prueba transferencias

## ⚠️ Diferencias con el Repositorio

### ✅ Ventajas del T-REX Factory:
- **Factory Pattern:** T-REX usa TREXFactory que simplifica enormemente el despliegue
- **Proxy Pattern:** Soporte nativo para upgrades via proxies
- **Implementation Authority:** Sistema centralizado de versiones
- **Identity Factory:** Integración con OnchainID automática

### 🔄 Adaptaciones Realizadas:
- **Dos opciones:** Factory (simple) + Manual (control total)
- **Modular Compliance:** Usa sistema modular vs compliance básico
- **OnchainID Integration:** Manejo automático de identidades digitales
- **Proxy Deployments:** Soporte para upgrades en producción

## 🎯 Casos de Uso

### Para ISBE:
```javascript
const tokenDetails = {
  name: "ISBE Security Token",
  symbol: "AST", 
  decimals: 18,
  // ... configuración específica
};
```

### Para Testing:
```javascript
const tokenDetails = {
  name: "Test Security Token",
  symbol: "TST",
  decimals: 18,
  // ... configuración de prueba
};
```

## 🔧 Troubleshooting

### Error: "token already deployed"
```bash
# Cambia el salt en deploy-simple.js
const salt = "NUEVO_SALT_UNICO";
```

### Error: "claim pattern not valid"
```bash
# Verifica que issuers.length == issuerClaims.length
const claimDetails = {
  issuers: [issuer1.address],
  issuerClaims: [[1, 2]] // Array de arrays
};
```

### Error: "insufficient gas"
```bash
# Aumenta gas limit en hardhat.config.ts
gas: 8000000
```

## 📚 Recursos Adicionales

- [T-REX Documentation](https://docs.tokeny.com/)
- [ERC-3643 Standard](https://eips.ethereum.org/EIPS/eip-3643)
- [OnchainID](https://docs.onchainid.com/)
- [Hardhat Documentation](https://hardhat.org/docs)

## 🤝 Soporte

Para soporte técnico:
1. Revisar logs de despliegue
2. Verificar configuración de red
3. Comprobar balances de gas
4. Consultar documentación T-REX

---

¡Listo para lanzar tu token de seguridad ERC-3643! 🚀
