import { z } from 'zod';

export const bootstrapSchema = z.object({
  mobile_number: z.string().min(10),
  password: z.string().min(8),
  name: z.string().min(1),
  device_id: z.string().max(128).optional(),
  /** Optional first Bachat Gat record (super admin is not tied to one group). */
  group: z
    .object({
      nameMarathi: z.string().min(1),
      nameEnglish: z.string().min(1),
    })
    .optional(),
});

export const loginSchema = z.object({
  mobile_number: z.string().min(1),
  password: z.string().min(1),
  /** Client-generated stable id (stored with refresh token for device binding). */
  device_id: z.string().max(128).optional(),
});

const indianMobile10 = (raw) => {
  const digits = String(raw ?? '').replace(/\D/g, '');
  const last10 = digits.length >= 10 ? digits.slice(-10) : digits;
  return /^[6-9]\d{9}$/.test(last10);
};

/** Public admin self-registration. */
export const registerAdminSchema = z.object({
  first_name: z.string().trim().min(1).max(100),
  last_name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  phone: z
    .string()
    .min(1)
    .max(20)
    .refine(indianMobile10, {
      message: 'Phone must be a valid 10-digit Indian mobile (starts with 6–9)',
    }),
  city: z.string().trim().min(1).max(128),
  state: z.string().trim().min(1).max(128),
  town: z.string().trim().min(1).max(255),
  pincode: z.string().regex(/^\d{6}$/, 'Pincode must be 6 digits'),
  password: z.string().min(8).max(128),
  device_id: z.string().max(128).optional(),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
  device_id: z.string().max(128).optional(),
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(1).optional(),
});

export const createAdminSchema = z.object({
  name: z.string().min(1),
  mobile_number: z.string().min(10),
  password: z.string().min(8),
  group_id: z.string().uuid(),
});

const optionalCycleDays = z
  .union([z.number(), z.string(), z.null(), z.undefined()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === null || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? Math.trunc(n) : null;
  });

export const createGroupSchema = z
  .object({
    nameMarathi: z.string().trim().min(1).max(255),
    nameEnglish: z.string().trim().min(1).max(255),
    loanInterestRateMonthlyPercent: z.coerce.number().gt(0).lte(100),
    maxMembers: z.coerce.number().int().min(2).max(500),
    contributionCycleType: z.enum(['monthly', 'weekly', 'custom']),
    contributionCycleDays: optionalCycleDays,
  })
  .superRefine((data, ctx) => {
    if (data.contributionCycleType === 'custom') {
      const d = data.contributionCycleDays;
      if (d == null || d < 1 || d > 365) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'contributionCycleDays is required for custom cycle (1–365)',
          path: ['contributionCycleDays'],
        });
      }
    }
  });

export const translateSchema = z.object({
  text: z.string().max(2000),
  from: z.enum(['en', 'mr']),
  to: z.enum(['en', 'mr']),
});

export const memberCreateSchema = z
  .object({
    nameMarathi: z.string().min(1),
    nameEnglish: z.string().min(1),
    phone: z.string().optional(),
    mobile_number: z.string().optional(),
    password: z.string().min(8).optional(),
    savingsBalance: z.number().nonnegative().optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (d) => {
      const hasM = Boolean(d.mobile_number?.trim());
      const hasP = Boolean(d.password);
      return hasM === hasP;
    },
    { message: 'mobile_number and password must both be provided or both omitted', path: ['mobile_number'] }
  );

export const memberUpdateSchema = z.object({
  nameMarathi: z.string().min(1).optional(),
  nameEnglish: z.string().min(1).optional(),
  phone: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().optional(),
  pageSize: z.coerce.number().optional(),
  search: z.string().optional(),
  isActive: z.enum(['true', 'false']).optional(),
});

/** Use after `groupScopeMiddleware` (middleware reads `groupId` first; this keeps it in parsed query). */
export const groupScopedPaginationSchema = paginationQuerySchema.extend({
  groupId: z.string().uuid().optional(),
});

export const transactionListQuerySchema = z.object({
  page: z.coerce.number().optional(),
  pageSize: z.coerce.number().optional(),
  memberId: z.string().uuid().optional(),
  category: z.enum(['savings', 'loan_issue', 'loan_repay', 'interest', 'fine', 'other']).optional(),
  categoryIn: z.string().optional(),
  entryType: z.enum(['credit', 'debit']).optional(),
  entryTypeIn: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  groupId: z.string().uuid().optional(),
});

export const savingsEntrySchema = z.object({
  memberId: z.string().uuid(),
  amount: z.number().positive(),
  paymentMode: z.enum(['cash', 'bank']).optional(),
  occurredAt: z.string(),
  descriptionMarathi: z.string().optional(),
  descriptionEnglish: z.string().optional(),
});

export const ledgerEntrySchema = z.object({
  memberId: z.string().uuid().optional().nullable(),
  loanId: z.string().uuid().optional().nullable(),
  entryType: z.enum(['credit', 'debit']),
  category: z.enum(['savings', 'loan_issue', 'loan_repay', 'interest', 'fine', 'other']),
  amount: z.number().positive(),
  paymentMode: z.enum(['cash', 'bank']).optional().nullable(),
  occurredAt: z.string(),
  descriptionMarathi: z.string().optional(),
  descriptionEnglish: z.string().optional(),
});

export const loanRequestSchema = z
  .object({
    selectedTier: z.enum(['safe', 'medium', 'high']).optional(),
    principal: z.number().positive().optional(),
    interestRatePercent: z.number().nonnegative().optional(),
    termMonths: z.number().int().positive().optional(),
    reason: z.string().min(3).max(2000).optional(),
    requestedStartDate: z.string().optional(),
  })
  .refine((d) => d.selectedTier != null || d.principal != null, {
    message: 'Select a tier or pass a suggested principal',
    path: ['selectedTier'],
  });

export const loanVoteSchema = z
  .object({
    decision: z.enum(['approve', 'reject']),
    comment: z.string().max(500).optional(),
    rejectReason: z.string().max(500).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.decision !== 'reject') return;
    const reason = String(data.comment?.trim() || data.rejectReason?.trim() || '');
    if (reason.length < 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Rejection reason is required (at least 3 characters)',
        path: ['comment'],
      });
    }
  });

export const loanRejectBodySchema = z
  .object({
    rejectReason: z.string().max(1000).optional(),
    reason: z.string().max(1000).optional(),
  })
  .superRefine((data, ctx) => {
    const r = String(data.rejectReason?.trim() || data.reason?.trim() || '');
    if (r.length < 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Rejection reason is required (at least 3 characters)',
        path: ['rejectReason'],
      });
    }
  });

export const loanApproveSchema = z.object({
  issuedAt: z.string().optional(),
  dueAt: z.string().optional(),
});

export const loanIssueSchema = z.object({
  memberId: z.string().uuid(),
  principal: z.number().positive(),
  interestRatePercent: z.number().nonnegative().optional(),
  termMonths: z.number().int().positive().optional(),
  issuedAt: z.string().optional(),
  dueAt: z.string().optional(),
  reason: z.string().max(2000).optional(),
});

export const loanRepaySchema = z.object({
  loanId: z.string().uuid(),
  amount: z.number().positive(),
  paymentMode: z.enum(['cash', 'bank']).optional(),
  occurredAt: z.string().optional(),
});

export const loanListQuerySchema = z.object({
  page: z.coerce.number().optional(),
  pageSize: z.coerce.number().optional(),
  status: z.enum(['pending', 'active', 'paid', 'overdue', 'rejected']).optional(),
  statusIn: z.string().optional(),
  memberId: z.string().uuid().optional(),
  groupId: z.string().uuid().optional(),
});

export const loanStatusSchema = z.object({
  status: z.enum(['pending', 'active', 'paid', 'overdue', 'rejected']),
});

export const ledgerSummaryQuerySchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  groupId: z.string().uuid().optional(),
});

export const collectionPaymentSubmitSchema = z
  .object({
    amount: z.number().positive(),
    paymentMethod: z.enum(['cash', 'upi', 'bank_transfer']),
    transactionReference: z.string().max(255).optional().nullable(),
    paidAt: z.string().max(40).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.paymentMethod === 'cash') return;
    const ref = String(data.transactionReference ?? '').trim();
    if (ref.length < 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Transaction reference is required for UPI and bank transfer',
        path: ['transactionReference'],
      });
    }
  });

export const collectionPaymentListQuerySchema = z.object({
  status: z.enum(['initiated', 'collected', 'rejected']).optional(),
  memberId: z.string().uuid().optional(),
  limit: z.coerce.number().optional(),
  groupId: z.string().uuid().optional(),
});
