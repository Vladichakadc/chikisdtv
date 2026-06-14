const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const OUTPUT = path.join(__dirname, 'Informe_ChikisdTV.pdf');
const doc = new PDFDocument({ size: 'A4', margin: 50, info: { Title: 'Informe Tecnico ChikisdTV', Author: 'Claude Code' } });
doc.pipe(fs.createWriteStream(OUTPUT));

const ORANGE = '#f97316';
const DARK = '#1e293b';
const GRAY = '#64748b';
const LIGHT_BG = '#fff7ed';
const BORDER = '#e2e8f0';

function hr() {
  doc.moveDown(0.3);
  doc.strokeColor(BORDER).lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(0.5);
}

function h1(text) {
  if (doc.y > 700) doc.addPage();
  doc.fillColor(ORANGE).font('Helvetica-Bold').fontSize(20).text(text, { align: 'left' });
  hr();
}

function h2(text) {
  if (doc.y > 720) doc.addPage();
  doc.moveDown(0.5);
  doc.fillColor(DARK).font('Helvetica-Bold').fontSize(14).text(text);
  doc.moveDown(0.3);
}

function h3(text) {
  if (doc.y > 740) doc.addPage();
  doc.moveDown(0.3);
  doc.fillColor(ORANGE).font('Helvetica-Bold').fontSize(11).text(text);
  doc.moveDown(0.2);
}

function p(text) {
  if (doc.y > 760) doc.addPage();
  doc.fillColor(DARK).font('Helvetica').fontSize(10).text(text, { align: 'justify', lineGap: 2 });
  doc.moveDown(0.3);
}

function code(text) {
  if (doc.y > 700) doc.addPage();
  const lines = text.split('\n');
  const height = lines.length * 12 + 16;
  doc.rect(50, doc.y, 495, height).fill('#0f172a');
  doc.fillColor('#e2e8f0').font('Courier').fontSize(9);
  let y = doc.y - height + 8;
  lines.forEach(line => {
    doc.text(line, 58, y, { lineBreak: false });
    y += 12;
  });
  doc.fillColor(DARK).moveDown(0.5);
}

function bullet(text) {
  if (doc.y > 760) doc.addPage();
  doc.fillColor(DARK).font('Helvetica').fontSize(10);
  doc.text('  • ' + text, { indent: 10, align: 'left', lineGap: 2 });
}

function table(headers, rows, colWidths) {
  if (doc.y > 650) doc.addPage();
  const startX = 50;
  let y = doc.y;
  const rowHeight = 22;

  // Header
  doc.rect(startX, y, colWidths.reduce((a, b) => a + b, 0), rowHeight).fill(ORANGE);
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9);
  let x = startX;
  headers.forEach((h, i) => {
    doc.text(h, x + 6, y + 7, { width: colWidths[i] - 12, lineBreak: false });
    x += colWidths[i];
  });
  y += rowHeight;

  // Rows
  doc.font('Helvetica').fontSize(8.5);
  rows.forEach((row, idx) => {
    if (y > 770) {
      doc.addPage();
      y = 50;
    }
    const bg = idx % 2 === 0 ? '#ffffff' : LIGHT_BG;
    doc.rect(startX, y, colWidths.reduce((a, b) => a + b, 0), rowHeight).fill(bg);
    doc.strokeColor(BORDER).lineWidth(0.5).rect(startX, y, colWidths.reduce((a, b) => a + b, 0), rowHeight).stroke();
    doc.fillColor(DARK);
    x = startX;
    row.forEach((cell, i) => {
      doc.text(String(cell), x + 6, y + 7, { width: colWidths[i] - 12, lineBreak: false, ellipsis: true });
      x += colWidths[i];
    });
    y += rowHeight;
  });

  doc.y = y + 8;
}

// ============ COVER ============
doc.rect(0, 0, 595, 842).fill('#1e293b');
doc.fillColor(ORANGE).font('Helvetica-Bold').fontSize(48).text('ChikisdTV', 50, 250, { align: 'center', width: 495 });
doc.fillColor('#ffffff').font('Helvetica').fontSize(18).text('Sistema de Gestion IPTV', { align: 'center', width: 495 });
doc.moveDown(2);
doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(22).text('Informe Tecnico', { align: 'center', width: 495 });
doc.moveDown(0.3);
doc.fillColor('#94a3b8').font('Helvetica').fontSize(12).text('Arquitectura, base de datos y endpoints', { align: 'center', width: 495 });
doc.moveDown(8);
doc.fillColor('#fed7aa').font('Helvetica').fontSize(11).text('Generado el ' + new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' }), { align: 'center', width: 495 });

// ============ PAGE 2 - Tabla de Contenido ============
doc.addPage();
h1('1. Resumen Ejecutivo');
p('ChikisdTV es una aplicacion web completa para la gestion de un negocio de servicios IPTV (television por internet). Permite administrar clientes/suscriptores, planes comerciales, suscripciones activas, pagos/cobros y dispositivos asignados.');
p('La aplicacion sigue una arquitectura de tres capas con frontend en React, backend en Express/Node.js y base de datos SQLite. Esta disenada para correr de forma local en Windows en una unica maquina.');

h2('Identidad visual');
bullet('Nombre comercial: ChikisdTV');
bullet('Color primario: Naranja (#f97316)');
bullet('Color de contraste: Slate 800 (#1e293b)');
bullet('Tipografia: Inter');
doc.moveDown();

h2('Acceso por defecto');
bullet('Email administrador: admin@chikisdtv.com');
bullet('Contrasena administrador: admin123');
bullet('URL frontend (dev): http://localhost:5174');
bullet('URL backend (API): http://localhost:4000');

// ============ Arquitectura ============
doc.addPage();
h1('2. Arquitectura General');

p('La aplicacion implementa una arquitectura clasica de tres capas con separacion clara de responsabilidades:');

code(
`+-----------------------------------------+
|   FRONTEND  (React 18 + Vite + Tailwind)|
|             Puerto 5174                 |
+-----------------------------------------+
                  |
                  | HTTP / Axios + JWT
                  v
+-----------------------------------------+
|   BACKEND   (Express + Node.js)         |
|             Puerto 4000                 |
+-----------------------------------------+
                  |
                  | Sequelize ORM
                  v
+-----------------------------------------+
|   BASE DE DATOS  (SQLite local)         |
|       C:\\ChikisdTV\\database.sqlite      |
+-----------------------------------------+`
);

h2('Stack tecnologico');
table(
  ['Capa', 'Tecnologia', 'Version'],
  [
    ['Frontend Framework', 'React', '18.2'],
    ['Build tool', 'Vite', '5.2'],
    ['Estilos', 'Tailwind CSS', '3.4'],
    ['Routing', 'React Router', '6.22'],
    ['HTTP Client', 'Axios', '1.6'],
    ['Iconos', 'Lucide React', '0.368'],
    ['Graficos', 'Recharts', '3.8'],
    ['Backend Framework', 'Express', '4.19'],
    ['ORM', 'Sequelize', '6.37'],
    ['Base de datos', 'SQLite3', '5.1'],
    ['Autenticacion', 'JWT (jsonwebtoken)', '9.0'],
    ['Hash de contrasenas', 'bcryptjs', '2.4'],
    ['Seguridad HTTP', 'Helmet', '8.2'],
    ['Rate limiting', 'express-rate-limit', '8.5']
  ],
  [180, 240, 75]
);

// ============ Estructura ============
doc.addPage();
h1('3. Estructura del Proyecto');

code(
`C:\\ChikisdTV\\
|
+-- server\\                   Backend Express
|   +-- server.js              Punto de entrada
|   +-- package.json
|   +-- .env                   Variables de entorno
|   +-- config\\
|   |   +-- database.js        Configuracion Sequelize
|   +-- middleware\\
|   |   +-- authMiddleware.js  Verificacion JWT
|   +-- models\\
|   |   +-- index.js           Asociaciones
|   |   +-- Client.js
|   |   +-- Plan.js
|   |   +-- Subscription.js
|   |   +-- Payment.js
|   |   +-- Device.js
|   +-- routes\\
|       +-- auth.js            Login / cambio password
|       +-- admin.js           CRUD completo
|       +-- user.js            Endpoints /my-*
|
+-- client\\                   Frontend React
|   +-- package.json
|   +-- vite.config.js
|   +-- tailwind.config.js
|   +-- index.html
|   +-- src\\
|       +-- main.jsx
|       +-- App.jsx            Rutas React Router
|       +-- config\\api.js     Cliente Axios
|       +-- context\\           Estado global UI
|       +-- components\\ui\\   Button, Card, Input...
|       +-- layouts\\           DashboardLayout
|       +-- pages\\admin\\
|       +-- pages\\user\\
|       +-- utils\\
|
+-- database.sqlite           Base de datos
+-- iniciar_aplicacion.bat    Launcher Windows
+-- Informe_ChikisdTV.pdf     Este informe`
);

// ============ Base de Datos ============
doc.addPage();
h1('4. Modelo de Base de Datos');

p('La base de datos consta de 5 tablas principales con relaciones uno-a-muchos. Todas las tablas incluyen campos timestamp automaticos (createdAt, updatedAt).');

h2('Diagrama entidad-relacion');

code(
`+----------+     1:N    +---------------+
|  Client  |----------->|  Subscription |
+----------+            +---------------+
     |                       |     ^
     |                       |     |   N:1
     |                       |     +--------+
     |                       |              |
     | 1:N                   | 1:N      +---+----+
     |                       v          |  Plan  |
     |                  +---------+     +--------+
     +----------------->| Payment |
     |                  +---------+
     |
     | 1:N
     v
+----------+
|  Device  |
+----------+`
);

p('Adicionalmente:');
bullet('Payment puede pertenecer opcionalmente a una Subscription');
bullet('Device puede pertenecer opcionalmente a una Subscription');
bullet('Client tiene un campo role que distingue entre admin y user');

// ============ Tablas individuales ============
doc.addPage();
h1('5. Detalle de Tablas');

h2('5.1 Tabla: clients');
p('Almacena todos los usuarios del sistema (administradores y suscriptores). Es la entidad central.');
table(
  ['Campo', 'Tipo', 'Restriccion', 'Descripcion'],
  [
    ['id', 'INTEGER', 'PK, AUTO', 'Identificador unico'],
    ['customerId', 'STRING', 'UNIQUE', 'Codigo de cliente'],
    ['name', 'STRING', 'NOT NULL', 'Nombre completo'],
    ['email', 'STRING', 'UNIQUE, NOT NULL', 'Correo (login)'],
    ['phone', 'STRING', '', 'Telefono'],
    ['cedula', 'STRING', 'UNIQUE', 'Documento de identidad'],
    ['password', 'STRING', 'NOT NULL', 'Hash bcrypt'],
    ['role', 'ENUM', 'admin/user', 'Rol del usuario'],
    ['estatus', 'ENUM', 'Activo/Inactivo', 'Estado de la cuenta'],
    ['mustChangePassword', 'BOOLEAN', 'default false', 'Forzar cambio'],
    ['observaciones', 'TEXT', '', 'Notas internas'],
    ['createdAt', 'DATETIME', 'AUTO', 'Fecha registro'],
    ['updatedAt', 'DATETIME', 'AUTO', 'Ultima edicion']
  ],
  [110, 70, 120, 195]
);

h2('5.2 Tabla: plans');
p('Catalogo de planes IPTV ofrecidos. Incluye precio, duracion y cantidad de pantallas permitidas.');
table(
  ['Campo', 'Tipo', 'Restriccion', 'Descripcion'],
  [
    ['id', 'INTEGER', 'PK, AUTO', 'Identificador'],
    ['nombre', 'STRING', 'NOT NULL', 'Nombre del plan'],
    ['precio', 'FLOAT', 'NOT NULL', 'Precio del plan'],
    ['duracionDias', 'INTEGER', 'default 30', 'Duracion en dias'],
    ['numeroPantallas', 'INTEGER', 'default 1', 'Pantallas permitidas'],
    ['descripcion', 'TEXT', '', 'Descripcion publica'],
    ['activo', 'BOOLEAN', 'default true', 'Si esta disponible']
  ],
  [110, 70, 120, 195]
);

h2('5.3 Tabla: subscriptions');
p('Representa una suscripcion contratada por un cliente bajo un plan especifico. Tiene fecha de inicio, vencimiento y estado.');
table(
  ['Campo', 'Tipo', 'Restriccion', 'Descripcion'],
  [
    ['id', 'INTEGER', 'PK, AUTO', 'Identificador'],
    ['clientId', 'INTEGER', 'FK -> clients', 'Cliente suscriptor'],
    ['planId', 'INTEGER', 'FK -> plans', 'Plan contratado'],
    ['fechaInicio', 'DATE', 'NOT NULL', 'Inicio de vigencia'],
    ['fechaVencimiento', 'DATE', 'NOT NULL', 'Fecha de vencimiento'],
    ['estado', 'ENUM', 'Activo/Vencido/Cancelado', 'Estado actual'],
    ['observaciones', 'TEXT', '', 'Notas']
  ],
  [110, 70, 120, 195]
);

doc.addPage();
h2('5.4 Tabla: payments');
p('Registro de pagos realizados por los clientes. Cada pago puede o no estar vinculado a una suscripcion.');
table(
  ['Campo', 'Tipo', 'Restriccion', 'Descripcion'],
  [
    ['id', 'INTEGER', 'PK, AUTO', 'Identificador'],
    ['clientId', 'INTEGER', 'FK -> clients', 'Cliente que paga'],
    ['subscriptionId', 'INTEGER', 'FK opcional', 'Suscripcion asociada'],
    ['monto', 'FLOAT', 'NOT NULL', 'Monto del pago'],
    ['fechaPago', 'DATE', '', 'Fecha del pago'],
    ['fechaVencimiento', 'DATE', '', 'Fecha de vencimiento'],
    ['metodoPago', 'STRING', '', 'Efectivo, Nequi...'],
    ['comprobante', 'STRING', '', 'Numero de referencia'],
    ['estado', 'ENUM', 'Pagado/Pendiente/Vencido', 'Estado del pago'],
    ['observaciones', 'TEXT', '', 'Notas']
  ],
  [110, 70, 130, 185]
);

h2('5.5 Tabla: devices');
p('Dispositivos (Smart TVs, celulares, PCs) asignados a cada cliente. Permite controlar las pantallas habilitadas.');
table(
  ['Campo', 'Tipo', 'Restriccion', 'Descripcion'],
  [
    ['id', 'INTEGER', 'PK, AUTO', 'Identificador'],
    ['clientId', 'INTEGER', 'FK -> clients', 'Cliente propietario'],
    ['subscriptionId', 'INTEGER', 'FK opcional', 'Suscripcion vinculada'],
    ['nombre', 'STRING', 'NOT NULL', 'Nombre del equipo'],
    ['tipo', 'ENUM', 'TV/PC/Cel/Tab/Otro', 'Tipo de dispositivo'],
    ['mac', 'STRING', '', 'MAC o ID'],
    ['activo', 'BOOLEAN', 'default true', 'Habilitado'],
    ['observaciones', 'TEXT', '', 'Notas']
  ],
  [110, 70, 130, 185]
);

// ============ Endpoints ============
doc.addPage();
h1('6. Endpoints de la API');

p('Todos los endpoints estan bajo el prefijo /api y requieren autenticacion JWT excepto el login.');

h2('6.1 Autenticacion (/api/auth)');
table(
  ['Metodo', 'Endpoint', 'Descripcion'],
  [
    ['POST', '/api/auth/login', 'Inicia sesion y devuelve token JWT'],
    ['POST', '/api/auth/change-password', 'Cambia la contrasena del usuario']
  ],
  [70, 200, 225]
);

h2('6.2 Admin: Dashboard');
table(
  ['Metodo', 'Endpoint', 'Descripcion'],
  [
    ['GET', '/api/admin/dashboard-stats', 'KPIs generales']
  ],
  [70, 200, 225]
);

h2('6.3 Admin: Clientes');
table(
  ['Metodo', 'Endpoint', 'Descripcion'],
  [
    ['GET', '/api/admin/clients', 'Listar todos los clientes'],
    ['GET', '/api/admin/clients/:id', 'Obtener un cliente'],
    ['POST', '/api/admin/clients', 'Crear cliente'],
    ['PUT', '/api/admin/clients/:id', 'Actualizar cliente'],
    ['DELETE', '/api/admin/clients/:id', 'Eliminar cliente']
  ],
  [70, 200, 225]
);

h2('6.4 Admin: Planes');
table(
  ['Metodo', 'Endpoint', 'Descripcion'],
  [
    ['GET', '/api/admin/plans', 'Listar planes'],
    ['POST', '/api/admin/plans', 'Crear plan'],
    ['PUT', '/api/admin/plans/:id', 'Actualizar plan'],
    ['DELETE', '/api/admin/plans/:id', 'Eliminar plan']
  ],
  [70, 200, 225]
);

h2('6.5 Admin: Suscripciones');
table(
  ['Metodo', 'Endpoint', 'Descripcion'],
  [
    ['GET', '/api/admin/subscriptions', 'Listar suscripciones'],
    ['POST', '/api/admin/subscriptions', 'Crear suscripcion'],
    ['PUT', '/api/admin/subscriptions/:id', 'Actualizar'],
    ['DELETE', '/api/admin/subscriptions/:id', 'Eliminar']
  ],
  [70, 200, 225]
);

doc.addPage();
h2('6.6 Admin: Pagos');
table(
  ['Metodo', 'Endpoint', 'Descripcion'],
  [
    ['GET', '/api/admin/payments', 'Listar pagos'],
    ['POST', '/api/admin/payments', 'Registrar pago'],
    ['PUT', '/api/admin/payments/:id', 'Actualizar pago'],
    ['DELETE', '/api/admin/payments/:id', 'Eliminar pago']
  ],
  [70, 200, 225]
);

h2('6.7 Admin: Dispositivos');
table(
  ['Metodo', 'Endpoint', 'Descripcion'],
  [
    ['GET', '/api/admin/devices', 'Listar dispositivos'],
    ['POST', '/api/admin/devices', 'Crear dispositivo'],
    ['PUT', '/api/admin/devices/:id', 'Actualizar dispositivo'],
    ['DELETE', '/api/admin/devices/:id', 'Eliminar dispositivo']
  ],
  [70, 200, 225]
);

h2('6.8 Portal de Usuario (/api/user)');
table(
  ['Metodo', 'Endpoint', 'Descripcion'],
  [
    ['GET', '/api/user/me', 'Perfil del usuario actual'],
    ['GET', '/api/user/my-summary', 'Resumen para el dashboard'],
    ['GET', '/api/user/my-subscriptions', 'Mis suscripciones'],
    ['GET', '/api/user/my-payments', 'Mis pagos'],
    ['GET', '/api/user/my-devices', 'Mis dispositivos']
  ],
  [70, 200, 225]
);

// ============ Frontend Routes ============
h1('7. Rutas del Frontend');

h2('7.1 Rutas publicas');
table(
  ['Ruta', 'Componente', 'Proposito'],
  [
    ['/login', 'Login.jsx', 'Inicio de sesion'],
    ['/change-password', 'ChangePasswordPage.jsx', 'Cambio obligatorio']
  ],
  [160, 170, 165]
);

h2('7.2 Rutas administrador (rol=admin)');
table(
  ['Ruta', 'Componente', 'Proposito'],
  [
    ['/admin', 'DashboardHome.jsx', 'Dashboard con KPIs'],
    ['/admin/clients', 'ClientsPage.jsx', 'CRUD clientes'],
    ['/admin/plans', 'PlansPage.jsx', 'CRUD planes'],
    ['/admin/subscriptions', 'SubscriptionsPage.jsx', 'CRUD suscripciones'],
    ['/admin/payments', 'PaymentsPage.jsx', 'CRUD pagos'],
    ['/admin/devices', 'DevicesPage.jsx', 'CRUD dispositivos']
  ],
  [160, 170, 165]
);

h2('7.3 Rutas portal cliente (rol=user)');
table(
  ['Ruta', 'Componente', 'Proposito'],
  [
    ['/dashboard', 'UserDashboardHome.jsx', 'Resumen personal'],
    ['/dashboard/subscription', 'UserSubscriptionPage.jsx', 'Mi suscripcion'],
    ['/dashboard/payments', 'UserPaymentsPage.jsx', 'Mis pagos'],
    ['/dashboard/devices', 'UserDevicesPage.jsx', 'Mis dispositivos']
  ],
  [160, 170, 165]
);

// ============ Seguridad ============
doc.addPage();
h1('8. Seguridad');

h2('Autenticacion');
bullet('Tokens JWT con expiracion de 8 horas');
bullet('Almacenamiento en localStorage del navegador');
bullet('Envio automatico via interceptor de Axios (Authorization: Bearer)');
bullet('Verificacion en middleware verifyToken antes de cada ruta protegida');

h2('Autorizacion');
bullet('Sistema de roles: admin y user');
bullet('Middleware requireRole bloquea acceso a rutas /api/admin/* para usuarios sin rol admin');
bullet('Portal de usuario solo accede a sus propios datos (filtrado por req.user.id)');

h2('Contrasenas');
bullet('Hash con bcryptjs (cost factor 10)');
bullet('Contrasena temporal forzada en primer login (flag mustChangePassword)');
bullet('Minimo 6 caracteres en cambio de contrasena');

h2('Hardening HTTP');
bullet('Helmet aplicado: headers seguros (X-Frame-Options, X-Content-Type-Options, HSTS)');
bullet('CORS habilitado para entorno local');
bullet('Limite de body 10 MB');
bullet('Error handler global oculta stack traces');

// ============ Instalacion ============
doc.addPage();
h1('9. Instalacion y Puesta en Marcha');

h2('9.1 Pre-requisitos');
bullet('Node.js 18 o superior');
bullet('Windows 10 / 11');
bullet('Aproximadamente 300 MB de espacio en disco (incluye node_modules)');

h2('9.2 Inicio rapido');
p('Doble clic sobre iniciar_aplicacion.bat en la raiz del proyecto. El script:');
bullet('Verifica que Node.js este instalado');
bullet('Instala dependencias automaticamente si faltan los node_modules');
bullet('Lanza el backend en una ventana CMD (puerto 4000)');
bullet('Lanza el frontend en otra ventana CMD (puerto 5174)');
bullet('Muestra las URLs y credenciales por defecto');

h2('9.3 Comandos manuales');
code(
`# Backend (en server/)
npm install        # Instalar dependencias
npm start          # Iniciar servidor
npm run dev        # Con auto-restart (nodemon)

# Frontend (en client/)
npm install        # Instalar dependencias
npm run dev        # Servidor desarrollo
npm run build      # Build de produccion
npm run preview    # Probar build de produccion`
);

h2('9.4 Primer inicio');
bullet('Se crea automaticamente C:\\ChikisdTV\\database.sqlite');
bullet('Se inserta el usuario admin (admin@chikisdtv.com / admin123)');
bullet('Se cargan 4 planes iniciales: 1, 2, 3 pantallas y Anual 1 pantalla');

h2('9.5 Datos iniciales de planes');
table(
  ['Plan', 'Precio', 'Duracion', 'Pantallas'],
  [
    ['1 Pantalla', '$8.000', '30 dias', '1'],
    ['2 Pantallas', '$12.000', '30 dias', '2'],
    ['3 Pantallas', '$16.000', '30 dias', '3'],
    ['Anual 1 Pantalla', '$80.000', '365 dias', '1']
  ],
  [180, 110, 110, 95]
);

// ============ Funcionalidades ============
doc.addPage();
h1('10. Funcionalidades por Modulo');

h2('10.1 Panel administrador');
h3('Dashboard general');
bullet('Total de clientes activos');
bullet('Numero de planes disponibles');
bullet('Suscripciones activas en el sistema');
bullet('Dispositivos activos en total');
bullet('Ingresos acumulados (pagos confirmados)');
bullet('Pagos pendientes y vencidos');
bullet('Suscripciones por vencer en proximos 7 dias');

h3('Gestion de clientes');
bullet('Listado tabular con filtro por rol y estado');
bullet('Creacion con datos completos (cedula, telefono, email)');
bullet('Edicion completa incluyendo reset de contrasena');
bullet('Asignacion de rol (admin / user)');
bullet('Activacion / desactivacion de cuenta');

h3('Gestion de planes');
bullet('Definicion de planes con precio y duracion personalizable');
bullet('Configuracion del numero de pantallas permitidas');
bullet('Activar / desactivar planes sin eliminarlos');

h3('Suscripciones');
bullet('Asignacion de plan a un cliente');
bullet('Calculo automatico de fecha de vencimiento (segun duracion del plan)');
bullet('Edicion manual de fechas y estado');
bullet('Estados: Activo, Vencido, Cancelado');

h3('Pagos');
bullet('Registro de pago vinculado a cliente y opcionalmente a suscripcion');
bullet('Metodo de pago libre (Efectivo, Nequi, Daviplata, etc.)');
bullet('Numero de comprobante para conciliacion');
bullet('Estados: Pagado, Pendiente, Vencido');

h3('Dispositivos');
bullet('Registro de equipos por cliente con tipo (Smart TV, PC, Celular, Tablet)');
bullet('Asociacion opcional a suscripcion especifica');
bullet('Direccion MAC o identificador unico');
bullet('Activar / desactivar dispositivo');

doc.addPage();
h2('10.2 Portal del cliente (rol user)');
h3('Mi Resumen');
bullet('Estado de mi suscripcion activa');
bullet('Numero de mis dispositivos activos');
bullet('Pagos pendientes a mi nombre');
bullet('Total acumulado pagado');
bullet('Detalle visible del plan vigente con fecha de vencimiento');

h3('Mi Suscripcion');
bullet('Historial completo de mis suscripciones');
bullet('Plan, precio, fechas de inicio y vencimiento');
bullet('Estados visibles con badges de color');

h3('Mis Pagos');
bullet('Historial cronologico de mis pagos');
bullet('Monto, metodo de pago y fecha');
bullet('Plan al que se aplico el pago');

h3('Mis Dispositivos');
bullet('Listado de mis equipos registrados');
bullet('Tipo y MAC de cada dispositivo');
bullet('Plan asignado a cada equipo');

// ============ Conclusion ============
h1('11. Conclusion');
p('ChikisdTV es una aplicacion lista para uso en produccion local con todas las funcionalidades clave para gestionar un negocio de IPTV de pequeno a mediano tamano. La arquitectura modular y el uso de tecnologias estandar permite extender el sistema facilmente con caracteristicas adicionales (notificaciones por correo, integracion con pasarelas de pago, exportacion a Excel, etc.).');

p('El stack tecnologico replica el utilizado en Credifuturo, lo que facilita el mantenimiento conjunto de ambos proyectos.');

doc.moveDown(2);
doc.fillColor(GRAY).font('Helvetica-Oblique').fontSize(9).text('Fin del informe', { align: 'center' });

doc.end();

console.log('PDF generado:', OUTPUT);
