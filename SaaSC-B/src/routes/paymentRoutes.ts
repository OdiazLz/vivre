import { Router } from 'express';
import { PaymentController } from '../controllers/paymentController.js';
import { PaymentService } from '../services/paymentService.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = Router();
const paymentService = new PaymentService();
const paymentController = new PaymentController(paymentService);

router.post('/pagos/:id/revision', authenticateToken, authorizeRoles('ADMINISTRADOR', 'PRESIDENTE', 'TESORERO'), (req, res) => paymentController.reviewPaymentHandler(req, res));
router.get('/pagos/pending', authenticateToken, authorizeRoles('ADMINISTRADOR', 'PRESIDENTE', 'TESORERO'), (req, res) => paymentController.getPendingPaymentsHandler(req, res));
router.get('/pagos/resumen', authenticateToken, authorizeRoles('ADMINISTRADOR', 'PRESIDENTE', 'SECRETARIO', 'TESORERO', 'VOCAL'), (req, res) => paymentController.getPaymentSummaryHandler(req, res));
router.get('/pagos/efectivo/opciones', authenticateToken, authorizeRoles('ADMINISTRADOR', 'PRESIDENTE', 'TESORERO'), (req, res) => paymentController.getCashPaymentOptionsHandler(req, res));
router.post('/pagos/efectivo', authenticateToken, authorizeRoles('ADMINISTRADOR', 'PRESIDENTE', 'TESORERO'), (req, res) => paymentController.createCashPaymentHandler(req, res));

export default router;
