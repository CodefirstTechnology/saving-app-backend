import authService from '../services/authService.js';
import { User, Group, Member, Notification, Loan } from '../models/index.js';

export async function createAdmin(req, res, next) {
  try {
    const result = await authService.createAdminBySuperAdmin(req.user, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
}

export async function getMetrics(req, res, next) {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      totalAdmins,
      totalMembersUserRole,
      activeUsers,
      suspendedUsers,
      newUsersToday,
      totalBachatGats,
      newGatsToday,
      totalBachatGatMembers,
      totalSavingsBalance,
      activeLoansCount,
      totalNotifications,
      unreadNotifications,
      allGatsRows,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({ role: 'user' }),
      User.countDocuments({ account_status: 'ACTIVE' }),
      User.countDocuments({ account_status: 'SUSPENDED' }),
      User.countDocuments({ created_at: { $gte: startOfDay } }),
      Group.countDocuments(),
      Group.countDocuments({ created_at: { $gte: startOfDay } }),
      Member.countDocuments(),
      Member.aggregate([{ $group: { _id: null, sum: { $sum: '$savings_balance' } } }]),
      Loan.countDocuments({ status: { $in: ['approved', 'issued', 'active'] } }),
      Notification.countDocuments(),
      Notification.countDocuments({ read_at: null }),
      Group.find().lean(),
    ]);

    const totalSavings = totalSavingsBalance[0]?.sum || 0;
    const avgMembersPerGat = totalBachatGats > 0 ? (totalBachatGatMembers / totalBachatGats).toFixed(1) : '0';

    const groupsWithStats = await Promise.all(
      allGatsRows.map(async (g) => {
        const [mCount, sAgg] = await Promise.all([
          Member.countDocuments({ group_id: g._id }),
          Member.aggregate([
            { $match: { group_id: g._id } },
            { $group: { _id: null, sum: { $sum: '$savings_balance' } } },
          ]),
        ]);
        return {
          id: g._id,
          nameMarathi: g.name_marathi,
          nameEnglish: g.name_english,
          city: 'Maharashtra',
          membersCount: mCount,
          maxMembers: g.max_members || 50,
          totalSavings: sAgg[0]?.sum || 0,
        };
      })
    );

    res.json({
      success: true,
      data: {
        totalUsers,
        totalAdmins,
        totalMembers: totalBachatGatMembers,
        activeUsers,
        suspendedUsers,
        newUsersToday,
        totalBachatGats,
        activeBachatGats: totalBachatGats,
        inactiveBachatGats: 0,
        totalBachatGatMembers,
        avgMembersPerGat: Number(avgMembersPerGat),
        newGatsToday,
        totalSavingsEcosystem: totalSavings,
        activeLoansCount,
        notifications: {
          total: totalNotifications,
          unread: unreadNotifications,
          read: totalNotifications - unreadNotifications,
        },
        groups: groupsWithStats,
      },
    });
  } catch (e) {
    next(e);
  }
}
