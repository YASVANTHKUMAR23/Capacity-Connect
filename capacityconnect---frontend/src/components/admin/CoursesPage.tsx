import React, { useState } from 'react';
import { Search, ChevronDown, ChevronLeft, ChevronRight, SlidersHorizontal, Plus, Trash2, Power } from 'lucide-react';
import { useAdminData } from '../../context/AdminDataContext';
import { ScrollDrivenTable } from './ScrollDrivenTable';
import { TableSkeleton } from '../common/Skeleton';

interface CoursesPageProps {
  showToast?: (msg: string) => void;
}

export const CoursesPage: React.FC<CoursesPageProps> = ({ showToast }) => {
  const { courses, createCourse, updateCourse, deleteCourse, isLoading } = useAdminData();
  const [activeTab, setActiveTab] = useState<'Active' | 'Inactive'>('Active');
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('All');
  const [trainerFilter, setTrainerFilter] = useState('All');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newLevel, setNewLevel] = useState('Intermediate');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeCount = courses.filter((c) => c.status === 'Active').length;
  const inactiveCount = courses.filter((c) => c.status === 'Inactive').length;

  const categories = Array.from(new Set(courses.map((c) => c.category))).filter(Boolean);
  const trainersList = Array.from(new Set(courses.map((c) => c.trainer))).filter(Boolean);

  const filteredCourses = courses.filter((c) => {
    if (c.status !== activeTab) return false;
    if (searchQuery && !c.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (subjectFilter !== 'All' && c.category !== subjectFilter) return false;
    if (trainerFilter !== 'All' && c.trainer !== trainerFilter) return false;
    return true;
  });

  const handleToggleStatus = async (courseId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    try {
      await updateCourse(courseId, { status: nextStatus as any });
      showToast?.(`Course status updated to ${nextStatus}.`);
    } catch {
      showToast?.('Failed to update course status in database.');
    }
  };

  const handleDeleteCourse = async (courseId: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete course "${title}"?`)) return;
    try {
      await deleteCourse(courseId);
      showToast?.(`Course "${title}" removed from database.`);
    } catch {
      showToast?.('Failed to delete course.');
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setIsSubmitting(true);
    try {
      await createCourse({
        title: newTitle.trim(),
        category: newCategory.trim() || 'General Meteorology',
        level: newLevel as any,
        status: 'Active',
      });
      showToast?.('New course created and saved to database.');
      setIsCreateModalOpen(false);
      setNewTitle('');
      setNewCategory('');
    } catch {
      showToast?.('Failed to create course in database.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 sm:space-y-6 w-full max-w-full min-w-0">
        <div className="flex justify-between items-center">
          <div className="space-y-1.5">
            <div className="h-7 w-40 bg-slate-200/80 rounded-xl animate-pulse" />
            <div className="h-4 w-60 bg-slate-200/80 rounded-xl animate-pulse" />
          </div>
          <div className="h-9 w-32 bg-slate-200/80 rounded-xl animate-pulse" />
        </div>
        <TableSkeleton rows={6} cols={6} />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full min-w-0">
      {/* Filter Tabs & Search row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Filter Tabs matching 05-courses.png */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('Active')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'Active'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            Active <span className="opacity-80 ml-1">{activeCount}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('Inactive')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'Inactive'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            Inactive <span className="opacity-80 ml-1">{inactiveCount}</span>
          </button>
        </div>

        {/* Search and Filters row (Desktop) */}
        <div className="hidden sm:flex items-center gap-3 flex-1 max-w-xl justify-end">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search courses"
              className="w-full pl-9 pr-3.5 py-2 bg-white border border-slate-200/90 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-600/30 shadow-2xs"
            />
          </div>

          <div className="relative shrink-0">
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="appearance-none bg-white border border-slate-200/90 rounded-xl px-3.5 py-2 pr-8 text-xs font-medium text-slate-700 shadow-2xs focus:outline-hidden cursor-pointer"
            >
              <option value="All">Subject: All</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Add Course Button */}
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-2xs cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Course</span>
          </button>
        </div>
      </div>

      {/* Courses Table Card */}
      <div className="w-full max-w-full min-w-0 bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs overflow-hidden">
        {/* Mobile Heading and Search+Filter row strictly matching reference design */}
        <div className="sm:hidden mb-3">
          <h2 className="font-bold text-slate-900 text-base mb-3">Courses list</h2>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search courses"
                className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-200/90 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-600/30 shadow-2xs"
              />
            </div>
            <button
              type="button"
              className="px-3.5 py-2.5 rounded-xl border border-slate-200/90 bg-white text-xs font-semibold text-slate-700 flex items-center gap-1.5 shadow-2xs shrink-0 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <SlidersHorizontal className="w-4 h-4 text-slate-600" />
              <span>Filter</span>
            </button>
          </div>
        </div>

        {/* Scroll-Driven Courses Table with generous column padding and min-widths */}
        <ScrollDrivenTable minWidth="min-w-[860px]">
          <table className="w-full text-left text-[13px] min-w-[860px]">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold text-[13px]">
                <th className="py-3.5 px-5 sm:px-6 font-medium whitespace-nowrap min-w-[280px]">Course</th>
                <th className="py-3.5 px-5 sm:px-6 font-medium whitespace-nowrap min-w-[180px]">Trainer</th>
                <th className="py-3.5 px-5 sm:px-6 font-medium whitespace-nowrap min-w-[120px]">Enrolled</th>
                <th className="py-3.5 px-5 sm:px-6 font-medium whitespace-nowrap min-w-[180px]">Completion</th>
                <th className="py-3.5 px-5 sm:px-6 font-medium whitespace-nowrap min-w-[130px]">Deadline</th>
                <th className="py-3.5 px-5 sm:px-6 font-medium whitespace-nowrap min-w-[110px]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCourses.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/50">
                  <td className="py-4 px-5 sm:px-6 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-[13px] shrink-0 ${c.avatarBg}`}
                      >
                        {c.initials}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 text-[13px]">{c.title}</div>
                        <div className="text-slate-400 text-xs font-normal">
                          {c.category}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-5 sm:px-6 whitespace-nowrap text-slate-700 font-medium text-[13px]">{c.trainer}</td>
                  <td className="py-4 px-5 sm:px-6 whitespace-nowrap text-slate-800 font-semibold tabular-nums text-[13px]">
                    {c.enrolled}
                  </td>
                  <td className="py-4 px-5 sm:px-6 whitespace-nowrap">
                    <div className="flex items-center gap-2.5">
                      <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full"
                          style={{ width: `${c.completion}%` }}
                        />
                      </div>
                      <span className="text-slate-500 text-xs font-medium tabular-nums">
                        {c.completion}%
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-5 sm:px-6 whitespace-nowrap text-slate-500 font-medium text-[13px]">{c.deadline}</td>
                  <td className="py-4 px-5 sm:px-6 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(c.id, c.status)}
                        className={`inline-flex items-center gap-1.5 font-semibold text-xs px-2.5 py-1 rounded-full cursor-pointer transition-colors ${
                          c.status === 'Active'
                            ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                            : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
                        }`}
                        title="Click to toggle course status"
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            c.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        />
                        {c.status}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCourse(c.id, c.title)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete course from DB"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollDrivenTable>

        {/* Mobile Pagination strictly matching reference design */}
        <div className="sm:hidden flex items-center justify-between pt-4 mt-2 border-t border-slate-100">
          <button
            type="button"
            className="w-9 h-9 rounded-xl border border-slate-200/90 bg-white flex items-center justify-center text-slate-400 hover:text-slate-700 shadow-2xs cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <button
              type="button"
              className="w-8 h-8 rounded-xl bg-slate-950 text-white flex items-center justify-center shadow-xs cursor-pointer"
            >
              1
            </button>
            <button
              type="button"
              className="w-8 h-8 rounded-xl text-slate-600 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
            >
              2
            </button>
            <span className="text-slate-400 px-1">...</span>
            <button
              type="button"
              className="w-8 h-8 rounded-xl text-slate-600 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
            >
              6
            </button>
          </div>
          <button
            type="button"
            className="w-9 h-9 rounded-xl border border-slate-200/90 bg-white flex items-center justify-center text-slate-600 hover:text-slate-900 shadow-2xs cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Desktop Pagination (preserved for non-mobile views) */}
        <div className="hidden sm:flex items-center justify-between pt-5 border-t border-slate-100 text-xs text-slate-500">
          <span>Showing 1-{filteredCourses.length} of {filteredCourses.length}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="px-3 py-1.5 border border-slate-200 rounded-xl hover:bg-slate-50 font-medium cursor-pointer"
            >
              Previous
            </button>
            <button
              type="button"
              className="px-3 py-1.5 border border-slate-200 rounded-xl hover:bg-slate-50 font-medium cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Create Course Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-semibold text-slate-900 mb-1">Create New Course</h3>
            <p className="text-xs text-slate-500 mb-4">Add a new meteorological training course to the database.</p>
            <form onSubmit={handleCreateCourse} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Course Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Satellite Meteorology & Cyclone Tracking"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600/30"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Category / Discipline</label>
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="e.g. Remote Sensing"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600/30"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Difficulty Level</label>
                <select
                  value={newLevel}
                  onChange={(e) => setNewLevel(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600/30"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newTitle.trim()}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Saving...' : 'Create Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
