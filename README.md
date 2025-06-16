# 🚀 Guía de Despliegue ERC-3643 T-REX Suite

Esta guía te permitirá desplegar un ecosistema completo de tokens de seguridad ERC-3643 usando el framework T-REX.

## 📋 Requisitos Previos

1. **Node.js** (v16 o superior)
2. **Hardhat** configurado
3. **Wallet** con ETH para gas fees
4. **Red blockchain Taycan** configurada (http://5.250.188.118:8545)
5. **Variable de entorno** `ADMIN_WALLET_PRIV_KEY` configurada

### Configuración de Variables de Entorno

Crear archivo `.env` en la raíz del proyecto:
```bash
ADMIN_WALLET_PRIV_KEY=tu_private_key_aqui
DEPLOYMENT_TYPE=factory  # o manual
```

**⚠️ IMPORTANTE**: Nunca subas el archivo `.env` al repositorio. Ya está incluido en `.gitignore`.

## 🛠️ Instalación

```bash
# Instalar todas las dependencias (incluyendo cross-env)
npm install

# Compilar contratos
npx hardhat compile
```

### Dependencias Importantes

- **cross-env**: Permite usar variables de entorno de forma multiplataforma
- **hardhat**: Framework de desarrollo de Ethereum
- **@openzeppelin/contracts**: Librería de contratos seguros
- **@onchain-id/solidity**: Contratos para gestión de identidades

### Red Taycan

El proyecto está configurado para usar la red **Taycan** por defecto:
- **URL**: http://5.250.188.118:8545
- **Chain ID**: Se detecta automáticamente
- **Timeout**: 300000ms (5 minutos)

Para usar esta red, asegúrate de tener configurada la variable `ADMIN_WALLET_PRIV_KEY` en tu archivo `.env`.

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

npx hardhat run scripts/deploy-simple.js --network taycan
```

### Para despliegue manual:
```bash
# Editar scripts/deploy-simple.js  
# Comentar línea: await deployWithFactory(deployer, tokenOwner, agent);
# Descomentar línea: await deployManualStepByStep(deployer, tokenOwner, agent);

npx hardhat run scripts/deploy-simple.js --network taycan
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

## 🧪 Probar el Deployment con Example Usage

Después de desplegar los contratos, puedes probar que todo funciona correctamente usando el script `example-usage.js`. Este script realiza un flujo completo de configuración y uso del token.

### Ejecutar el Script de Ejemplo

#### Opción 1: Con Scripts NPM (RECOMENDADO)

```bash
# Primero instalar cross-env si no está instalado:
npm install

# Para usar deployment de Factory:
npm run example:factory -- --network taycan

# Para usar deployment Manual:  
npm run example:manual -- --network taycan

# Para usar cualquier deployment disponible:
npm run example -- --network taycan
```

#### Opción 2: Con variables de entorno directamente

```bash
# Linux/macOS:
DEPLOYMENT_TYPE=factory npx hardhat run scripts/example-usage.js --network taycan
DEPLOYMENT_TYPE=manual npx hardhat run scripts/example-usage.js --network taycan

# Windows PowerShell:
$env:DEPLOYMENT_TYPE="factory"; npx hardhat run scripts/example-usage.js --network taycan
$env:DEPLOYMENT_TYPE="manual"; npx hardhat run scripts/example-usage.js --network taycan

# Windows CMD:
set DEPLOYMENT_TYPE=factory && npx hardhat run scripts/example-usage.js --network taycan
set DEPLOYMENT_TYPE=manual && npx hardhat run scripts/example-usage.js --network taycan
```

#### Opción 3: Con cross-env (multiplataforma)

```bash
# Funciona en Windows, Linux y macOS:
npx cross-env DEPLOYMENT_TYPE=factory hardhat run scripts/example-usage.js --network taycan
npx cross-env DEPLOYMENT_TYPE=manual hardhat run scripts/example-usage.js --network taycan
```

#### Opción 4: Con archivo .env

Crear un archivo `.env` basado en `.env.example`:
```bash
cp .env.example .env
# Editar .env y configurar DEPLOYMENT_TYPE=factory o DEPLOYMENT_TYPE=manual
npm run example -- --network taycan
```

### ¿Qué hace el script example-usage.js?

El script ejecuta un flujo completo de configuración y prueba:

1. **🏛️ Configuración de Trusted Issuers**: Registra emisores autorizados para claims
2. **🛡️ Configuración de Roles de Agent**: Asigna permisos necesarios
3. **👥 Registro de Identidades**: Registra inversores en el whitelist
4. **📋 Emisión de Claims**: Simula la emisión de claims KYC y acreditación
5. **🪙 Minting de Tokens**: Despausar token y emite tokens a inversores verificados
6. **🔄 Pruebas de Transferencia**: Realiza transferencias entre inversores
7. **📊 Estado Final**: Muestra resumen del sistema configurado

### Variables de Entorno Disponibles

| Variable | Valores | Descripción |
|----------|---------|-------------|
| `DEPLOYMENT_TYPE` | `factory` \| `manual` | Especifica qué deployment usar |

### Troubleshooting del Example Usage

#### Error: "No se encontraron despliegues del tipo especificado"
```bash
# Verifica que el deployment existe:
ls deployments/

# Debe existir uno de estos archivos:
# - factory-deployment-latest.json
# - manual-deployment-latest.json
```

#### Error: "Chain ID no coincide"
```bash
# Verifica que estás en la red correcta:
npx hardhat node  # Para red local
# o usa la red donde desplegaste los contratos
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

### Referencia Rápida de Scripts NPM

| Script | Descripción | Ejemplo |
|--------|-------------|---------|
| `npm install` | Instala dependencias (incluyendo cross-env) | `npm install` |
| `npm run deploy:simple` | Despliega usando Factory | `npm run deploy:simple -- --network taycan` |
| `npm run deploy:manual` | Despliega paso a paso | `npm run deploy:manual -- --network taycan` |
| `npm run example` | Prueba con cualquier deployment | `npm run example -- --network taycan` |
| `npm run example:factory` | Prueba específicamente factory (usa cross-env) | `npm run example:factory -- --network taycan` |
| `npm run example:manual` | Prueba específicamente manual (usa cross-env) | `npm run example:manual -- --network taycan` |
| `npm run verify` | Verifica deployment | `npm run verify -- --network taycan` |

### Métodos para Variables de Entorno

| Método | Plataforma | Ejemplo |
|--------|------------|---------|
| Scripts NPM | Todas (usa cross-env) | `npm run example:factory -- --network taycan` |
| cross-env directo | Todas | `npx cross-env DEPLOYMENT_TYPE=factory hardhat run scripts/example-usage.js --network taycan` |
| Variable nativa | Linux/macOS | `DEPLOYMENT_TYPE=factory npx hardhat run scripts/example-usage.js --network taycan` |
| PowerShell | Windows | `$env:DEPLOYMENT_TYPE="factory"; npx hardhat run scripts/example-usage.js --network taycan` |
| CMD | Windows | `set DEPLOYMENT_TYPE=factory && npx hardhat run scripts/example-usage.js --network taycan` |
| Archivo .env | Todas | `echo "DEPLOYMENT_TYPE=factory" > .env && npm run example -- --network taycan` |

### Variables de Entorno

| Variable | Valores | Descripción | Archivo |
|----------|---------|-------------|---------|
| `DEPLOYMENT_TYPE` | `factory` \| `manual` | Tipo de deployment para example-usage.js | `.env` |

### Archivos de Configuración

| Archivo | Propósito |
|---------|-----------|
| `.env.example` | Plantilla de variables de entorno |
| `.env` | Variables de entorno personalizadas (crear desde .env.example) |
| `deployments/factory-deployment-latest.json` | Resultado de deployment factory |
| `deployments/manual-deployment-latest.json` | Resultado de deployment manual |

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


deactive husky
``` git config core.hooksPath /dev/null ```
active
``` git config --unset core.hooksPath ```
----
