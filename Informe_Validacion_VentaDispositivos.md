# Informe de Validación e Integridad — Tabla "Venta de Dispositivos"

**Fecha:** 2026-06-09
**Módulo:** Admin → Venta de Dispositivos (`/admin/ventas-dispositivos`)
**Objetivo del usuario:** Que sea una **tabla independiente** para registrar la venta de un equipo físico, **asociada a un cliente** y a un **nickname** que tiene una **pantalla** del Planificador (ej. `M001-1`, `M000-3`).

---

## 1. Modelo de datos confirmado

| Entidad | Tabla | Llave | Rol |
|---------|-------|-------|-----|
| Cuenta padre | `cuentas_padre` | `cuentaId` (`M001`) | Cuenta IPTV con N pantallas |
| **Pantalla** | `planificador` | `idPantalla` (**`M001-1`**) | Pantalla = `cuentaId` + `-` + nº. Tiene `customerId`, `nickname`, `nombre` |
| Cliente | `tabla_clientes` / `clients` | `customerId` | Cliente final |
| **Venta de equipo** | `ventas_equipos` | `idVM` (`VF191`) | Venta del equipo físico |

**Cadena de asociación deseada:**
`ventas_equipos.idVM` → `customerId` (cliente) → `nickname` → `planificador.idPantalla` (`M001-1`) → `cuentaId` (`M001`)

El modelo `VentaEquipo` **ya tiene los campos** necesarios para esa cadena: `customerId`, `nickname`, `idPantalla`, `cuentaId`. La estructura de columnas es adecuada; el problema es de **alimentación de datos, vínculos e integridad**, no de campos faltantes.

---

## 2. Análisis de integridad (datos reales)

Cruces ejecutados sobre la base actual:

| Vínculo | Resultado | Veredicto |
|---------|-----------|-----------|
| `ventas_equipos` (registros en BD) | **0** | La tabla está vacía; la importación nunca se completó bien |
| Excel fuente `1-orders_table_Ventas_Firetv2024.xlsx` | **191 ventas** | Hay datos por cargar |
| `customerId` de ventas → `tabla_clientes` | **114 / 115 coinciden (99%)** | ✅ **Llave fiable** para asociar al cliente |
| `nickname` de ventas → `planificador` | **32 / 185 coinciden (17%)** | ⚠️ **Llave débil** (texto libre, históricos dados de baja) |
| `idPantalla` (`M001-1`) en el Excel de ventas | **No existe** | ❌ El Excel no trae la pantalla; sí trae `Serial` físico |

**Conclusiones de integridad:**

1. El **cliente** es un vínculo sólido vía `customerId` (99% de cobertura).
2. El **nickname** NO sirve como llave dura: es texto libre, con variaciones (`"Martha Cely 1 "` con espacios, sufijos) y solo el 17% de las ventas históricas tiene un nickname que siga vivo en el Planificador (el resto fueron bajas o renombres). Debe usarse como dato informativo, no como FK.
3. La **pantalla `M001-1`** debe asignarse **seleccionándola del Planificador** dentro del formulario (no viene en el Excel), idealmente filtrando las pantallas del `customerId` elegido.

---

## 3. Defectos que impiden ver / integrar los datos

### 3.1 (Bloqueante) Importador con mapeo de columnas incorrecto
[server/routes/admin/ventasEquipos.js:70-95](server/routes/admin/ventasEquipos.js#L70-L95) asume la estructura de **24 columnas de ventas de licencia**, pero el Excel real tiene **13 columnas en otro orden**. Resultado: Fecha, Precio, Estado y MAC quedan vacíos o mal mapeados.

**Estructura real del Excel** (hoja "Venta Fire TV", 191 filas):

| Índice | Encabezado real | Campo destino correcto |
|:------:|-----------------|------------------------|
| 0 | `Id_vnta` | `idVM` |
| 1 | `Customer_id` | `customerId` |
| 2 | `Accion` ("Venta") | `tipoPago` |
| 3 | `SKU` | `sku` |
| 4 | `TIPO DE FIRE` | `tipoFire` |
| 5 | `Nickname` | `nickname` |
| 6 | `Fecha` (serial) | `fecha` |
| 7 | `Año` | `anio` |
| 8 | `Mes` | `mes` |
| 9 | `Precio Venta Firetv` | `precioVenta` |
| 10 | `Item_Quantity` | `itemQuantity` |
| 11 | `Costo` | `costo` *(campo nuevo)* |
| 12 | `Serial` | `idPantalla` o `serial` *(serial físico)* |

> Nota: el Excel **no** trae `apellido`, `estado`, `medioPago` ni la pantalla `M001-1`. La pantalla se asocia después por nickname/cliente.

### 3.2 (Bloqueante) CRUD escribe en la tabla equivocada
En [VentaDispositivosPage.jsx](client/src/pages/admin/VentaDispositivosPage.jsx) la **lectura** usa `ventas-equipos` ✅ pero crear/editar/eliminar usan `ventas-licencia` ❌ (líneas 198, 265, 269, 282). Esto rompe la independencia de la tabla: lo que se ingresa cae en la tabla de licencias y nunca reaparece aquí. Deben apuntar a `/admin/payments/ventas-equipos*`.

### 3.3 (Diseño) Falta el vínculo real con la pantalla del Planificador
- En `models/index.js` **no hay asociaciones** para `VentaEquipo` (queda como tabla suelta).
- El formulario carga `nicknames` (de `/admin/bajas/nicknames`, que ya incluyen `idPantalla`) **pero no los usa**: el campo "MAC o ID Pantalla" es un input de texto libre. No hay forma de elegir la pantalla `M001-1` ni de heredar el cliente desde ella.

---

## 4. Recomendaciones para "tabla independiente asociada a cliente + nickname + pantalla"

**Backend**
1. **Corregir el mapeo** del importador según la tabla 3.1.
2. (Opcional) **Agregar `costo`** y/o `serial` al modelo `VentaEquipo` para no perder esas columnas.
3. Mantener `ventas_equipos` como **tabla propia** con su CRUD ya existente en [ventasEquipos.js](server/routes/admin/ventasEquipos.js) — está bien diseñado, solo hay que usarlo desde el frontend.
4. (Opcional, integridad) Definir asociaciones lógicas: `VentaEquipo.customerId` ↔ Cliente y `VentaEquipo.idPantalla` ↔ `Planificador.idPantalla`.

**Frontend** ([VentaDispositivosPage.jsx](client/src/pages/admin/VentaDispositivosPage.jsx))
5. **Repuntar el CRUD** de `ventas-licencia` → `ventas-equipos`.
6. En el formulario, reemplazar el input libre por:
   - **Selector de Cliente** (`customerId`) → autocompleta nombre/apellido.
   - **Selector de Pantalla/Nickname** alimentado del Planificador (filtrado por el cliente elegido) → al elegirlo, fija `idPantalla` (`M001-1`), `nickname` y `cuentaId` automáticamente.
7. Mantener `Serial` como campo aparte del equipo físico (no confundirlo con `idPantalla`).

**Datos**
8. Tras corregir, **reimportar** (`POST /admin/payments/ventas-equipos/import` o vaciar `ventas_equipos`) y luego completar la pantalla `M001-1` por nickname donde aplique.

---

## 5. Resumen

- La tabla **puede y debe** ser independiente; el modelo ya soporta la cadena cliente→nickname→pantalla→cuenta padre.
- Lo que falla hoy: (a) el importador desalinea las columnas → los datos salen vacíos/incorrectos; (b) el CRUD del frontend escribe en la tabla de licencias; (c) no existe el vínculo real con la pantalla del Planificador (input de texto libre).
- El **cliente** (`customerId`) es la llave de unión fiable (99%); el **nickname** es solo informativo (17% de cobertura); la **pantalla `M001-1`** debe seleccionarse del Planificador.

---

## 6. Archivos involucrados

| Archivo | Rol |
|---------|-----|
| [server/routes/admin/ventasEquipos.js](server/routes/admin/ventasEquipos.js) | Importador + CRUD (mapeo a corregir) |
| [server/models/VentaEquipo.js](server/models/VentaEquipo.js) | Modelo `ventas_equipos` (agregar `costo`/`serial` opc.) |
| [server/models/index.js](server/models/index.js) | Asociaciones (falta `VentaEquipo`) |
| [server/models/Planificador.js](server/models/Planificador.js) | Pantallas `M001-1` (fuente de verdad) |
| [client/src/pages/admin/VentaDispositivosPage.jsx](client/src/pages/admin/VentaDispositivosPage.jsx) | Pantalla (CRUD + selector de pantalla a implementar) |
| `Tablas/1-orders_table_Ventas_Firetv2024.xlsx` | Fuente (13 columnas) |
