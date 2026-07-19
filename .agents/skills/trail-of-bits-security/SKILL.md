---
name: trail-of-bits-security
description: Estándares rigurosos de Trail of Bits para criptografía, inmutabilidad, invariantes y seguridad a nivel de sistema. Activar para código crítico, encriptación o lógica core.
---

# Trail of Bits Security Standards

Sigue las directrices rigurosas inspiradas en Trail of Bits para garantizar resiliencia técnica extrema y evitar vulnerabilidades de bajo nivel o de lógica de negocio.

## 1. Criptografía Correcta
- NUNCA implementes tu propia criptografía (Don't roll your own crypto).
- Usa bibliotecas estándar y probadas por la comunidad (ej. \`crypto\`, \`bcrypt\`).
- Usa generadores de números aleatorios criptográficamente seguros (CSPRNG) para tokens, hashes y IDs sensibles.

## 2. Invariantes y Aserciones
- Define e impón los invariantes del sistema. Usa aserciones o validaciones estrictas al inicio de funciones críticas.
- Si el estado del programa llega a un punto lógicamente imposible, aborta inmediatamente (Fail fast).

## 3. Condiciones de Carrera (Race Conditions) y Concurrencia
- Cuidado con el Time-of-Check to Time-of-Use (TOCTOU). Si revisas un permiso y luego actúas, asegúrate de que el estado no pudo haber cambiado entre medio.
- Usa transacciones de base de datos con los niveles de aislamiento correctos cuando modifiques recursos concurrentes (ej. balances, inventario).

## 4. Auditoría y Trazabilidad
- Registra (log) todos los eventos sensibles de seguridad (login fallido, cambio de permisos, transacciones de alto valor).
- Asegúrate de no registrar PII (Información Personal Identificable) o secretos (tokens, contraseñas) en texto plano.

## 5. Complejidad Reducida
- La complejidad es el enemigo de la seguridad. Escribe código simple, lineal y fácil de auditar.
- Evita "magia" en el código (como mutaciones inesperadas de estado o herencia múltiple confusa) que oculte el flujo de ejecución real.
