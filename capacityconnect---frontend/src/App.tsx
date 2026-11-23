import React, { useState, useEffect } from 'react';
import { Screen, AdminTab, TrainerTab, TraineeTab, UserAccount } from './types';
import { UnifiedDataProvider } from './context/UnifiedDataContext';
import { AdminDataProvider } from './context/AdminDataContext';
import { TrainerDataProvider } from './context/TrainerDataContext';
import { TraineeDataProvider } from './context/TraineeDataContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { SignInScreen } from './components/screens/SignInScreen';
import { SignUpScreen } from './components/screens/SignUpScreen';
import { VerifyOtpScreen } from './components/screens/VerifyOtpScreen';
import { ForgotPasswordScreen } from './components/screens/ForgotPasswordScreen';
import { CheckEmailScreen } from './components/screens/CheckEmailScreen';
import { ResetPasswordScreen } from './components/screens/ResetPasswordScreen';
import { PendingApprovalScreen } from './components/screens/PendingApprovalScreen';
import { AccessDeniedScreen } from './components/screens/AccessDeniedScreen';
import { EmailModal } from './components/EmailModal';
import { authApi } from './services/authApi';

// Admin Portal Pages
import { AdminLayout } from './components/admin/AdminLayout';
import { DashboardPage } from './components/admin/DashboardPage';
import { CoursesPage } from './components/admin/CoursesPage';
import { TrainersPage } from './components/admin/TrainersPage';
import { TraineesPage } from './components/admin/TraineesPage';
import { RoleManagementPage } from './components/admin/RoleManagementPage';
import { AnnouncementsPage } from './components/admin/AnnouncementsPage';
import { AnalyticsPage } from './components/admin/AnalyticsPage';
import { CompetencyPage } from './components/admin/CompetencyPage';
import { SettingsPage } from './components/admin/SettingsPage';

// Trainer Portal Pages (Dr. Ravi Menon)
import { TrainerLayout } from './components/trainer/TrainerLayout';
import { TrainerDashboardPage } from './components/trainer/TrainerDashboardPage';
import { TrainerCoursesPage } from './components/trainer/TrainerCoursesPage';
import { TrainerLibraryPage } from './components/trainer/TrainerLibraryPage';
import { TrainerAssessmentsPage } from './components/trainer/TrainerAssessmentsPage';
import { TrainerTraineesPage } from './components/trainer/TrainerTraineesPage';
import { TrainerFeedbackPage } from './components/trainer/TrainerFeedbackPage';
import { TrainerProfilePage } from './components/trainer/TrainerProfilePage';
import { TrainerNotificationsPage } from './components/trainer/TrainerNotificationsPage';

// Trainee Portal Pages (Asha Verma)
import { TraineeLayout } from './components/trainee/TraineeLayout';
import { TraineeDashboardPage } from './components/trainee/TraineeDashboardPage';
import { TraineeCourseCatalogPage } from './components/trainee/TraineeCourseCatalogPage';
import { TraineeCourseDetailPage } from './components/trainee/TraineeCourseDetailPage';
import { TraineeMyCoursesPage } from './components/trainee/TraineeMyCoursesPage';
import { TraineeCoursePlayerPage } from './components/trainee/TraineeCoursePlayerPage';
import { TraineeCourseFeedbackPage } from './components/trainee/TraineeCourseFeedbackPage';
import { TraineeAssessmentsPage } from './components/trainee/TraineeAssessmentsPage';
import { TraineeTakeAssessmentPage } from './components/trainee/TraineeTakeAssessmentPage';
import { TraineeAssessmentResultPage } from './components/trainee/TraineeAssessmentResultPage';
import { TraineeCompetencyPage } from './components/trainee/TraineeCompetencyPage';
import { TraineeMentorsPage } from './components/trainee/TraineeMentorsPage';
import { TraineeNotificationsPage } from './components/trainee/TraineeNotificationsPage';
import { TraineeProfilePage } from './components/trainee/TraineeProfilePage';
import { TraineeCertificatesPage } from './components/trainee/TraineeCertificatesPage';
import { TraineeLibraryPage } from './components/trainee/TraineeLibraryPage';
import { TraineeSetupModal } from './components/trainee/TraineeSetupModal';

import { Check, X, CloudSun } from 'lucide-react';

export default function App() {
  // Synchronize initial screen with URL pathname / query parameter (e.g. reset-password link from email)
  const getInitialScreen = (): Screen => {
    const rawPath = window.location.pathname.replace(/^\//, '').split('/')[0];
    const search = window.location.search;
    if (rawPath === 'reset-password' || search.includes('token=')) {
      return 'reset-password';
    }
    if (rawPath === 'verify-otp') {
      return 'verify-otp';
    }
    if (rawPath === 'signup') {
      return 'signup';
    }
    if (rawPath === 'forgot-password') {
      return 'forgot-password';
    }
    if (rawPath === 'check-email') {
      return 'check-email';
    }

    const validScreens: Screen[] = [
      'admin-portal',
      'trainer-portal',
      'trainee-portal',
      'trainee-setup',
      'pending-approval',
      'access-denied',
      'trainee-take-assessment',
    ];
    if (validScreens.includes(rawPath as Screen)) {
      return rawPath as Screen;
    }

    const savedScreen = typeof window !== 'undefined' ? (localStorage.getItem('cc_active_screen') as Screen) : null;
    if (savedScreen && validScreens.includes(savedScreen)) {
      return savedScreen;
    }

    return 'login';
  };

  const isGuestAuthFlow =
    typeof window !== 'undefined' &&
    (window.location.pathname.includes('reset-password') ||
      window.location.pathname.includes('verify-otp') ||
      window.location.pathname.includes('signup') ||
      window.location.pathname.includes('forgot-password') ||
      window.location.pathname.includes('check-email') ||
      window.location.search.includes('token='));

  const hasToken =
    typeof window !== 'undefined' &&
    Boolean(localStorage.getItem('cc_access_token') || localStorage.getItem('cc_active_screen'));

  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(
    !isGuestAuthFlow && (hasToken || (typeof window !== 'undefined' && (window.location.pathname === '/' || window.location.pathname.includes('portal'))))
  );

  const [currentScreen, setCurrentScreen] = useState<Screen>(getInitialScreen);

  const [currentAdminTab, setCurrentAdminTab] = useState<AdminTab>(() => {
    if (typeof window === 'undefined') return 'dashboard';
    const searchParams = new URLSearchParams(window.location.search);
    const tabParam = searchParams.get('tab') as AdminTab;
    const validTabs: AdminTab[] = [
      'dashboard',
      'courses',
      'trainers',
      'trainees',
      'role-management',
      'announcements',
      'analytics',
      'competency',
      'settings',
    ];
    if (tabParam && validTabs.includes(tabParam)) return tabParam;
    const saved = localStorage.getItem('cc_active_admin_tab') as AdminTab;
    if (saved && validTabs.includes(saved)) return saved;
    return 'dashboard';
  });

  const [currentTrainerTab, setCurrentTrainerTab] = useState<TrainerTab>(() => {
    if (typeof window === 'undefined') return 'dashboard';
    const searchParams = new URLSearchParams(window.location.search);
    const tabParam = searchParams.get('tab') as TrainerTab;
    const validTabs: TrainerTab[] = [
      'dashboard',
      'my-courses',
      'trainer-library',
      'assessments',
      'trainees',
      'feedback',
      'profile',
      'notifications',
    ];
    if (tabParam && validTabs.includes(tabParam)) return tabParam;
    const saved = localStorage.getItem('cc_active_trainer_tab') as TrainerTab;
    if (saved && validTabs.includes(saved)) return saved;
    return 'dashboard';
  });

  const [currentTraineeTab, setCurrentTraineeTab] = useState<TraineeTab>(() => {
    if (typeof window === 'undefined') return 'dashboard';
    const searchParams = new URLSearchParams(window.location.search);
    const tabParam = searchParams.get('tab') as TraineeTab;
    const validTabs: TraineeTab[] = [
      'dashboard',
      'my-courses',
      'course-catalog',
      'course-detail',
      'assessments',
      'my-competency',
      'mentors',
      'course-player',
      'course-feedback',
      'assessment-result',
      'notifications',
      'profile',
      'certificates',
      'library',
    ];
    if (tabParam && validTabs.includes(tabParam)) return tabParam;
    const saved = localStorage.getItem('cc_active_trainee_tab') as TraineeTab;
    if (saved && validTabs.includes(saved)) return saved;
    return 'dashboard';
  });

  const [activeAssessmentId, setActiveAssessmentId] = useState<string>('asmt-1');
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [resetEmail, setResetEmail] = useState<string>('');
  const [verificationEmail, setVerificationEmail] = useState<string>('');
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  const handleSelectAdminTab = (tab: AdminTab) => {
    setCurrentAdminTab(tab);
    localStorage.setItem('cc_active_admin_tab', tab);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.replaceState({}, '', url.toString());
  };

  const handleSelectTrainerTab = (tab: TrainerTab) => {
    setCurrentTrainerTab(tab);
    localStorage.setItem('cc_active_trainer_tab', tab);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.replaceState({}, '', url.toString());
  };

  const handleSelectTraineeTab = (tab: TraineeTab) => {
    setCurrentTraineeTab(tab);
    localStorage.setItem('cc_active_trainee_tab', tab);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.replaceState({}, '', url.toString());
  };

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Session auto-restore on mount using backend /auth/me
  useEffect(() => {
    // If the user arrived directly via a password-reset link or OTP verification link, DO NOT redirect to dashboard
    const isResetFlow = window.location.pathname.includes('reset-password') || window.location.search.includes('token=');
    const isOtpFlow = window.location.pathname.includes('verify-otp');
    if (isResetFlow || isOtpFlow) {
      setIsCheckingAuth(false);
      return;
    }

    const restoreSession = async () => {
      try {
        const res = await authApi.getMe();
        if (res.data) {
          const user = res.data;
          const role = user.role.toLowerCase();
          const account: UserAccount = {
            firstName: user.fullName?.split(' ')[0] || 'User',
            lastName: user.fullName?.split(' ').slice(1).join(' ') || '',
            email: user.email,
            organization: user.organization || 'India Meteorological Department',
            role: role as any,
            status: user.accountStatus?.toLowerCase() === 'active' ? 'approved' : 'pending',
            submittedDate: 'Active',
          };
          setCurrentUser(account);

          if (role === 'admin') {
            setCurrentScreen('admin-portal');
            localStorage.setItem('cc_active_screen', 'admin-portal');
          } else if (role === 'trainer') {
            setCurrentScreen('trainer-portal');
            localStorage.setItem('cc_active_screen', 'trainer-portal');
          } else {
            // Trainee: Check if 4-step onboarding has been completed
            const hasOnboarded = localStorage.getItem(`cc_onboarding_completed_${user.email}`) === 'true';
            if (hasOnboarded) {
              setCurrentScreen('trainee-portal');
              localStorage.setItem('cc_active_screen', 'trainee-portal');
            } else {
              setCurrentScreen('trainee-setup');
              localStorage.setItem('cc_active_screen', 'trainee-setup');
            }
          }
        } else {
          setCurrentScreen('login');
          localStorage.removeItem('cc_active_screen');
        }
      } catch {
        // Not authenticated or session expired; keep login screen
        setCurrentScreen('login');
        localStorage.removeItem('cc_active_screen');
      } finally {
        setIsCheckingAuth(false);
      }
    };
    restoreSession();
  }, []);

  // Route gating: strictly enforce admin approval before granting dashboard/resource access
  useEffect(() => {
    if (currentUser && currentUser.status === 'pending') {
      const dashboardScreens: Screen[] = ['trainer-portal', 'trainee-portal', 'trainee-setup', 'trainee-take-assessment', 'admin-portal'];
      if (dashboardScreens.includes(currentScreen)) {
        setCurrentScreen('pending-approval');
        showToast('Your account is awaiting admin approval before accessing dashboard resources.');
      }
    }
  }, [currentScreen, currentUser]);

  const handleNavigate = (screen: Screen) => {
    setCurrentScreen(screen);
    localStorage.setItem('cc_active_screen', screen);
    // Keep browser address bar in sync for reload/bookmarking/back button support
    const targetPath = screen === 'login' ? '/' : `/${screen}`;
    if (window.location.pathname !== targetPath) {
      window.history.pushState({ screen }, '', targetPath);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-[#fafbfc] flex flex-col items-center justify-center p-4 selection:bg-blue-600 selection:text-white">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm animate-in fade-in duration-300">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
            <CloudSun className="w-7 h-7 animate-pulse" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-900 tracking-tight">Capacity Connect</h2>
            <p className="text-xs text-slate-500 font-medium">India Meteorological Department • MoES</p>
          </div>
          <div className="w-32 h-1 bg-slate-200/80 rounded-full overflow-hidden mt-2">
            <div className="w-1/2 h-full bg-blue-600 rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <UnifiedDataProvider>
      <AdminDataProvider>
        <TrainerDataProvider>
          <TraineeDataProvider>
          <div className="min-h-screen text-slate-900 flex flex-col justify-between relative selection:bg-slate-900 selection:text-white">
            {/* Global Toast Notification */}
            {toastMessage && (
              <div className="fixed top-4 sm:top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 sm:gap-2.5 bg-slate-900 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl shadow-2xl text-[11px] sm:text-xs font-medium max-w-[calc(100vw-2rem)] w-auto animate-in fade-in slide-in-from-top-3 duration-200">
                <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />
                <span className="truncate">{toastMessage}</span>
                <button
                  type="button"
                  onClick={() => setToastMessage(null)}
                  className="text-slate-400 hover:text-white ml-1.5 sm:ml-2 cursor-pointer shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* If Trainer Portal is active (Dr. Ravi Menon) */}
            {currentScreen === 'trainer-portal' ? (
              <TrainerLayout
                currentTab={currentTrainerTab}
                onSelectTab={handleSelectTrainerTab}
                onNavigateScreen={handleNavigate}
                showToast={showToast}
              >
                {currentTrainerTab === 'dashboard' && (
                  <TrainerDashboardPage onSelectTab={handleSelectTrainerTab} showToast={showToast} />
                )}
                {currentTrainerTab === 'my-courses' && (
                  <TrainerCoursesPage showToast={showToast} />
                )}
                {currentTrainerTab === 'trainer-library' && (
                  <TrainerLibraryPage showToast={showToast} />
                )}
                {currentTrainerTab === 'assessments' && (
                  <TrainerAssessmentsPage showToast={showToast} />
                )}
                {currentTrainerTab === 'trainees' && (
                  <TrainerTraineesPage showToast={showToast} />
                )}
                {currentTrainerTab === 'feedback' && (
                  <TrainerFeedbackPage showToast={showToast} />
                )}
                {currentTrainerTab === 'profile' && (
                  <TrainerProfilePage showToast={showToast} />
                )}
                {currentTrainerTab === 'notifications' && (
                  <TrainerNotificationsPage onSelectTab={handleSelectTrainerTab} showToast={showToast} />
                )}
              </TrainerLayout>
            ) : currentScreen === 'admin-portal' ? (
              <AdminLayout
                currentTab={currentAdminTab}
                onSelectTab={handleSelectAdminTab}
                onNavigateScreen={handleNavigate}
                showToast={showToast}
              >
                {currentAdminTab === 'dashboard' && (
                  <DashboardPage onNavigateTab={handleSelectAdminTab} showToast={showToast} />
                )}
                {currentAdminTab === 'courses' && <CoursesPage showToast={showToast} />}
                {currentAdminTab === 'trainers' && <TrainersPage showToast={showToast} />}
                {currentAdminTab === 'trainees' && <TraineesPage showToast={showToast} />}
                {currentAdminTab === 'role-management' && (
                  <RoleManagementPage showToast={showToast} />
                )}
                {currentAdminTab === 'announcements' && (
                  <AnnouncementsPage showToast={showToast} />
                )}
                {currentAdminTab === 'analytics' && (
                  <AnalyticsPage showToast={showToast} />
                )}
                {currentAdminTab === 'competency' && <CompetencyPage />}
                {currentAdminTab === 'settings' && <SettingsPage showToast={showToast} />}
              </AdminLayout>
            ) : currentScreen === 'trainee-setup' ? (
              /* Gated 4-Step Trainee Profile Setup Flow (Screens 01-04: No sidebar/navbar) */
              <TraineeSetupModal
                onComplete={() => {
                  if (currentUser?.email) {
                    localStorage.setItem(`cc_onboarding_completed_${currentUser.email}`, 'true');
                  }
                  setCurrentScreen('trainee-portal');
                  setCurrentTraineeTab('dashboard');
                  showToast('Profile setup complete! Welcome to Capacity Connect.');
                }}
                onSignOut={() => {
                  setCurrentUser(null);
                  handleNavigate('login');
                }}
                showToast={showToast}
              />
            ) : currentScreen === 'trainee-take-assessment' ? (
              /* Gated Fullscreen Take Assessment Mode (Screen 12: No sidebar/navbar) */
              <TraineeTakeAssessmentPage
                assessmentId={activeAssessmentId}
                onFinishTest={() => {
                  setCurrentScreen('trainee-portal');
                  setCurrentTraineeTab('assessment-result');
                }}
                showToast={showToast}
              />
            ) : currentScreen === 'trainee-portal' ? (
              /* Trainee Portal (Screens 05-20) */
              <TraineeLayout
                currentTab={currentTraineeTab}
                onSelectTab={handleSelectTraineeTab}
                onNavigateScreen={handleNavigate}
                showToast={showToast}
              >
                {currentTraineeTab === 'dashboard' && (
                  <TraineeDashboardPage onSelectTab={handleSelectTraineeTab} showToast={showToast} />
                )}
                {currentTraineeTab === 'course-catalog' && (
                  <TraineeCourseCatalogPage onSelectTab={handleSelectTraineeTab} showToast={showToast} />
                )}
                {currentTraineeTab === 'course-detail' && (
                  <TraineeCourseDetailPage onSelectTab={handleSelectTraineeTab} showToast={showToast} />
                )}
                {currentTraineeTab === 'my-courses' && (
                  <TraineeMyCoursesPage onSelectTab={handleSelectTraineeTab} showToast={showToast} />
                )}
                {currentTraineeTab === 'course-player' && (
                  <TraineeCoursePlayerPage onSelectTab={handleSelectTraineeTab} showToast={showToast} />
                )}
                {currentTraineeTab === 'course-feedback' && (
                  <TraineeCourseFeedbackPage onSelectTab={handleSelectTraineeTab} showToast={showToast} />
                )}
                {currentTraineeTab === 'assessments' && (
                  <TraineeAssessmentsPage
                    onSelectTab={handleSelectTraineeTab}
                    onStartAssessment={(asmtId) => {
                      setActiveAssessmentId(asmtId);
                      setCurrentScreen('trainee-take-assessment');
                    }}
                    showToast={showToast}
                  />
                )}
                {currentTraineeTab === 'assessment-result' && (
                  <TraineeAssessmentResultPage onSelectTab={handleSelectTraineeTab} showToast={showToast} />
                )}
                {currentTraineeTab === 'my-competency' && (
                  <TraineeCompetencyPage onSelectTab={handleSelectTraineeTab} showToast={showToast} />
                )}
                {currentTraineeTab === 'mentors' && (
                  <TraineeMentorsPage onSelectTab={handleSelectTraineeTab} showToast={showToast} />
                )}
                {currentTraineeTab === 'notifications' && (
                  <TraineeNotificationsPage onSelectTab={handleSelectTraineeTab} showToast={showToast} />
                )}
                {currentTraineeTab === 'profile' && (
                  <TraineeProfilePage onSelectTab={handleSelectTraineeTab} showToast={showToast} />
                )}
                {currentTraineeTab === 'certificates' && (
                  <TraineeCertificatesPage onSelectTab={handleSelectTraineeTab} showToast={showToast} />
                )}
                {currentTraineeTab === 'library' && (
                  <TraineeLibraryPage onSelectTab={handleSelectTraineeTab} showToast={showToast} />
                )}
              </TraineeLayout>
            ) : (
              /* Authentication & Public Verification Flow */
              <div className="min-h-screen bg-[#fafbfc] flex flex-col justify-between">
                {/* Top Header */}
                <Header currentScreen={currentScreen} onNavigate={handleNavigate} />

                {/* Main Auth Content Area */}
                <main className="flex-1 flex flex-col justify-center items-center py-6 sm:py-10">
                  {currentScreen === 'login' && (
                    <SignInScreen
                      onNavigate={handleNavigate}
                      currentUser={currentUser}
                      setCurrentUser={setCurrentUser}
                      showToast={showToast}
                      setVerificationEmail={setVerificationEmail}
                    />
                  )}

                  {currentScreen === 'signup' && (
                    <SignUpScreen
                      onNavigate={handleNavigate}
                      setCurrentUser={setCurrentUser}
                      showToast={showToast}
                      setVerificationEmail={setVerificationEmail}
                    />
                  )}

                  {currentScreen === 'verify-otp' && (
                    <VerifyOtpScreen
                      email={verificationEmail}
                      onNavigate={handleNavigate}
                      setCurrentUser={setCurrentUser}
                      showToast={showToast}
                    />
                  )}

                  {currentScreen === 'forgot-password' && (
                    <ForgotPasswordScreen
                      onNavigate={handleNavigate}
                      resetEmail={resetEmail}
                      setResetEmail={setResetEmail}
                      showToast={showToast}
                    />
                  )}

                  {currentScreen === 'check-email' && (
                    <CheckEmailScreen
                      onNavigate={handleNavigate}
                      resetEmail={resetEmail}
                      setEmailModalOpen={setEmailModalOpen}
                      showToast={showToast}
                    />
                  )}

                  {currentScreen === 'reset-password' && (
                    <ResetPasswordScreen
                      onNavigate={handleNavigate}
                      showToast={showToast}
                    />
                  )}

                  {currentScreen === 'pending-approval' && (
                    <PendingApprovalScreen
                      onNavigate={handleNavigate}
                      currentUser={currentUser}
                      setCurrentUser={setCurrentUser}
                      showToast={showToast}
                    />
                  )}

                  {currentScreen === 'access-denied' && (
                    <AccessDeniedScreen
                      onNavigate={handleNavigate}
                      currentUser={currentUser}
                      setCurrentUser={setCurrentUser}
                      showToast={showToast}
                    />
                  )}
                </main>

                {/* Footer */}
                <Footer />
              </div>
            )}
          </div>
        </TraineeDataProvider>
      </TrainerDataProvider>
    </AdminDataProvider>
  </UnifiedDataProvider>
  );
}
