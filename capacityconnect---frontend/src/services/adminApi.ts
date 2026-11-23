import { authFetch } from './authApi';
import {
  AnnouncementItem,
  CourseItem,
  PendingApprovalItem,
  PortalSettings,
  RejectedUserRecord,
  TraineeItem,
  TrainerItem,
  UserDirectoryItem,
} from '../types';
import { MonthData, DivisionItem, CompetencyGaugeItem } from '../context/UnifiedDataContext';

export interface DashboardMetricsResponse {
  totalUsers: number;
  totalTrainers: number;
  totalTrainees: number;
  pendingCount: number;
  activeCoursesCount: number;
  divisionStats: DivisionItem[];
  monthlyEnrollments: MonthData[];
}

export const adminApi = {
  // 1. Announcements CRUD
  async getAnnouncements(): Promise<AnnouncementItem[]> {
    const res = await authFetch<AnnouncementItem[]>('/admin/announcements');
    return res.data || [];
  },

  async createAnnouncement(data: Partial<AnnouncementItem>): Promise<AnnouncementItem> {
    const res = await authFetch<AnnouncementItem>('/admin/announcements', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data!;
  },

  async updateAnnouncement(id: string, data: Partial<AnnouncementItem>): Promise<AnnouncementItem> {
    const res = await authFetch<AnnouncementItem>(`/admin/announcements/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return res.data!;
  },

  async deleteAnnouncement(id: string): Promise<{ success: boolean; id: string }> {
    const res = await authFetch<{ success: boolean; id: string }>(`/admin/announcements/${id}`, {
      method: 'DELETE',
    });
    return res.data || { success: true, id };
  },

  // 2. User Governance & Approvals
  async getPendingApprovals(): Promise<PendingApprovalItem[]> {
    const res = await authFetch<PendingApprovalItem[]>('/admin/users/pending');
    return res.data || [];
  },

  async getRejectedUsers(): Promise<RejectedUserRecord[]> {
    const res = await authFetch<RejectedUserRecord[]>('/admin/users/rejected');
    return res.data || [];
  },

  async getUserDirectory(): Promise<UserDirectoryItem[]> {
    const res = await authFetch<UserDirectoryItem[]>('/admin/users/directory');
    return res.data || [];
  },

  async approveUser(userId: string): Promise<any> {
    return authFetch(`/admin/users/${userId}/approve`, {
      method: 'PATCH',
    });
  },

  async rejectUser(userId: string, reason?: string): Promise<any> {
    return authFetch(`/admin/users/${userId}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    });
  },

  async updateUserRole(userId: string, role: string): Promise<any> {
    return authFetch(`/admin/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  },

  // 3. Courses Management
  async getCourses(): Promise<CourseItem[]> {
    const res = await authFetch<CourseItem[]>('/admin/courses');
    return res.data || [];
  },

  async createCourse(data: Partial<CourseItem>): Promise<any> {
    return authFetch('/admin/courses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateCourse(id: string, data: Partial<CourseItem>): Promise<any> {
    return authFetch(`/admin/courses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async deleteCourse(id: string): Promise<any> {
    return authFetch(`/admin/courses/${id}`, {
      method: 'DELETE',
    });
  },

  // 4. Trainers & Trainees Rosters
  async getTrainers(): Promise<TrainerItem[]> {
    const res = await authFetch<TrainerItem[]>('/admin/trainers');
    return res.data || [];
  },

  async updateTrainer(id: string, data: Partial<TrainerItem>): Promise<any> {
    return authFetch(`/admin/trainers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async getTrainees(): Promise<TraineeItem[]> {
    const res = await authFetch<TraineeItem[]>('/admin/trainees');
    return res.data || [];
  },

  async updateTrainee(id: string, data: Partial<TraineeItem>): Promise<any> {
    return authFetch(`/admin/trainees/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  // 5. Competencies Matrix
  async getCompetencies(): Promise<CompetencyGaugeItem[]> {
    const res = await authFetch<CompetencyGaugeItem[]>('/admin/competencies');
    return res.data || [];
  },

  async createCompetency(data: Partial<CompetencyGaugeItem>): Promise<any> {
    return authFetch('/admin/competencies', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateCompetency(id: string, data: Partial<CompetencyGaugeItem>): Promise<any> {
    return authFetch(`/admin/competencies/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async deleteCompetency(id: string): Promise<any> {
    return authFetch(`/admin/competencies/${id}`, {
      method: 'DELETE',
    });
  },

  // 5b. Divisions
  async createDivision(data: Partial<DivisionItem>): Promise<any> {
    return authFetch('/admin/divisions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // 6. Portal Settings
  async getSettings(): Promise<PortalSettings> {
    const res = await authFetch<PortalSettings>('/admin/settings');
    return res.data!;
  },

  async updateSettings(data: Partial<PortalSettings>): Promise<PortalSettings> {
    const res = await authFetch<PortalSettings>('/admin/settings', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return res.data!;
  },

  // 7. Dashboard & Analytics
  async getDashboardMetrics(): Promise<DashboardMetricsResponse> {
    const res = await authFetch<DashboardMetricsResponse>('/admin/dashboard/metrics');
    return res.data!;
  },
};
