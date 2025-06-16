# 📁 Scripts de T-REX Suite

Esta carpeta contiene los scripts esenciales para trabajar con T-REX Suite en la red Alastria.

## 🚀 Scripts Principales

### **`example-usage.js`** - 🎯 SCRIPT PRINCIPAL
**Uso:** `DEPLOYMENT_TYPE=factory npx hardhat run scripts/example-usage.js --network alastria`

Demuestra el flujo completo de T-REX después del despliegue:
- ✅ Configuración de trusted issuers
- ✅ Registro de identidades de inversores (ONCHAINID)
- ✅ Emisión de claims (simulados)
- ✅ Minting de tokens
- ✅ Transferencias entre inversores con compliance automático

**Características:**
- Usa cuentas independientes desde private keys
- Manejo robusto de errores y diagnósticos
- Verificación completa de permisos y roles

---

## 🏗️ Scripts de Despliegue

### **`deploy-simple.js`** - Despliegue usando Factory
**Uso:** `npx hardhat run scripts/deploy-simple.js --network alastria`

Despliegue rápido usando TREXFactory en una sola transacción.

### **`deploy.js`** - Despliegue Manual
**Uso:** `npx hardhat run scripts/deploy.js --network alastria`

Despliegue paso a paso más robusto cuando el factory no funciona.

---

## 🔍 Scripts de Diagnóstico

### **`diagnosis.js`** - Diagnóstico General
**Uso:** `DEPLOYMENT_TYPE=factory npx hardhat run scripts/diagnosis.js --network alastria`

Verifica el estado completo de los contratos desplegados:
- Estado de contratos y permisos
- Verificación de roles (Owner, Agent)
- Diagnóstico de problemas comunes

### **`verify-deployment.js`** - Verificación de Deployment
**Uso:** `npx hardhat run scripts/verify-deployment.js --network alastria`

Verifica que un deployment esté correctamente configurado.

### **`check-permissions.js`** - Verificación de Permisos
**Uso:** `npx hardhat run scripts/check-permissions.js --network alastria`

Verifica permisos específicos en contratos T-REX.

---

## 🛠️ Scripts de Mantenimiento

### **`clean-inconsistent-identity.js`** - Limpieza de Identidad Individual
**Uso:** `TARGET_ADDRESS=0x... npx hardhat run scripts/clean-inconsistent-identity.js --network alastria`

Limpia identidades en estado inconsistente (registradas en storage pero no verificadas).

### **`cleanup-all-test-addresses.js`** - Limpieza Masiva
**Uso:** `npx hardhat run scripts/cleanup-all-test-addresses.js --network alastria`

Limpia todas las direcciones de prueba que estén en estado inconsistente.

---

## 🐛 Scripts de Debug

### **`debug-roles.js`** - Debug de Roles
**Uso:** `npx hardhat run scripts/debug-roles.js --network alastria`

Debug específico de roles y permisos en contratos.

### **`debug-identity-status.js`** - Debug de Identidades
**Uso:** `npx hardhat run scripts/debug-identity-status.js --network alastria`

Verifica el estado de identidades para todas las cuentas disponibles.

---

## 📋 Variables de Entorno

Configura en `.env`:
```bash
# Cuentas
ADMIN_WALLET_PRIV_KEY=...
INVESTOR1_PRIV_KEY=...
INVESTOR2_PRIV_KEY=...

# Tipo de deployment (factory/manual)
DEPLOYMENT_TYPE=factory
```

## 🌐 Redes Soportadas

- **alastria** - Red principal de Alastria
- **taycan** - Red de pruebas Taycan

## 📁 Archivos de Deployment

Los scripts generan/leen archivos JSON en `deployments/`:
- `factory-deployment-latest.json` - Deployment usando factory
- `manual-deployment-latest.json` - Deployment manual

---

## 🎯 Flujo Recomendado

1. **Desplegar:** `deploy-simple.js` o `deploy.js`
2. **Verificar:** `diagnosis.js`
3. **Usar:** `example-usage.js`
4. **Mantener:** Scripts de limpieza según necesidad

---

*Actualizado: Junio 2025 - Todos los scripts funcionan en red Alastria*
