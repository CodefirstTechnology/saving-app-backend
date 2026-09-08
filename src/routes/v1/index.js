import { Router } from 'express';
import { validateBody, validateQuery } from '../../middlewares/validate.js';
import { authenticate } from '../../middlewares/auth.js';
import { authorizeRoles } from '../../middlewares/rbac.js';
import { groupScopeMiddleware, groupScopeOptionalForSuperAdmin } from '../../middlewares/groupScope.js';
import * as authController from '../../controllers/authController.js';
import * as adminController from '../../controllers/adminController.js';
import * as groupController from '../../controllers/groupController.js';
import * as memberController from '../../controllers/memberController.js';
import * as transactionController from '../../controllers/transactionController.js';
import * as loanController from '../../controllers/loanController.js';
import * as notificationController from '../../controllers/notificationController.js';
import * as collectionController from '../../controllers/collectionController.js';
import * as dashboardController from '../../controllers/dashboardController.js';
import { depositProofUpload } from '../../middlewares/depositProofUpload.js';
import * as translationController from '../../controllers/translationController.js';
import * as uploadController from '../../controllers/uploadController.js';
import uploadMiddleware from '../../middlewares/uploadMiddleware.js';
import {
  bootstrapSchema,
  loginSchema,
  refreshTokenSchema,
  logoutSchema,
  googleAuthSchema,
  registerAdminSchema,
  createAdminSchema,
  createGroupSchema,
  updateGroupSchema,
  translateSchema,
  memberCreateSchema,
  memberUpdateSchema,
  groupScopedPaginationSchema,
  transactionListQuerySchema,
  savingsEntrySchema,
  ledgerEntrySchema,
  loanRequestSchema,
  loanApproveSchema,
  loanIssueSchema,
  loanRepaySchema,
  loanListQuerySchema,
  loanStatusSchema,
  loanVoteSchema,
  loanRejectBodySchema,
  ledgerSummaryQuerySchema,
  collectionPaymentSubmitSchema,
  collectionPaymentListQuerySchema,
} from '../../validations/schemas.js';

/**
 * @param {object} limiters from buildApiRateLimiters()
 */
export default function createV1Router(limiters) {
  const { loginLimiter, authStrictLimiter, sensitiveLimiter } = limiters;
  const r = Router();

  r.get('/health', (req, res) => {
    res.json({ success: true, data: { status: 'ok', version: 'v1' } });
  });

  r.post('/auth/bootstrap', loginLimiter, validateBody(bootstrapSchema), authController.bootstrap);
  r.post('/auth/login', loginLimiter, validateBody(loginSchema), authController.login);
  r.post('/auth/google', loginLimiter, validateBody(googleAuthSchema), authController.googleLogin);
  r.post('/auth/refresh', authStrictLimiter, validateBody(refreshTokenSchema), authController.refresh);
  r.post('/auth/logout', authStrictLimiter, validateBody(logoutSchema), authController.logout);
  r.post(
    '/auth/register-admin',
    loginLimiter,
    validateBody(registerAdminSchema),
    authController.registerAdmin
  );

  r.post('/translate', validateBody(translateSchema), translationController.translateText);


  r.use(authenticate);
  r.use(sensitiveLimiter);

  r.post('/upload/screenshot', uploadMiddleware.single('screenshot'), uploadController.uploadScreenshotHandler);

  r.get('/admin/metrics', authorizeRoles('super_admin'), adminController.getMetrics);
  r.post(
    '/admin/create-admin',
    authorizeRoles('super_admin'),
    validateBody(createAdminSchema),
    adminController.createAdmin
  );

  r.get('/groups/mine', authorizeRoles('admin'), groupController.listMine);
  r.get('/groups', authorizeRoles('super_admin'), groupController.list);
  /** Only Admins create Bachat Gats in normal workflow. */
  r.post(
    '/groups',
    authorizeRoles('admin'),
    validateBody(createGroupSchema),
    groupController.create
  );
  r.put(
    '/groups/:groupId',
    groupScopeOptionalForSuperAdmin,
    authorizeRoles('admin', 'super_admin'),
    validateBody(updateGroupSchema),
    groupController.update
  );

  r.get('/dashboard/summary', groupScopeOptionalForSuperAdmin, dashboardController.summary);

  r.get(
    '/members/summary',
    groupScopeMiddleware,
    authorizeRoles('admin'),
    memberController.summary
  );
  r.get('/members', groupScopeMiddleware, validateQuery(groupScopedPaginationSchema), memberController.list);
  r.get('/members/:id', groupScopeMiddleware, memberController.getById);
  r.post(
    '/members/add-by-id',
    groupScopeMiddleware,
    authorizeRoles('admin'),
    memberController.addById
  );
  r.post(
    '/members',
    groupScopeMiddleware,
    authorizeRoles('admin'),
    validateBody(memberCreateSchema),
    memberController.create
  );
  r.patch(
    '/members/:id',
    groupScopeMiddleware,
    authorizeRoles('admin'),
    validateBody(memberUpdateSchema),
    memberController.update
  );
  r.delete('/members/:id', groupScopeMiddleware, authorizeRoles('admin'), memberController.remove);

  r.get('/transactions/summary', groupScopeMiddleware, validateQuery(ledgerSummaryQuerySchema), transactionController.ledgerSummary);
  r.get('/transactions', groupScopeMiddleware, validateQuery(transactionListQuerySchema), transactionController.list);
  r.post(
    '/transactions/savings',
    groupScopeMiddleware,
    authorizeRoles('admin'),
    validateBody(savingsEntrySchema),
    transactionController.savings
  );
  r.post(
    '/transactions',
    groupScopeMiddleware,
    authorizeRoles('admin'),
    validateBody(ledgerEntrySchema),
    transactionController.ledgerEntry
  );

  r.get('/loans', groupScopeMiddleware, validateQuery(loanListQuerySchema), loanController.list);
  r.get('/loans/eligibility', groupScopeMiddleware, authorizeRoles('user'), loanController.eligibility);
  r.post('/loans/request', groupScopeMiddleware, loanController.request);
  r.post(
    '/loans/:id/vote',
    groupScopeMiddleware,
    validateBody(loanVoteSchema),
    loanController.vote
  );
  r.post(
    '/loans/:id/approve',
    groupScopeMiddleware,
    authorizeRoles('admin'),
    validateBody(loanApproveSchema),
    loanController.approve
  );
  r.post(
    '/loans/:id/reject',
    groupScopeMiddleware,
    authorizeRoles('admin'),
    validateBody(loanRejectBodySchema),
    loanController.reject
  );
  r.post(
    '/loans/repay',
    groupScopeMiddleware,
    authorizeRoles('admin'),
    validateBody(loanRepaySchema),
    loanController.repay
  );

  r.get('/notifications/unread-count', notificationController.unreadCount);
  r.get('/notifications', notificationController.list);
  r.post('/notifications/register-token', notificationController.registerToken);
  r.post('/notifications/read-all', notificationController.markAllRead);
  r.patch('/notifications/:id/read', notificationController.markRead);
  r.patch('/notifications/:id/unread', notificationController.markUnread);

  r.post(
    '/collection/payments',
    groupScopeMiddleware,
    authorizeRoles('user'),
    validateBody(collectionPaymentSubmitSchema),
    collectionController.submitPayment
  );
  r.get(
    '/collection/payments',
    groupScopeMiddleware,
    validateQuery(collectionPaymentListQuerySchema),
    collectionController.listPayments
  );
  r.post(
    '/collection/payments/:id/confirm',
    groupScopeMiddleware,
    authorizeRoles('super_admin', 'admin'),
    collectionController.confirmPayment
  );
  r.post(
    '/collection/payments/:id/reject',
    groupScopeMiddleware,
    authorizeRoles('super_admin', 'admin'),
    collectionController.rejectPayment
  );
  r.get('/collection/transparency', groupScopeMiddleware, collectionController.transparency);
  r.get('/collection/deposits', groupScopeMiddleware, collectionController.listDeposits);
  r.post(
    '/collection/deposits',
    groupScopeMiddleware,
    authorizeRoles('super_admin', 'admin'),
    depositProofUpload.single('proof'),
    collectionController.createDeposit
  );
  r.post(
    '/loans/issue',
    groupScopeMiddleware,
    authorizeRoles('super_admin', 'admin'),
    validateBody(loanIssueSchema),
    loanController.issue
  );
  r.post(
    '/loans/repay',
    groupScopeMiddleware,
    authorizeRoles('super_admin', 'admin'),
    validateBody(loanRepaySchema),
    loanController.repay
  );
  r.patch(
    '/loans/:id/status',
    groupScopeMiddleware,
    authorizeRoles('super_admin', 'admin'),
    validateBody(loanStatusSchema),
    loanController.setStatus
  );

  return r;
}
