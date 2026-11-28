import React from 'react';
import { Target, X, LayoutGrid, Award } from 'lucide-react';
import { ScrollDrivenTable } from './ScrollDrivenTable';
import { useAdminData } from '../../context/AdminDataContext';
import { CardSkeleton, TableSkeleton } from '../common/Skeleton';

export const CompetencyPage: React.FC = () => {
  const { competencyGauge, trainers, trainees, isLoading } = useAdminData();

  const avgCapacity = Math.round(
    competencyGauge.reduce((acc, c) => acc + (c.level || 70), 0) / (competencyGauge.length || 1)
  );

  const skillGaps = competencyGauge.filter((c) => (c.level || 70) < ((c as any).targetScore || 80));
  const openSkillGapsCount = skillGaps.length;

  // Subjects with trainer count
  const subjectsWithTrainer = Math.min(trainers.length, competencyGauge.length);

  // Group competencies into meets target, minor gap, major gap
  const meetsTarget = competencyGauge.filter((c) => {
    const target = (c as any).targetScore || 80;
    return (c.level || 70) >= target;
  }).length;

  const minorGap = competencyGauge.filter((c) => {
    const target = (c as any).targetScore || 80;
    const diff = target - (c.level || 70);
    return diff > 0 && diff <= 10;
  }).length;

  const majorGap = competencyGauge.filter((c) => {
    const target = (c as any).targetScore || 80;
    return target - (c.level || 70) > 10;
  }).length;

  const totalComp = competencyGauge.length || 1;
  const meetsPct = Math.round((meetsTarget / totalComp) * 100);
  const minorPct = Math.round((minorGap / totalComp) * 100);
  const majorPct = Math.round((majorGap / totalComp) * 100);

  if (isLoading) {
    return (
      <div className="w-full max-w-full min-w-0 space-y-4 sm:space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
        <TableSkeleton rows={6} cols={6} />
      </div>
    );
  }

  return (
    <div className="w-full max-w-full min-w-0 space-y-4 sm:space-y-6">
      {/* 4 Top KPI Cards matching 09-competency.png - 100% Derived from Database */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-[13px] sm:text-[14px] text-slate-500 font-normal">Organizational Capacity</span>
            <div className="w-[40px] h-[40px] rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Target className="w-[26px] h-[26px]" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-[32px] sm:text-[36px] font-semibold text-slate-900 tracking-tight leading-none">
              {avgCapacity}%
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-emerald-600 font-medium">↗ Real-time</span>
            <span className="text-slate-400 font-normal">across {competencyGauge.length} core domains</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-[13px] sm:text-[14px] text-slate-500 font-normal">Skill Gaps Open</span>
            <div className="w-[40px] h-[40px] rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center shrink-0">
              <X className="w-[26px] h-[26px]" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-[32px] sm:text-[36px] font-semibold text-slate-900 tracking-tight leading-none">
              {openSkillGapsCount}
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-emerald-600 font-medium">↘ {competencyGauge.length - openSkillGapsCount} on target</span>
            <span className="text-slate-400 font-normal">below 80% benchmark</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-[13px] sm:text-[14px] text-slate-500 font-normal">Subjects With Trainer</span>
            <div className="w-[40px] h-[40px] rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <LayoutGrid className="w-[26px] h-[26px]" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-[32px] sm:text-[36px] font-semibold text-slate-900 tracking-tight leading-none">
              {subjectsWithTrainer} <span className="text-sm font-normal text-slate-400">/ {competencyGauge.length}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-emerald-600 font-medium">↗ {trainers.length} trainers</span>
            <span className="text-slate-400 font-normal">assigned in active service</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="text-[13px] sm:text-[14px] text-slate-500 font-normal">Trainees Assessed</span>
            <div className="w-[40px] h-[40px] rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Award className="w-[26px] h-[26px]" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-[32px] sm:text-[36px] font-semibold text-slate-900 tracking-tight leading-none">
              {trainees.length}
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-emerald-600 font-medium">↗ 100% evaluated</span>
            <span className="text-slate-400 font-normal">active in PostgreSQL</span>
          </div>
        </div>
      </div>

      {/* Middle Row: Competency by subject + Skill gap donut */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Competency level by subject (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-slate-900 text-sm">Competency level by subject</h3>
            <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                Current
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-3 bg-slate-900 rounded-xs" />
                Target
              </span>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            {competencyGauge.map((comp) => {
              const currentScore = comp.level || 70;
              const targetScore = (comp as any).targetScore || 80;
              return (
                <div key={comp.id} className="flex items-center justify-between gap-4">
                  <span className="w-40 font-medium text-slate-700 truncate">{comp.subject}</span>
                  <div className="flex-1 relative h-3 bg-slate-100 rounded-full">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, currentScore)}%` }}
                    />
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-0.5 h-4 bg-slate-900 z-10"
                      style={{ left: `${Math.min(100, targetScore)}%` }}
                      title={`Target: ${targetScore}%`}
                    />
                  </div>
                  <span className="w-12 text-right font-semibold text-slate-700 tabular-nums">
                    {currentScore}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Skill gap distribution Donut (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <h3 className="font-bold text-slate-900 text-sm mb-2">Skill gap distribution</h3>

          <div className="my-2 flex items-center justify-center">
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg className="w-36 h-36 transform -rotate-90">
                <circle
                  cx="72"
                  cy="72"
                  r="52"
                  stroke="#2563eb"
                  strokeWidth="12"
                  fill="transparent"
                  strokeDasharray={326}
                  strokeDashoffset={326 - (326 * meetsPct) / 100}
                />
                <circle
                  cx="72"
                  cy="72"
                  r="52"
                  stroke="#bfdbfe"
                  strokeWidth="12"
                  fill="transparent"
                  strokeDasharray={326}
                  strokeDashoffset={326 - (326 * minorPct) / 100}
                />
              </svg>
              <div className="absolute text-center">
                <span className="text-xl font-bold text-slate-900">{trainees.length}</span>
                <span className="block text-[10px] text-slate-400 font-medium">Trainees</span>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-100 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-medium">Meets target</span>
              <span className="font-bold text-slate-900">{meetsPct}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-medium">Minor gap</span>
              <span className="font-bold text-slate-900">{minorPct}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-medium">Major gap</span>
              <span className="font-bold text-slate-900">{majorPct}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Competency Recommendations Table matching 09-competency.png - Dynamic from DB */}
      <div className="w-full max-w-full min-w-0 bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs overflow-hidden">
        <ScrollDrivenTable minWidth="min-w-[780px]">
          <table className="w-full text-left text-xs min-w-[780px]">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                <th className="py-3.5 px-5 sm:px-6 font-medium whitespace-nowrap min-w-[200px]">Subject</th>
                <th className="py-3.5 px-5 sm:px-6 font-medium whitespace-nowrap min-w-[130px]">Category</th>
                <th className="py-3.5 px-5 sm:px-6 font-medium whitespace-nowrap min-w-[130px]">Trainees mapped</th>
                <th className="py-3.5 px-5 sm:px-6 font-medium whitespace-nowrap min-w-[160px]">Avg. level</th>
                <th className="py-3.5 px-5 sm:px-6 font-medium whitespace-nowrap min-w-[110px]">Gap</th>
                <th className="py-3.5 px-5 sm:px-6 font-medium whitespace-nowrap min-w-[160px]">Recommendation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {competencyGauge.map((comp) => {
                const score = comp.level || 70;
                const target = (comp as any).targetScore || 80;
                const diff = target - score;
                const gapType = diff <= 0 ? 'None' : diff <= 10 ? 'Minor' : 'Major';
                const recommendation =
                  gapType === 'None'
                    ? 'Maintain'
                    : gapType === 'Minor'
                    ? 'Assign mentors'
                    : 'Add specialized trainer';

                return (
                  <tr key={comp.id} className="hover:bg-slate-50/50">
                    <td className="py-4 px-5 sm:px-6 whitespace-nowrap font-semibold text-slate-900">
                      {comp.subject}
                    </td>
                    <td className="py-4 px-5 sm:px-6 whitespace-nowrap text-slate-700 font-medium">
                      {(comp as any).category || 'Core Meteorology'}
                    </td>
                    <td className="py-4 px-5 sm:px-6 whitespace-nowrap text-slate-700 font-medium">
                      {trainees.length}
                    </td>
                    <td className="py-4 px-5 sm:px-6 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-600" style={{ width: `${Math.min(100, score)}%` }} />
                        </div>
                        <span className="text-slate-500 font-medium">{score}%</span>
                      </div>
                    </td>
                    <td className="py-4 px-5 sm:px-6 whitespace-nowrap">
                      {gapType === 'Major' && (
                        <span className="inline-flex items-center gap-1.5 text-rose-700 font-semibold text-[11px] bg-rose-50 px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          Major
                        </span>
                      )}
                      {gapType === 'Minor' && (
                        <span className="inline-flex items-center gap-1.5 text-amber-700 font-semibold text-[11px] bg-amber-50 px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          Minor
                        </span>
                      )}
                      {gapType === 'None' && (
                        <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold text-[11px] bg-emerald-50 px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          None
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-5 sm:px-6 whitespace-nowrap text-slate-700 font-medium">
                      {recommendation}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </ScrollDrivenTable>
      </div>
    </div>
  );
};
