---
name: vibesec
description: Threat modeling continuo y seguridad proactiva durante el desarrollo ("VibeSec"). Activar para auditorías de arquitectura, flujos lógicos complejos o decisiones de diseño.
---

# VibeSec (Security by Vibes & Proactive Threat Modeling)

VibeSec trata de integrar el sentido común de seguridad y el análisis de amenazas en cada decisión técnica, preguntándose constantemente: "¿Podría esto ser abusado?".

## Principios VibeSec
1. **Mentalidad de Atacante**: Por cada feature nuevo, asume la perspectiva del usuario malintencionado. ¿Cómo puedo saltarme esta validación? ¿Qué pasa si envío un array en lugar de un string?
2. **Defensa en Profundidad**: No dependas de una sola capa de seguridad. (Ej. Valida en el frontend para UX, pero valida SIEMPRE en el backend para seguridad).
3. **Falla Segura (Fail-Safe)**: Si ocurre un error, el sistema debe denegar el acceso por defecto. Nunca "falle abierto".
4. **Principio de Menor Privilegio**: Otorga solo los permisos estrictamente necesarios para que un módulo o usuario funcione.
5. **No Confíes en el Estado del Cliente**: Cualquier cosa que venga del navegador (cookies, localStorage, headers, IPs) puede ser falsificada.
6. **Manejo de Errores Silencioso**: No expongas stack traces ni detalles del sistema en respuestas de error al cliente. Usa mensajes genéricos como "Credenciales incorrectas" en lugar de "Usuario no encontrado".
