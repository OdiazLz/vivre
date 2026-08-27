import { Router } from 'express';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';
import { approveRegistrationHandler, createInvitationHandler, deactivateInvitationHandler, getInvitationsHandler, getRegistrationRequestsHandler, rejectRegistrationHandler } from '../controllers/registrationController.js';

const router = Router();
router.use(authenticateToken);
router.use(authorizeRoles('ADMINISTRADOR', 'PRESIDENTE', 'SECRETARIO'));
router.get('/registro/invitaciones', getInvitationsHandler);
router.post('/registro/invitaciones', createInvitationHandler);
router.delete('/registro/invitaciones/:id', deactivateInvitationHandler);
router.get('/registro/solicitudes', getRegistrationRequestsHandler);
router.post('/registro/solicitudes/:id/aprobar', approveRegistrationHandler);
router.post('/registro/solicitudes/:id/rechazar', rejectRegistrationHandler);
export default router;
