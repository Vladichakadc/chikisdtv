const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../../middleware/authMiddleware');

// Todas las rutas de administración requieren rol admin
router.use(verifyToken);
router.use(requireRole('admin'));

router.use(require('./dashboard'));
router.use(require('./clients'));
router.use(require('./plans'));
router.use(require('./subscriptions'));
router.use(require('./ventasLicencia'));
router.use(require('./ventasEquipos'));
router.use(require('./payments'));
router.use(require('./devices'));
router.use(require('./inventarioEquipos'));
router.use(require('./planificador'));
router.use(require('./cuentasPadre'));
router.use(require('./bajas'));
router.use(require('./costoPantalla'));
router.use(require('./backup'));

module.exports = router;
