import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'rectangular' | 'circular' | 'text' | 'rounded';
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rounded',
  width,
  height,
}) => {
  const variantStyles = {
    rectangular: 'rounded-none',
    circular: 'rounded-full',
    text: 'rounded-sm h-3.5 my-1',
    rounded: 'rounded-xl',
  }[variant];

  return (
    <div
      className={`animate-pulse bg-slate-200/80 ${variantStyles} ${className}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
      }}
      aria-hidden="true"
    />
  );
};

export const SkeletonText: React.FC<{
  lines?: number;
  className?: string;
  lastLineWidth?: string;
}> = ({ lines = 3, className = '', lastLineWidth = 'w-4/5' }) => {
  return (
    <div className={`space-y-2.5 ${className}`}>
      {Array.from({ length: lines }).map((_, idx) => (
        <Skeleton
          key={idx}
          variant="rounded"
          className={`h-3 ${idx === lines - 1 ? lastLineWidth : 'w-full'}`}
        />
      ))}
    </div>
  );
};

export const CardSkeleton: React.FC<{ className?: string; children?: React.ReactNode }> = ({
  className = '',
  children,
}) => {
  return (
    <div className={`bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs space-y-4 ${className}`}>
      {children || (
        <>
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-28" />
            <Skeleton variant="circular" className="w-8 h-8" />
          </div>
          <div className="space-y-2 my-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-2 w-full" />
        </>
      )}
    </div>
  );
};

export const TableSkeleton: React.FC<{
  rows?: number;
  cols?: number;
  className?: string;
}> = ({ rows = 5, cols = 5, className = '' }) => {
  return (
    <div className={`bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs space-y-4 ${className}`}>
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div key={rIdx} className="flex items-center gap-4 py-2 border-b border-slate-50 last:border-none">
            {Array.from({ length: cols }).map((_, cIdx) => (
              <Skeleton
                key={cIdx}
                className={`h-4 ${cIdx === 0 ? 'w-1/4' : cIdx === 1 ? 'w-1/6' : 'w-1/5'}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export const ChartSkeleton: React.FC<{ className?: string; title?: string }> = ({
  className = '',
  title = 'Analytics Chart',
}) => {
  return (
    <div className={`bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs space-y-4 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-6 w-20" />
      </div>
      <div className="h-52 flex items-end justify-between gap-3 pt-6 px-4">
        {Array.from({ length: 7 }).map((_, idx) => (
          <div key={idx} className="flex flex-col items-center gap-2 flex-1">
            <Skeleton
              className="w-full max-w-[32px] rounded-t-lg"
              height={`${30 + (idx * 23) % 110}px`}
            />
            <Skeleton className="h-2.5 w-7" />
          </div>
        ))}
      </div>
    </div>
  );
};

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner & Management Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs space-y-4 min-h-[220px]">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-7 w-3/4" />
          <SkeletonText lines={2} lastLineWidth="w-2/3" />
          <div className="flex gap-3 pt-3">
            <Skeleton className="h-9 w-32 rounded-xl" />
            <Skeleton className="h-9 w-28 rounded-xl" />
          </div>
        </div>

        <div className="lg:col-span-5 flex flex-col justify-between gap-4">
          <CardSkeleton className="py-4" />
          <div className="grid grid-cols-2 gap-3">
            <CardSkeleton className="py-3" />
            <CardSkeleton className="py-3" />
          </div>
        </div>
      </div>

      {/* 4 Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <CardSkeleton key={idx} />
        ))}
      </div>

      {/* 2 Middle Analysis Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <ChartSkeleton className="lg:col-span-8" />
        <CardSkeleton className="lg:col-span-4 min-h-[280px]">
          <div className="flex justify-between items-center mb-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-12" />
          </div>
          <div className="flex justify-center my-6">
            <Skeleton variant="circular" className="w-36 h-36" />
          </div>
          <SkeletonText lines={3} />
        </CardSkeleton>
      </div>
    </div>
  );
};
