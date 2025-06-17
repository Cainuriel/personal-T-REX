# 🚀 Guía de Despliegue ERC-3643 T-REX Suite

Esta guía te permitirá desplegar un ecosistema completo de tokens de seguridad ERC-3643.

> ⚠️ **ATENCIÓN:** No hay redes configuradas en el `hardhat.config.ts`. Disponga usted de su custom network antes de comenzar.

## 📋 Requisitos Previos

1. **Node.js** (v16 o superior)
2. **Hardhat**
3. **Red blockchain <YOUR_CUSTOM_NETWORK>** faltante en ```hardhat.config.ts```
4. **Variables de entorno** configuradas en `.env`

### Configuración de Variables de Entorno

Crear archivo `.env` en la raíz del proyecto basado en `.env.example`:
```bash
# Clave privada de la cuenta principal (Owner/Agent/Issuer)
ADMIN_WALLET_PRIV_KEY=tu_private_key_aqui

# Claves privadas de inversores (para transferencias reales)
INVESTOR1_PRIV_KEY=clave_inversor_1
INVESTOR2_PRIV_KEY=clave_inversor_2

# Tipo de deployment preferido
DEPLOYMENT_TYPE=factory  # o manual
```


## 🛠️ Instalación

```bash

npm install

# Compilar contratos
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

### Para usar Factory (RECOMENDADO):
```bash
npm run deploy:simple -- --network <YOUR_CUSTOM_NETWORK>
```

### Para despliegue manual:
```bash
npm run deploy:manual -- --network <YOUR_CUSTOM_NETWORK>
```

### Verificar después del despliegue:
```bash
npm run diagnosis:factory -- --network <YOUR_CUSTOM_NETWORK>
```

### Probar el sistema completo:
```bash
npm run example:factory -- --network <YOUR_CUSTOM_NETWORK>
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


## 🧪 Probar el Deployment con Example Usage

Después de desplegar los contratos, puedes probar que todo funciona correctamente usando el script `example-usage.js`. Este script realiza un flujo completo de configuración y uso del token, demostrando todas las capacidades de T-REX.

### 🎯 ¿Qué hace exactamente el script example-usage.js?

El script `example-usage.js` es el **script principal** que demuestra el flujo completo de un token de seguridad ERC-3643. Ejecuta un proceso end-to-end que incluye:

#### **PASO 1: 🏛️ Configuración de Trusted Issuers**
- Registra emisores autorizados para certificar identidades (KYC, AML, etc.)
- Verifica que los issuers pueden emitir claims válidos
- Configura los claim topics requeridos

#### **PASO 2: 🛡️ Configuración de Roles de Agent**
- Asigna permisos de Agent al deployer para poder registrar identidades
- Verifica que los roles están correctamente configurados
- Permite realizar operaciones administrativas

#### **PASO 3: 👥 Registro de Identidades de Inversores**
- **Crea contratos ONCHAINID reales** para cada inversor usando Identity Factory
- **Registra las identidades** en el Identity Registry (whitelist)
- **Asigna países** a cada identidad (España por defecto)
- **Verifica** que las identidades están correctamente registradas

#### **PASO 4: 📋 Emisión de Claims (Simulados)**
- Simula la emisión de claims KYC (Know Your Customer)
- Simula claims de acreditación de inversor
- En producción, estos claims serían emitidos por entidades certificadoras reales

#### **PASO 5: 🪙 Minting de Tokens**
- **Despausar el token** si está pausado
- **Emitir tokens iniciales** a los inversores verificados (1000 y 500 tokens)
- **Verificar balances** para confirmar que el minting fue exitoso

#### **PASO 6: 🔄 Pruebas de Transferencia Real**
- **Usa cuentas independientes** con private keys separadas
- **Transfiere 100 tokens** del Investor 1 al Investor 2
- **Verifica automáticamente** que el compliance se cumple
- **Confirma cambios de balance** antes y después de la transferencia

#### **PASO 7: 📊 Estado Final del Sistema**
- Muestra información completa del token configurado
- Lista todas las funcionalidades implementadas y probadas
- Confirma que el sistema está listo para producción

### 🚀 Ejecutar el Script de Ejemplo

#### Opción 1: Con Scripts NPM (RECOMENDADO)

```bash
# Para usar deployment de Factory:
npm run example:factory -- --network <YOUR_CUSTOM_NETWORK>

# Para usar deployment Manual:  
npm run example:manual -- --network <YOUR_CUSTOM_NETWORK>

# Para usar cualquier deployment disponible:
npm run example -- --network <YOUR_CUSTOM_NETWORK>
```

#### Opción 2: Con variables de entorno directamente

```bash
# Linux/macOS:
DEPLOYMENT_TYPE=factory npx hardhat run scripts/example-usage.js --network <YOUR_CUSTOM_NETWORK>
DEPLOYMENT_TYPE=manual npx hardhat run scripts/example-usage.js --network <YOUR_CUSTOM_NETWORK>

# Windows PowerShell:
$env:DEPLOYMENT_TYPE="factory"; npx hardhat run scripts/example-usage.js --network <YOUR_CUSTOM_NETWORK>
$env:DEPLOYMENT_TYPE="manual"; npx hardhat run scripts/example-usage.js --network <YOUR_CUSTOM_NETWORK>

# Windows CMD:
set DEPLOYMENT_TYPE=factory && npx hardhat run scripts/example-usage.js --network <YOUR_CUSTOM_NETWORK>
set DEPLOYMENT_TYPE=manual && npx hardhat run scripts/example-usage.js --network <YOUR_CUSTOM_NETWORK>
```

#### Opción 3: Con cross-env (multiplataforma)

```bash
# Funciona en Windows, Linux y macOS:
npx cross-env DEPLOYMENT_TYPE=factory hardhat run scripts/example-usage.js --network <YOUR_CUSTOM_NETWORK>
npx cross-env DEPLOYMENT_TYPE=manual hardhat run scripts/example-usage.js --network <YOUR_CUSTOM_NETWORK>
```

### 📋 Requisitos para example-usage.js

El script necesita **3 cuentas diferentes** configuradas en `.env`:

```bash
# Cuenta principal (Owner, Agent, Issuer)
ADMIN_WALLET_PRIV_KEY=tu_clave_principal

# Cuentas de inversores (para transferencias reales)
INVESTOR1_PRIV_KEY=clave_inversor_1
INVESTOR2_PRIV_KEY=clave_inversor_2

# Tipo de deployment
DEPLOYMENT_TYPE=factory
```

### ✅ Resultado Esperado

Si todo funciona correctamente, verás una salida similar a:

```
🚀 INICIANDO CONFIGURACIÓN Y USO DE T-REX SUITE
✅ Contratos cargados exitosamente
✅ Trusted issuers configurados
✅ Roles de Agent configurados
✅ Identidades registradas con contratos ONCHAINID
✅ Claims simulados emitidos
✅ Tokens emitidos (1000 y 500 tokens)
✅ Transferencia exitosa (100 tokens)
✅ Balances verificados correctamente
🎉 ¡CONFIGURACIÓN Y PRUEBAS COMPLETADAS EXITOSAMENTE!
```

## 🛠️ Scripts Adicionales Disponibles

Además del script principal, tienes acceso a varios scripts de utilidad:

### 🔍 Scripts de Diagnóstico

#### `diagnosis.js` - Diagnóstico Completo del Sistema
```bash
npm run diagnosis:factory -- --network <YOUR_CUSTOM_NETWORK>
npm run diagnosis:manual -- --network <YOUR_CUSTOM_NETWORK>
```
**Qué hace:**
- Verifica conectividad con la red
- Analiza el estado de todos los contratos desplegados
- Verifica permisos y roles (Owner, Agent)
- Detecta problemas de configuración comunes

#### `verify-deployment.js` - Verificación de Deployment
```bash
npm run verify -- --network <YOUR_CUSTOM_NETWORK>
```
**Qué hace:**
- Confirma que todos los contratos están correctamente desplegados
- Verifica la integridad de las conexiones entre contratos
- Valida la configuración inicial

#### `check-permissions.js` - Verificación Específica de Permisos
```bash
npm run check-permissions -- --network <YOUR_CUSTOM_NETWORK>
```
**Qué hace:**
- Verifica permisos específicos en cada contrato
- Identifica problemas de autorización
- Ayuda a diagnosticar errores de acceso

### 🛠️ Scripts de Mantenimiento

#### `cleanup-all-test-addresses.js` - Limpieza Masiva
```bash
npm run cleanup-all -- --network <YOUR_CUSTOM_NETWORK>
```
**Qué hace:**
- Limpia todas las direcciones de prueba que estén en estado inconsistente
- Útil para resetear el estado antes de nuevas pruebas
- Elimina identidades registradas incorrectamente

#### `clean-inconsistent-identity.js` - Limpieza Individual
```bash
TARGET_ADDRESS=0x... npm run cleanup-identity -- --network <YOUR_CUSTOM_NETWORK>
```
**Qué hace:**
- Limpia una dirección específica en estado inconsistente
- Permite reparar problemas puntuales sin afectar otras identidades
- Útil para debugging de direcciones específicas

### 🐛 Scripts de Debug

#### `debug-roles.js` - Debug de Roles y Permisos
```bash
npm run debug-roles -- --network <YOUR_CUSTOM_NETWORK>
```
**Qué hace:**
- Análisis detallado de roles en todos los contratos
- Identifica problemas específicos de permisos
- Muestra quién tiene qué roles

#### `debug-identity-status.js` - Estado de Identidades
```bash
npm run debug-identities -- --network <YOUR_CUSTOM_NETWORK>
```
**Qué hace:**
- Verifica el estado de identidades para todas las cuentas
- Muestra qué direcciones están registradas y verificadas
- Ayuda a identificar problemas de registro

### 📊 Tabla de Scripts Completa

| Script NPM | Archivo | Propósito | Cuándo Usar |
|------------|---------|-----------|-------------|
| `npm run deploy:simple` | `deploy-simple.js` | Despliegue con Factory | Primera vez, despliegue estándar |
| `npm run deploy:manual` | `deploy.js` | Despliegue manual | Configuración personalizada |
| `npm run example:factory` | `example-usage.js` | **SCRIPT PRINCIPAL** - Flujo completo T-REX | **Siempre después del deploy** |
| `npm run diagnosis:factory` | `diagnosis.js` | Diagnóstico completo | Verificar estado del sistema |
| `npm run verify` | `verify-deployment.js` | Verificación básica | Confirmar deployment |
| `npm run check-permissions` | `check-permissions.js` | Verificar permisos | Problemas de autorización |
| `npm run cleanup-all` | `cleanup-all-test-addresses.js` | Limpieza masiva | Resetear antes de nuevas pruebas |
| `npm run cleanup-identity` | `clean-inconsistent-identity.js` | Limpieza individual | Problemas específicos |
| `npm run debug-roles` | `debug-roles.js` | Debug de roles | Problemas de permisos |
| `npm run debug-identities` | `debug-identity-status.js` | Debug de identidades | Problemas de registro |

### 🎯 Flujo de Trabajo Recomendado

1. **Desplegar:** `npm run deploy:simple -- --network <YOUR_CUSTOM_NETWORK>`
2. **Verificar:** `npm run diagnosis:factory -- --network <YOUR_CUSTOM_NETWORK>`  
3. **Probar flujo completo:** `npm run example:factory -- --network <YOUR_CUSTOM_NETWORK>` ⭐
4. **Mantenimiento:** Scripts de limpieza según necesidad

---

El script `example-usage.js` es el más importante ya que demuestra que todo el sistema T-REX funciona correctamente end-to-end, incluyendo transferencias reales entre cuentas independientes.


### Variables de Entorno Requeridas

| Variable | Descripción | Ejemplo | Requerido |
|----------|-------------|---------|-----------|
| `ADMIN_WALLET_PRIV_KEY` | Clave privada de la cuenta principal | `0x123...` | ✅ |
| `INVESTOR1_PRIV_KEY` | Clave privada del inversor 1 | `0x456...` | ✅ |
| `INVESTOR2_PRIV_KEY` | Clave privada del inversor 2 | `0x789...` | ✅ |
| `DEPLOYMENT_TYPE` | Tipo de deployment | `factory` \| `manual` | ✅ |

### Métodos para Configurar Variables de Entorno

| Método | Plataforma | Ejemplo |
|--------|------------|---------|
| **Scripts NPM (RECOMENDADO)** | Todas (usa cross-env) | `npm run example:factory -- --network <YOUR_CUSTOM_NETWORK>` |
| cross-env directo | Todas | `npx cross-env DEPLOYMENT_TYPE=factory hardhat run scripts/example-usage.js --network <YOUR_CUSTOM_NETWORK>` |
| Variable nativa | Linux/macOS | `DEPLOYMENT_TYPE=factory npx hardhat run scripts/example-usage.js --network <YOUR_CUSTOM_NETWORK>` |
| PowerShell | Windows | `$env:DEPLOYMENT_TYPE="factory"; npx hardhat run scripts/example-usage.js --network <YOUR_CUSTOM_NETWORK>` |
| CMD | Windows | `set DEPLOYMENT_TYPE=factory && npx hardhat run scripts/example-usage.js --network <YOUR_CUSTOM_NETWORK>` |
| Archivo .env | Todas | `echo "DEPLOYMENT_TYPE=factory" > .env && npm run example -- --network <YOUR_CUSTOM_NETWORK>` |

### Archivos de Configuración y Deployment

| Archivo | Propósito |
|---------|-----------|
| `.env.example` | Plantilla de variables de entorno |
| `deployments/factory-deployment-latest.json` | Resultado de deployment usando factory |
| `deployments/manual-deployment-latest.json` | Resultado de deployment manual |
| `scripts/README.md` | Documentación detallada de cada script |

### Enlaces de Referencia

- [T-REX Documentation](https://docs.tokeny.com/)
- [ERC-3643 Standard](https://eips.ethereum.org/EIPS/eip-3643)
- [OnchainID](https://docs.onchainid.com/)
- [Hardhat Documentation](https://hardhat.org/docs)

### Comandos de Git y Husky

```bash
# Desactivar husky durante desarrollo
git config core.hooksPath /dev/null

# Reactivar husky
git config --unset core.hooksPath
```

### Solución de Problemas Comunes

#### 🔧 Error de Permisos
```bash
npm run check-permissions -- --network <YOUR_CUSTOM_NETWORK>
npm run debug-roles -- --network <YOUR_CUSTOM_NETWORK>
```

#### 🔧 Problemas de Identidades
```bash
npm run debug-identities -- --network <YOUR_CUSTOM_NETWORK>
npm run cleanup-all -- --network <YOUR_CUSTOM_NETWORK>
```

#### 🔧 Estado Inconsistente
```bash
npm run diagnosis:factory -- --network <YOUR_CUSTOM_NETWORK>
TARGET_ADDRESS=0x... npm run cleanup-identity -- --network <YOUR_CUSTOM_NETWORK>
```

#### 🔧 Verificación General
```bash
npm run verify -- --network <YOUR_CUSTOM_NETWORK>
npm run diagnosis:factory -- --network <YOUR_CUSTOM_NETWORK>
```

---

----
