import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { Role, CourseStatus, AccountStatus } from '@prisma/client';

@Injectable()
export class AdminAiQueryService {
  private readonly logger = new Logger(AdminAiQueryService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getPortalOverview() {
    const totalUsers = await this.prisma.user.count();
    const totalTrainers = await this.prisma.user.count({ where: { role: Role.TRAINER } });
    const totalTrainees = await this.prisma.user.count({ where: { role: Role.TRAINEE } });
    const pendingApprovals = await this.prisma.user.count({ where: { accountStatus: AccountStatus.PENDING_APPROVAL } });
    const activeCourses = await this.prisma.course.count({ where: { status: CourseStatus.ACTIVE } });
    const totalEnrollments = await this.prisma.courseEnrollment.count();
    const totalCertificates = await this.prisma.certificate.count();

    return {
      totalUsers,
      totalTrainers,
      totalTrainees,
      pendingApprovals,
      activeCourses,
      totalEnrollments,
      totalCertificates,
    };
  }

  async getTrainerStatistics() {
    const trainers = await this.prisma.user.findMany({
      where: { role: Role.TRAINER },
      include: {
        trainerProfile: true,
        assignedCourses: {
          include: {
            course: {
              include: {
                enrollments: true,
              },
            },
          },
        },
      },
    });

    const trainerList = trainers.map((t) => {
      const coursesCount = t.assignedCourses.length;
      let totalAssignedTrainees = 0;
      t.assignedCourses.forEach((ac) => {
        totalAssignedTrainees += ac.course.enrollments.length;
      });

      return {
        id: t.id,
        name: t.fullName,
        email: t.email,
        specialization: t.trainerProfile?.specialization || 'Meteorology & Operations',
        coursesCount,
        traineesCount: totalAssignedTrainees,
        status: t.accountStatus,
      };
    });

    // Sort descending by trainee count
    trainerList.sort((a, b) => b.traineesCount - a.traineesCount);

    return {
      totalTrainers: trainerList.length,
      trainers: trainerList,
      topTrainersByTrainees: trainerList.slice(0, 5),
    };
  }

  async getTraineeStatistics() {
    const totalTrainees = await this.prisma.user.count({ where: { role: Role.TRAINEE } });
    const activeTrainees = await this.prisma.user.count({
      where: { role: Role.TRAINEE, accountStatus: AccountStatus.ACTIVE },
    });

    const enrollments = await this.prisma.courseEnrollment.findMany({
      select: { completionPercentage: true },
    });
    const avgProgress = enrollments.length > 0
      ? Math.round(enrollments.reduce((sum, e) => sum + e.completionPercentage, 0) / enrollments.length)
      : 0;

    return {
      totalTrainees,
      activeTrainees,
      totalCourseEnrollments: enrollments.length,
      avgProgressPercent: avgProgress,
    };
  }

  async getCourseStatistics() {
    const courses = await this.prisma.course.findMany({
      include: {
        enrollments: true,
        category: true,
      },
    });

    const courseStats = courses.map((c) => {
      const enrolled = c.enrollments.length;
      const completed = c.enrollments.filter((e) => e.completionPercentage >= 100).length;
      const completionRate = enrolled > 0 ? Math.round((completed / enrolled) * 100) : 0;

      return {
        id: c.id,
        code: c.code,
        title: c.title,
        category: c.category.name,
        enrolled,
        completed,
        completionRate,
        status: c.status,
      };
    });

    // Sort lowest completion first
    const lowestCompletion = [...courseStats].sort((a, b) => a.completionRate - b.completionRate);

    return {
      totalCourses: courses.length,
      courses: courseStats,
      lowestCompletionCourses: lowestCompletion.slice(0, 5),
    };
  }

  async getCompetencyStatistics() {
    const comps = await this.prisma.competency.findMany({
      include: {
        scores: true,
      },
    });

    const stats = comps.map((c) => {
      const avgScore = c.scores.length > 0
        ? Math.round(c.scores.reduce((sum, s) => sum + s.score, 0) / c.scores.length)
        : null;
      const targetScore = c.scores.length > 0 ? Math.round(c.scores[0].targetScore) : 80;
      const skillGap = avgScore !== null ? Math.max(0, targetScore - avgScore) : null;

      return {
        id: c.id,
        subject: c.name,
        category: c.category,
        avgScore,
        targetScore,
        skillGap,
        hasSkillGap: skillGap !== null && skillGap > 0,
      };
    });

    const criticalGaps = stats.filter((s) => s.hasSkillGap).sort((a, b) => (b.skillGap || 0) - (a.skillGap || 0));

    return {
      totalCompetencies: comps.length,
      competencies: stats,
      criticalSkillGaps: criticalGaps,
    };
  }

  async getDivisionStatistics() {
    const divisions = await this.prisma.division.findMany({
      include: {
        userProfiles: true,
      },
    });

    const list = divisions.map((d) => ({
      id: d.id,
      name: d.name,
      zone: d.zone || 'Central',
      traineesCount: d.userProfiles.length,
    })).sort((a, b) => b.traineesCount - a.traineesCount);

    return {
      totalDivisions: divisions.length,
      divisions: list,
    };
  }

  async getMonthlyEnrollmentTrend() {
    const enrollments = await this.prisma.courseEnrollment.findMany({
      select: { enrolledAt: true, completionPercentage: true },
    });

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const result = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      const monthItems = enrollments.filter((e) => {
        const itemDate = new Date(e.enrolledAt);
        return itemDate.getFullYear() === y && itemDate.getMonth() === m;
      });
      result.push({
        month: monthNames[m],
        enrolled: monthItems.length,
        completed: monthItems.filter((e) => e.completionPercentage >= 100).length,
      });
    }

    return result;
  }
}
