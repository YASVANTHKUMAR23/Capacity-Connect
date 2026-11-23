import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { Role, AccountStatus, CourseStatus, CourseLevel, AnnouncementStatus } from '@prisma/client';
import { AuditEventType } from '../../common/interfaces/auth.interface';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // ---------------------------------------------------------------------------
  // 1. ANNOUNCEMENTS CRUD
  // ---------------------------------------------------------------------------
  async getAnnouncements() {
    const list = await this.prisma.announcement.findMany({
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    });

    return list.map((a) => ({
      id: a.id,
      title: a.title,
      type: a.type,
      status: a.status === AnnouncementStatus.PUBLISHED ? 'Published' : a.status === AnnouncementStatus.DRAFT ? 'Draft' : 'Scheduled',
      date: a.date,
      message: a.message,
      publishOn: a.publishOn || a.date,
      isPinned: a.isPinned,
      imageUrl: a.imageUrl || undefined,
    }));
  }

  async createAnnouncement(authorId: string, data: any) {
    let status: AnnouncementStatus = AnnouncementStatus.PUBLISHED;
    if (data.status === 'Draft') status = AnnouncementStatus.DRAFT;
    if (data.status === 'Archived') status = AnnouncementStatus.ARCHIVED;

    const ann = await this.prisma.announcement.create({
      data: {
        authorId,
        title: data.title,
        message: data.message,
        type: data.type || 'Announcement',
        status,
        date: data.date || 'Today',
        publishOn: data.publishOn || 'Today',
        isPinned: Boolean(data.isPinned),
        imageUrl: data.imageUrl,
      },
    });

    return {
      id: ann.id,
      title: ann.title,
      type: ann.type,
      status: ann.status === AnnouncementStatus.PUBLISHED ? 'Published' : 'Draft',
      date: ann.date,
      message: ann.message,
      publishOn: ann.publishOn,
      isPinned: ann.isPinned,
      imageUrl: ann.imageUrl,
    };
  }

  async updateAnnouncement(id: string, data: any) {
    const existing = await this.prisma.announcement.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Announcement not found');

    let status = existing.status;
    if (data.status === 'Published') status = AnnouncementStatus.PUBLISHED;
    if (data.status === 'Draft') status = AnnouncementStatus.DRAFT;
    if (data.status === 'Archived') status = AnnouncementStatus.ARCHIVED;

    const updated = await this.prisma.announcement.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.message !== undefined ? { message: data.message } : {}),
        ...(data.type !== undefined ? { type: data.type } : {}),
        ...(data.status !== undefined ? { status } : {}),
        ...(data.date !== undefined ? { date: data.date } : {}),
        ...(data.publishOn !== undefined ? { publishOn: data.publishOn } : {}),
        ...(data.isPinned !== undefined ? { isPinned: Boolean(data.isPinned) } : {}),
        ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl } : {}),
      },
    });

    return {
      id: updated.id,
      title: updated.title,
      type: updated.type,
      status: updated.status === AnnouncementStatus.PUBLISHED ? 'Published' : 'Draft',
      date: updated.date,
      message: updated.message,
      publishOn: updated.publishOn,
      isPinned: updated.isPinned,
      imageUrl: updated.imageUrl,
    };
  }

  async deleteAnnouncement(id: string) {
    const existing = await this.prisma.announcement.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Announcement not found');

    await this.prisma.announcement.delete({ where: { id } });
    return { success: true, id };
  }

  // ---------------------------------------------------------------------------
  // 2. USER GOVERNANCE & APPROVALS CRUD
  // ---------------------------------------------------------------------------
  async getPendingApprovals() {
    const users = await this.prisma.user.findMany({
      where: { accountStatus: AccountStatus.PENDING_APPROVAL },
      include: {
        profile: { include: { division: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return users.map((u) => {
      const parts = u.fullName.split(' ');
      const initials = (parts[0]?.[0] || 'U') + (parts[1]?.[0] || '');
      const colors = ['bg-rose-100 text-rose-800', 'bg-purple-100 text-purple-800', 'bg-amber-100 text-amber-800', 'bg-orange-100 text-orange-800'];
      const avatarBg = colors[Math.abs(u.id.charCodeAt(0)) % colors.length];

      return {
        id: u.id,
        name: u.fullName,
        email: u.email,
        division: u.profile?.division?.name || u.organization || 'General Division',
        roleRequested: u.role === Role.TRAINER ? 'Trainer' : 'Trainee',
        submitted: 'Pending review',
        initials,
        avatarBg,
      };
    });
  }

  async getRejectedUsers() {
    const users = await this.prisma.user.findMany({
      where: { accountStatus: AccountStatus.REJECTED },
      include: {
        profile: { include: { division: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return users.map((u) => ({
      id: u.id,
      name: u.fullName,
      email: u.email,
      division: u.profile?.division?.name || u.organization || 'General Division',
      roleRequested: (u.role === Role.TRAINER ? 'Trainer' : 'Trainee') as 'Trainer' | 'Trainee',
      rejectedDate: new Date(u.updatedAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }),
      reason: 'Official IMD / MoES domain verification requirements not met.',
    }));
  }

  async getUserDirectory() {
    const users = await this.prisma.user.findMany({
      include: {
        profile: { include: { division: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return users.map((u) => {
      const parts = u.fullName.split(' ');
      const initials = (parts[0]?.[0] || 'U') + (parts[1]?.[0] || '');
      const colors = ['bg-indigo-100 text-indigo-800', 'bg-emerald-100 text-emerald-800', 'bg-purple-100 text-purple-800', 'bg-amber-100 text-amber-800', 'bg-blue-100 text-blue-800'];
      const avatarBg = colors[Math.abs(u.id.charCodeAt(0)) % colors.length];

      let roleDisplay = 'Trainee';
      if (u.role === Role.ADMIN) roleDisplay = 'Admin';
      if (u.role === Role.TRAINER) roleDisplay = 'Trainer';

      let statusDisplay = 'Pending';
      if (u.accountStatus === AccountStatus.ACTIVE) statusDisplay = 'Active';
      if (u.accountStatus === AccountStatus.REJECTED) statusDisplay = 'Inactive';
      if (u.accountStatus === AccountStatus.SUSPENDED) statusDisplay = 'Suspended';

      return {
        id: u.id,
        name: u.fullName,
        email: u.email,
        role: roleDisplay,
        status: statusDisplay,
        joined: new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        initials,
        avatarBg,
      };
    });
  }

  async approveUser(adminId: string, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { accountStatus: AccountStatus.ACTIVE },
    });

    await this.auditService.logEvent({
      userId: adminId,
      eventType: AuditEventType.SESSION_REVOCATION,
      metadata: { action: 'USER_APPROVED', targetUserId: userId, targetEmail: user.email },
    });

    return { success: true, user: updated };
  }

  async rejectUser(adminId: string, userId: string, reason?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { accountStatus: AccountStatus.REJECTED },
    });

    await this.auditService.logEvent({
      userId: adminId,
      eventType: AuditEventType.SESSION_REVOCATION,
      metadata: { action: 'USER_REJECTED', targetUserId: userId, targetEmail: user.email, reason },
    });

    return { success: true, user: updated, reason };
  }

  async updateUserRole(adminId: string, userId: string, role: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    let prismaRole: Role = Role.TRAINEE;
    if (role.toLowerCase() === 'trainer') prismaRole = Role.TRAINER;
    if (role.toLowerCase() === 'admin') prismaRole = Role.ADMIN;

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { role: prismaRole },
    });

    await this.auditService.logEvent({
      userId: adminId,
      eventType: AuditEventType.SESSION_REVOCATION,
      metadata: { action: 'USER_ROLE_CHANGED', targetUserId: userId, newRole: prismaRole },
    });

    return { success: true, user: updated };
  }

  // ---------------------------------------------------------------------------
  // 3. COURSES MANAGEMENT CRUD
  // ---------------------------------------------------------------------------
  async getCourses() {
    const courses = await this.prisma.course.findMany({
      include: {
        category: true,
        trainers: { include: { user: true } },
        enrollments: true,
        modules: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return courses.map((c) => {
      const primaryTrainer = c.trainers[0]?.user?.fullName || 'Senior Instructor';
      const enrolledCount = c.enrollments.length;
      const completedCount = c.enrollments.filter((e) => e.completionPercentage >= 100).length;
      const completionRate = enrolledCount > 0 ? Math.round((completedCount / enrolledCount) * 100) : 0;

      const initials = c.title
        .split(' ')
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase() || 'CT';
      const colors = [
        'bg-amber-100 text-amber-800',
        'bg-purple-100 text-purple-800',
        'bg-blue-100 text-blue-800',
        'bg-rose-100 text-rose-800',
        'bg-indigo-100 text-indigo-800',
        'bg-emerald-100 text-emerald-800',
      ];
      const avatarBg = colors[Math.abs(c.id.charCodeAt(0)) % colors.length];

      return {
        id: c.id,
        code: c.code,
        title: c.title,
        category: c.category?.name || 'General',
        trainer: primaryTrainer,
        enrolled: enrolledCount,
        completed: completedCount,
        completion: completionRate,
        deadline: c.deadline || 'No deadline',
        status: c.status === CourseStatus.ACTIVE ? 'Active' : 'Inactive',
        initials,
        avatarBg,
      };
    });
  }

  async createCourse(authorId: string, data: any) {
    let category = await this.prisma.courseCategory.findFirst({
      where: data.category ? { name: data.category } : undefined,
    });
    if (!category) {
      category = await this.prisma.courseCategory.findFirst();
    }
    if (!category) {
      category = await this.prisma.courseCategory.create({
        data: {
          name: data.category || 'General Meteorology',
          code: 'MET-GEN',
        },
      });
    }

    let level: CourseLevel = CourseLevel.INTERMEDIATE;
    if (data.level) {
      const up = data.level.toUpperCase();
      if (up === 'BEGINNER') level = CourseLevel.BEGINNER;
      if (up === 'ADVANCED') level = CourseLevel.ADVANCED;
    }

    const code = data.code || `MET-${Math.floor(100 + Math.random() * 900)}`;
    const created = await this.prisma.course.create({
      data: {
        code,
        title: data.title || 'New Meteorology Course',
        description: data.description || 'Comprehensive training module.',
        categoryId: category.id,
        authorId: authorId,
        institution: 'India Meteorological Department',
        level,
        duration: data.duration || '4 Weeks',
        status: data.status === 'Inactive' ? CourseStatus.INACTIVE : CourseStatus.ACTIVE,
        deadline: data.deadline || '30 Dec 2026',
      },
      include: {
        category: true,
      },
    });

    return { success: true, course: created };
  }

  async deleteCourse(id: string) {
    const course = await this.prisma.course.findUnique({ where: { id } });
    if (!course) throw new NotFoundException('Course not found');

    await this.prisma.courseTrainer.deleteMany({ where: { courseId: id } });
    await this.prisma.courseEnrollment.deleteMany({ where: { courseId: id } });
    await this.prisma.course.delete({ where: { id } });

    return { success: true, id };
  }

  async updateCourse(id: string, data: any) {
    const course = await this.prisma.course.findUnique({ where: { id } });
    if (!course) throw new NotFoundException('Course not found');

    let status = course.status;
    if (data.status === 'Active') status = CourseStatus.ACTIVE;
    if (data.status === 'Inactive') status = CourseStatus.INACTIVE;

    const updated = await this.prisma.course.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.status !== undefined ? { status } : {}),
        ...(data.deadline !== undefined ? { deadline: data.deadline } : {}),
      },
    });

    return { success: true, course: updated };
  }

  // ---------------------------------------------------------------------------
  // 4. TRAINERS & TRAINEES ROSTERS
  // ---------------------------------------------------------------------------
  async getTrainers() {
    const trainers = await this.prisma.user.findMany({
      where: { role: Role.TRAINER },
      include: {
        trainerProfile: true,
        assignedCourses: {
          include: {
            course: {
              include: { enrollments: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return trainers.map((t) => {
      const parts = t.fullName.split(' ');
      const initials = (parts[0]?.[0] || 'T') + (parts[1]?.[0] || 'R');
      const coursesCount = t.assignedCourses.length;

      const uniqueTraineeIds = new Set<string>();
      t.assignedCourses.forEach((ac) => {
        ac.course.enrollments.forEach((e) => uniqueTraineeIds.add(e.userId));
      });

      const lastActiveDate = t.lastLoginAt || t.updatedAt;
      const lastActiveStr = lastActiveDate
        ? new Date(lastActiveDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
        : 'Active';

      const colors = [
        'bg-amber-100 text-amber-800',
        'bg-purple-100 text-purple-800',
        'bg-blue-100 text-blue-800',
        'bg-rose-100 text-rose-800',
        'bg-emerald-100 text-emerald-800',
      ];
      const avatarBg = colors[Math.abs(t.id.charCodeAt(0)) % colors.length];

      return {
        id: t.id,
        name: t.fullName,
        email: t.email,
        expertise: t.trainerProfile?.specialization || 'Meteorological Science',
        division: t.trainerProfile?.division || 'General Division',
        coursesCount,
        traineesCount: uniqueTraineeIds.size,
        lastActive: lastActiveStr,
        status: t.accountStatus === AccountStatus.ACTIVE ? 'Active' : 'Inactive',
        initials,
        avatarBg,
      };
    });
  }

  async updateTrainer(id: string, data: any) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Trainer not found');

    if (data.status !== undefined) {
      await this.prisma.user.update({
        where: { id },
        data: {
          accountStatus: data.status === 'Active' ? AccountStatus.ACTIVE : AccountStatus.SUSPENDED,
        },
      });
    }

    if (data.division !== undefined || data.expertise !== undefined) {
      await this.prisma.trainerProfile.upsert({
        where: { userId: id },
        create: {
          userId: id,
          division: data.division,
          specialization: data.expertise,
          roleTitle: 'Trainer / Specialist',
        },
        update: {
          ...(data.division !== undefined ? { division: data.division } : {}),
          ...(data.expertise !== undefined ? { specialization: data.expertise } : {}),
        },
      });
    }

    return { success: true };
  }

  async getTrainees() {
    const trainees = await this.prisma.user.findMany({
      where: { role: Role.TRAINEE },
      include: {
        traineeProfile: true,
        enrollments: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return trainees.map((tr) => {
      const parts = tr.fullName.split(' ');
      const initials = (parts[0]?.[0] || 'T') + (parts[1]?.[0] || 'N');
      const enrolledCoursesCount = tr.enrollments.length;
      const avgProgress =
        tr.enrollments.length > 0
          ? Math.round(tr.enrollments.reduce((sum, e) => sum + e.completionPercentage, 0) / tr.enrollments.length)
          : 0;

      const lastActiveDate = tr.lastLoginAt || tr.updatedAt;
      const lastActiveStr = lastActiveDate
        ? new Date(lastActiveDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
        : 'Active';

      const colors = [
        'bg-blue-100 text-blue-800',
        'bg-emerald-100 text-emerald-800',
        'bg-indigo-100 text-indigo-800',
        'bg-violet-100 text-violet-800',
        'bg-amber-100 text-amber-800',
      ];
      const avatarBg = colors[Math.abs(tr.id.charCodeAt(0)) % colors.length];

      return {
        id: tr.id,
        name: tr.fullName,
        email: tr.email,
        division: tr.traineeProfile?.stationOffice || tr.organization || 'Regional Met Centre',
        enrolledCount: enrolledCoursesCount,
        avgProgress,
        lastActive: lastActiveStr,
        status: tr.accountStatus === AccountStatus.ACTIVE ? 'Active' : 'Inactive',
        initials,
        avatarBg,
      };
    });
  }

  async updateTrainee(id: string, data: any) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Trainee not found');

    if (data.status !== undefined) {
      await this.prisma.user.update({
        where: { id },
        data: {
          accountStatus: data.status === 'Active' ? AccountStatus.ACTIVE : AccountStatus.SUSPENDED,
        },
      });
    }

    if (data.division !== undefined) {
      await this.prisma.traineeProfile.upsert({
        where: { userId: id },
        create: {
          userId: id,
          stationOffice: data.division,
          designation: 'Meteorological Staff',
        },
        update: {
          stationOffice: data.division,
        },
      });
    }

    return { success: true };
  }

  // ---------------------------------------------------------------------------
  // 5. COMPETENCIES MATRIX
  // ---------------------------------------------------------------------------
  async getCompetencies() {
    const comps = await this.prisma.competency.findMany({
      include: {
        scores: true,
      },
    });

    return comps.map((c, idx) => {
      const avgScore = c.scores.length > 0
        ? Math.round(c.scores.reduce((sum, s) => sum + s.score, 0) / c.scores.length)
        : 70;

      const targetScore = c.scores.length > 0 && c.scores[0].targetScore
        ? Math.round(c.scores[0].targetScore)
        : 80;

      const diff = avgScore - targetScore;
      const changeStr = diff >= 0 ? `+${diff}%` : `${diff}%`;

      return {
        id: c.id,
        subject: c.name,
        score: avgScore,
        change: changeStr,
        isPositive: diff >= 0,
        level: avgScore,
        targetScore,
        category: c.category,
        ring: {
          r: 28 + idx * 8,
          val: avgScore,
          color: c.color || '#1f5eff',
        },
      };
    });
  }

  async createCompetency(data: any) {
    const created = await this.prisma.competency.create({
      data: {
        name: data.name || data.subject,
        category: data.category || 'General',
        color: data.color || '#1f5eff',
        description: data.description || null,
      },
    });

    if (data.targetScore || data.score) {
      const trainees = await this.prisma.user.findMany({ where: { role: Role.TRAINEE } });
      if (trainees.length > 0) {
        await this.prisma.userCompetencyScore.createMany({
          data: trainees.map((tr) => ({
            userId: tr.id,
            competencyId: created.id,
            score: Number(data.score) || 75,
            targetScore: Number(data.targetScore) || 85,
          })),
        });
      }
    }

    return { success: true, competency: created };
  }

  async updateCompetency(id: string, data: any) {
    const comp = await this.prisma.competency.findUnique({ where: { id } });
    if (!comp) throw new NotFoundException('Competency not found');

    const updated = await this.prisma.competency.update({
      where: { id },
      data: {
        ...(data.subject !== undefined || data.name !== undefined ? { name: data.subject || data.name } : {}),
        ...(data.category !== undefined ? { category: data.category } : {}),
        ...(data.color !== undefined ? { color: data.color } : {}),
      },
    });

    if (data.score !== undefined || data.targetScore !== undefined) {
      await this.prisma.userCompetencyScore.updateMany({
        where: { competencyId: id },
        data: {
          ...(data.score !== undefined ? { score: Number(data.score) } : {}),
          ...(data.targetScore !== undefined ? { targetScore: Number(data.targetScore) } : {}),
        },
      });
    }

    return { success: true, competency: updated };
  }

  async deleteCompetency(id: string) {
    const comp = await this.prisma.competency.findUnique({ where: { id } });
    if (!comp) throw new NotFoundException('Competency not found');

    await this.prisma.userCompetencyScore.deleteMany({ where: { competencyId: id } });
    await this.prisma.competency.delete({ where: { id } });

    return { success: true, id };
  }

  // ---------------------------------------------------------------------------
  // 5b. DIVISIONS CRUD
  // ---------------------------------------------------------------------------
  async createDivision(data: any) {
    let org = await this.prisma.organization.findFirst();
    if (!org) {
      org = await this.prisma.organization.create({
        data: {
          name: 'India Meteorological Department (MoES)',
          code: 'IMD',
        },
      });
    }

    const created = await this.prisma.division.create({
      data: {
        organizationId: org.id,
        name: data.name,
        zone: data.zone || 'National',
        color: data.color || '#1f5eff',
      },
    });

    return { success: true, division: created };
  }

  // ---------------------------------------------------------------------------
  // 6. PORTAL SETTINGS
  // ---------------------------------------------------------------------------
  async getSettings() {
    let settings = await this.prisma.portalSettings.findFirst();
    if (!settings) {
      settings = await this.prisma.portalSettings.create({
        data: {
          portalName: 'Capacity Connect - India Meteorological Department',
          defaultLanguage: 'English',
          timeZone: 'Asia/Kolkata',
          supportEmail: 'support.capacity@imd.gov.in',
          requireAdminApproval: true,
          restrictOrgEmails: true,
          detectTabSwitching: true,
          allowRetakes: true,
          sendDeadlineReminders: true,
        },
      });
    }

    return {
      portalName: settings.portalName,
      defaultLanguage: settings.defaultLanguage,
      timeZone: settings.timeZone,
      supportEmail: settings.supportEmail,
      requireAdminApproval: settings.requireAdminApproval,
      restrictOrgEmails: settings.restrictOrgEmails,
      detectTabSwitching: settings.detectTabSwitching,
      allowRetakes: settings.allowRetakes,
      sendDeadlineReminders: settings.sendDeadlineReminders,
    };
  }

  async updateSettings(data: any) {
    let settings = await this.prisma.portalSettings.findFirst();
    if (!settings) {
      settings = await this.prisma.portalSettings.create({ data });
    } else {
      settings = await this.prisma.portalSettings.update({
        where: { id: settings.id },
        data: {
          ...(data.portalName !== undefined ? { portalName: data.portalName } : {}),
          ...(data.defaultLanguage !== undefined ? { defaultLanguage: data.defaultLanguage } : {}),
          ...(data.timeZone !== undefined ? { timeZone: data.timeZone } : {}),
          ...(data.supportEmail !== undefined ? { supportEmail: data.supportEmail } : {}),
          ...(data.requireAdminApproval !== undefined ? { requireAdminApproval: Boolean(data.requireAdminApproval) } : {}),
          ...(data.restrictOrgEmails !== undefined ? { restrictOrgEmails: Boolean(data.restrictOrgEmails) } : {}),
          ...(data.detectTabSwitching !== undefined ? { detectTabSwitching: Boolean(data.detectTabSwitching) } : {}),
          ...(data.allowRetakes !== undefined ? { allowRetakes: Boolean(data.allowRetakes) } : {}),
          ...(data.sendDeadlineReminders !== undefined ? { sendDeadlineReminders: Boolean(data.sendDeadlineReminders) } : {}),
        },
      });
    }

    return { success: true, settings };
  }

  // ---------------------------------------------------------------------------
  // 7. DASHBOARD & ANALYTICS DATA
  // ---------------------------------------------------------------------------
  async getDashboardData() {
    const totalUsers = await this.prisma.user.count();
    const totalTrainers = await this.prisma.user.count({ where: { role: Role.TRAINER } });
    const totalTrainees = await this.prisma.user.count({ where: { role: Role.TRAINEE } });
    const pendingCount = await this.prisma.user.count({ where: { accountStatus: AccountStatus.PENDING_APPROVAL } });
    const activeCoursesCount = await this.prisma.course.count({ where: { status: CourseStatus.ACTIVE } });
    const divisions = await this.prisma.division.findMany({ include: { userProfiles: true } });

    const divisionStats = divisions.map((d) => {
      const userCount = d.userProfiles.length;
      return {
        id: d.id,
        name: d.name,
        count: userCount,
        change: userCount > 0 ? `+${userCount}` : '0',
        isPositive: userCount > 0,
        color: d.color || '#1f5eff',
      };
    });

    // Derive monthly enrollments dynamically from database course enrollments
    const enrollments = await this.prisma.courseEnrollment.findMany({
      select: {
        enrolledAt: true,
        completionPercentage: true,
      },
    });

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonthIdx = new Date().getMonth();
    // Build last 6 months
    const last6MonthIndices: number[] = [];
    for (let i = 5; i >= 0; i--) {
      last6MonthIndices.push((currentMonthIdx - i + 12) % 12);
    }

    const monthlyEnrollments = last6MonthIndices.map((mIdx) => {
      const monthEnrollments = enrollments.filter((e) => new Date(e.enrolledAt).getMonth() === mIdx);
      const enrolled = monthEnrollments.length;
      const completed = monthEnrollments.filter((e) => e.completionPercentage >= 100).length;
      return {
        month: monthNames[mIdx],
        enrolled,
        completed,
      };
    });

    return {
      totalUsers,
      totalTrainers,
      totalTrainees,
      pendingCount,
      activeCoursesCount,
      divisionStats,
      monthlyEnrollments,
    };
  }
}
