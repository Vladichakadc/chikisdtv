---
name: security-guidance
description: Directrices generales de seguridad para la escritura de código, prevención de inyecciones, validación de datos y manejo de secretos. Activar al tocar backend, bases de datos o autenticación.
---

# Security Guidance

Usa esta skill para garantizar que todo el código generado cumpla con los estándares de seguridad de la industria (OWASP Top 10).

## 1. Validación de Entrada (Input Validation)
- NUNCA confíes en los datos del cliente.
- Valida tipos, longitudes y formatos antes de procesar cualquier dato.
- Sanitiza las entradas antes de renderizarlas para prevenir XSS.

## 2. Inyección y Bases de Datos
- Usa SIEMPRE sentencias preparadas (Prepared Statements) o un ORM seguro (como Sequelize/Prisma).
- NUNCA concatenes strings para formar consultas SQL.

## 3. Autenticación y Sesiones
- Las contraseñas deben ser hasheadas usando algoritmos fuertes (bcrypt, Argon2) con un factor de trabajo adecuado (ej. salt rounds >= 10).
- Usa JWT de forma segura: tiempos de expiración cortos, firmas fuertes, y nunca almacenes datos sensibles en el payload.

## 4. Manejo de Secretos
- Nunca hardcodees tokens, claves API, contraseñas o URLs de bases de datos en el código fuente.
- Usa variables de entorno (ej. \`process.env.SECRET_KEY\`).

## 5. Prevención de CSRF y CORS
- Configura políticas CORS estrictas; no uses \`*\` en producción si requiere credenciales.
- Implementa tokens CSRF para mutaciones de estado si usas cookies de sesión.
