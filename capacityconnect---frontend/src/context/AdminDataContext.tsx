import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { adminApi, DashboardMetricsResponse } from '../services/adminApi';
import { getAccessToken } from '../services/authApi';
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
import { MonthData, DivisionItem, CompetencyGaugeItem, SubjectScoreItem } from './UnifiedDataContext';

interface AdminDataContextType {
  announcements: AnnouncementItem[];
  addAnnouncement: (item: Omit<AnnouncementItem, 'id'>) => Promise<void>;
  updateAnnouncement: (id: string, updates: Partial<AnnouncementItem>) => Promise<void>;
  deleteAnnouncement: (id: string) => Promise<void>;
  selectedAnnouncementId: string;
  setSelectedAnnouncementId: (id: string) => void;
  pinnedAnnouncement: AnnouncementItem | undefined;

  pendingApprovals: PendingApprovalItem[];
  approveUser: (id: string) => Promise<void>;
  rejectUser: (id: string, reason?: string) => Promise<void>;
  rejectedRecords: RejectedUserRecord[];

  userDirectory: UserDirectoryItem[];
  updateUserRole: (id: string, role: 'Trainer' | 'Trainee' | 'Admin') => Promise<void>;

  trainers: TrainerItem[];
  updateTrainer: (id: string, updates: Partial<TrainerItem>) => Promise<void>;
  trainees: TraineeItem[];
  updateTrainee: (id: string, updates: Partial<TraineeItem>) => Promise<void>;
  courses: CourseItem[];
  createCourse: (data: Partial<CourseItem>) => Promise<void>;
  updateCourse: (id: string, updates: Partial<CourseItem>) => Promise<void>;
  deleteCourse: (id: string) => Promise<void>;

  // Real Application Data for Graphs
  monthlyEnrollments: MonthData[];
  divisions: DivisionItem[];
  addDivision: (division: Omit<DivisionItem, 'id'>) => Promise<void>;
  competencyGauge: CompetencyGaugeItem[];
  createCompetency: (data: Partial<CompetencyGaugeItem>) => Promise<void>;
  updateCompetency: (id: string, updates: Partial<CompetencyGaugeItem>) => Promise<void>;
  deleteCompetency: (id: string) => Promise<void>;
  subjectScores: SubjectScoreItem[];

  settings: PortalSettings;
  updateSettings: (updates: Partial<PortalSettings>) => Promise<void>;

  isChatbotOpen: boolean;
  setIsChatbotOpen: (open: boolean) => void;

  refreshAllData: () => Promise<void>;
  isLoading: boolean;
}

const defaultSettings: PortalSettings = {
  portalName: 'Capacity Connect - India Meteorological Department',
  defaultLanguage: 'English',
  timeZone: 'Asia/Kolkata',
  supportEmail: 'support.capacity@imd.gov.in',
  requireAdminApproval: true,
  restrictOrgEmails: true,
  detectTabSwitching: true,
  allowRetakes: true,
  sendDeadlineReminders: true,
};

const AdminDataContext = createContext<AdminDataContextType | undefined>(undefined);

export const AdminDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [selectedAnnouncementId, setSelectedAnnouncementId] = useState<string>('');
  const [pendingApprovals, setPendingApprovals] = useState<PendingApprovalItem[]>([]);
  const [rejectedRecords, setRejectedRecords] = useState<RejectedUserRecord[]>([]);
  const [userDirectory, setUserDirectory] = useState<UserDirectoryItem[]>([]);
  const [trainers, setTrainers] = useState<TrainerItem[]>([]);
  const [trainees, setTrainees] = useState<TraineeItem[]>([]);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [competencyGauge, setCompetencyGauge] = useState<CompetencyGaugeItem[]>([]);
  const [divisions, setDivisions] = useState<DivisionItem[]>([]);
  const [monthlyEnrollments, setMonthlyEnrollments] = useState<MonthData[]>([]);
  const [settings, setSettings] = useState<PortalSettings>(defaultSettings);
  const [isChatbotOpen, setIsChatbotOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const isFetchingRef = useRef(false);

  // Subject scores dynamically derived from real competencies
  const subjectScores: SubjectScoreItem[] = competencyGauge.map((c) => ({
    subject: c.subject,
    score: c.level || 75,
  }));

  const pinnedAnnouncement = announcements.find((a) => a.isPinned) || announcements[0];

  // Primary data synchronization function with backend Prisma database
  const refreshAllData = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      const token = getAccessToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      const results = await Promise.allSettled([
        adminApi.getAnnouncements(),
        adminApi.getPendingApprovals(),
        adminApi.getRejectedUsers(),
        adminApi.getUserDirectory(),
        adminApi.getTrainers(),
        adminApi.getTrainees(),
        adminApi.getCourses(),
        adminApi.getCompetencies(),
        adminApi.getSettings(),
        adminApi.getDashboardMetrics(),
      ]);

      const [
        annList,
        pendingList,
        rejectedList,
        dirList,
        trainersList,
        traineesList,
        coursesList,
        compList,
        settingsData,
        metricsData,
      ] = results;

      const endpointNames = [
        'announcements',
        'pendingApprovals',
        'rejectedUsers',
        'userDirectory',
        'trainers',
        'trainees',
        'courses',
        'competencies',
        'settings',
        'dashboardMetrics',
      ];

      results.forEach((res, i) => {
        if (res.status === 'rejected') {
          console.error(`[AdminDataContext] Error syncing ${endpointNames[i]}:`, res.reason);
        }
      });

      if (annList.status === 'fulfilled' && annList.value) {
        setAnnouncements(annList.value);
        setSelectedAnnouncementId((prev) => {
          if (prev) return prev;
          const pinned = annList.value.find((a) => a.isPinned);
          return pinned ? pinned.id : annList.value[0]?.id || '';
        });
      }

      if (pendingList.status === 'fulfilled' && pendingList.value) {
        setPendingApprovals(pendingList.value);
      }

      if (rejectedList.status === 'fulfilled' && rejectedList.value) {
        setRejectedRecords(rejectedList.value);
      }

      if (dirList.status === 'fulfilled' && dirList.value) {
        setUserDirectory(dirList.value);
      }

      if (trainersList.status === 'fulfilled' && trainersList.value) {
        setTrainers(trainersList.value);
      }

      if (traineesList.status === 'fulfilled' && traineesList.value) {
        setTrainees(traineesList.value);
      }

      if (coursesList.status === 'fulfilled' && coursesList.value) {
        setCourses(coursesList.value);
      }

      if (compList.status === 'fulfilled' && compList.value) {
        setCompetencyGauge(compList.value);
      }

      if (settingsData.status === 'fulfilled' && settingsData.value) {
        setSettings(settingsData.value);
      }

      if (metricsData.status === 'fulfilled' && metricsData.value) {
        const m = metricsData.value as DashboardMetricsResponse;
        if (m.divisionStats) setDivisions(m.divisionStats);
        if (m.monthlyEnrollments) setMonthlyEnrollments(m.monthlyEnrollments);
      }
    } catch (err) {
      console.error('[AdminDataContext] Failed to refresh admin portal data from DB:', err);
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  // Initial load on mount
  useEffect(() => {
    refreshAllData();
  }, [refreshAllData]);

  // Dynamic DB polling: revalidate every 5 seconds & on window focus so external DB changes reflect immediately
  useEffect(() => {
    const interval = setInterval(() => {
      if (getAccessToken()) {
        refreshAllData();
      }
    }, 5000);

    const handleFocus = () => {
      if (getAccessToken()) {
        refreshAllData();
      }
    };

    const handleSessionExpired = () => {
      setIsLoading(false);
      isFetchingRef.current = false;
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('cc_session_expired', handleSessionExpired);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('cc_session_expired', handleSessionExpired);
    };
  }, [refreshAllData]);

  // 1. Announcements CRUD with immediate database persistence
  const addAnnouncement = async (item: Omit<AnnouncementItem, 'id'>) => {
    try {
      const created = await adminApi.createAnnouncement(item);
      setSelectedAnnouncementId(created.id);
      await refreshAllData();
    } catch (err) {
      console.error('Failed to create announcement:', err);
      throw err;
    }
  };

  const updateAnnouncement = async (id: string, updates: Partial<AnnouncementItem>) => {
    try {
      await adminApi.updateAnnouncement(id, updates);
      await refreshAllData();
    } catch (err) {
      console.error('Failed to update announcement:', err);
      throw err;
    }
  };

  const deleteAnnouncement = async (id: string) => {
    try {
      await adminApi.deleteAnnouncement(id);
      await refreshAllData();
    } catch (err) {
      console.error('Failed to delete announcement:', err);
      throw err;
    }
  };

  // 2. User Governance CRUD with immediate database persistence
  const approveUser = async (id: string) => {
    try {
      await adminApi.approveUser(id);
      await refreshAllData();
    } catch (err) {
      console.error('Failed to approve user:', err);
      throw err;
    }
  };

  const rejectUser = async (id: string, reason?: string) => {
    try {
      await adminApi.rejectUser(id, reason);
      await refreshAllData();
    } catch (err) {
      console.error('Failed to reject user:', err);
      throw err;
    }
  };

  const updateUserRole = async (id: string, newRole: 'Trainer' | 'Trainee' | 'Admin') => {
    try {
      await adminApi.updateUserRole(id, newRole);
      await refreshAllData();
    } catch (err) {
      console.error('Failed to update user role:', err);
      throw err;
    }
  };

  // 3. Courses CRUD
  const createCourse = async (data: Partial<CourseItem>) => {
    try {
      await adminApi.createCourse(data);
      await refreshAllData();
    } catch (err) {
      console.error('Failed to create course:', err);
      throw err;
    }
  };

  const updateCourse = async (id: string, updates: Partial<CourseItem>) => {
    try {
      await adminApi.updateCourse(id, updates);
      await refreshAllData();
    } catch (err) {
      console.error('Failed to update course:', err);
      throw err;
    }
  };

  const deleteCourse = async (id: string) => {
    try {
      await adminApi.deleteCourse(id);
      await refreshAllData();
    } catch (err) {
      console.error('Failed to delete course:', err);
      throw err;
    }
  };

  const updateTrainer = async (id: string, updates: Partial<TrainerItem>) => {
    try {
      await adminApi.updateTrainer(id, updates);
      await refreshAllData();
    } catch (err) {
      console.error('Failed to update trainer:', err);
      throw err;
    }
  };

  const updateTrainee = async (id: string, updates: Partial<TraineeItem>) => {
    try {
      await adminApi.updateTrainee(id, updates);
      await refreshAllData();
    } catch (err) {
      console.error('Failed to update trainee:', err);
      throw err;
    }
  };

  const addDivision = async (division: Omit<DivisionItem, 'id'>) => {
    try {
      await adminApi.createDivision(division);
      await refreshAllData();
    } catch (err) {
      console.error('Failed to create division:', err);
      throw err;
    }
  };

  const createCompetency = async (data: Partial<CompetencyGaugeItem>) => {
    try {
      await adminApi.createCompetency(data);
      await refreshAllData();
    } catch (err) {
      console.error('Failed to create competency:', err);
      throw err;
    }
  };

  const updateCompetency = async (id: string, updates: Partial<CompetencyGaugeItem>) => {
    try {
      await adminApi.updateCompetency(id, updates);
      await refreshAllData();
    } catch (err) {
      console.error('Failed to update competency:', err);
      throw err;
    }
  };

  const deleteCompetency = async (id: string) => {
    try {
      await adminApi.deleteCompetency(id);
      await refreshAllData();
    } catch (err) {
      console.error('Failed to delete competency:', err);
      throw err;
    }
  };

  // 4. Portal Settings CRUD
  const updateSettings = async (updates: Partial<PortalSettings>) => {
    try {
      const saved = await adminApi.updateSettings(updates);
      setSettings(saved);
      await refreshAllData();
    } catch (err) {
      console.error('Failed to save settings:', err);
      throw err;
    }
  };

  return (
    <AdminDataContext.Provider
      value={{
        announcements,
        addAnnouncement,
        updateAnnouncement,
        deleteAnnouncement,
        selectedAnnouncementId,
        setSelectedAnnouncementId,
        pinnedAnnouncement,

        pendingApprovals,
        approveUser,
        rejectUser,
        rejectedRecords,

        userDirectory,
        updateUserRole,

        trainers,
        updateTrainer,
        trainees,
        updateTrainee,
        courses,
        createCourse,
        updateCourse,
        deleteCourse,

        // Real Application Data for Graphs
        monthlyEnrollments,
        divisions,
        addDivision,
        competencyGauge,
        createCompetency,
        updateCompetency,
        deleteCompetency,
        subjectScores,

        settings,
        updateSettings,

        isChatbotOpen,
        setIsChatbotOpen,

        refreshAllData,
        isLoading,
      }}
    >
      {children}
    </AdminDataContext.Provider>
  );
};

export const useAdminData = () => {
  const context = useContext(AdminDataContext);
  if (!context) {
    throw new Error('useAdminData must be used within an AdminDataProvider');
  }
  return context;
};
