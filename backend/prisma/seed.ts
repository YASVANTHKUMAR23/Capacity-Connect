import { PrismaClient, Role, AccountStatus, CourseLevel, CourseStatus, QuestionType, AssessmentType, AnnouncementStatus } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  const hashPassword = async (pass: string) => {
    return argon2.hash(pass, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });
  };

  console.log('[Seed] Starting complete Admin & Unified database seeding for Capacity Connect...');

  // 1. Organization & Divisions
  const org = await prisma.organization.upsert({
    where: { code: 'IMD' },
    update: {
      name: 'India Meteorological Department (MoES)',
    },
    create: {
      name: 'India Meteorological Department (MoES)',
      code: 'IMD',
    },
  });

  const divisionsData = [
    { name: 'Cyclone Warning Division', zone: 'National / IMD HQ', color: '#1f5eff' },
    { name: 'Numerical Weather Prediction (NWP)', zone: 'Northern Region', color: '#10b981' },
    { name: 'Radar & Satellite Meteorology', zone: 'Eastern Region', color: '#8b5cf6' },
    { name: 'Aviation Meteorological Division', zone: 'Western Region', color: '#f59e0b' },
    { name: 'Agricultural Meteorology Division', zone: 'Southern Region', color: '#06b6d4' },
    { name: 'Climate Monitoring & Research', zone: 'Central India', color: '#ec4899' },
  ];

  const divisions: any[] = [];
  for (const d of divisionsData) {
    let div = await prisma.division.findFirst({ where: { name: d.name } });
    if (!div) {
      div = await prisma.division.create({
        data: {
          organizationId: org.id,
          name: d.name,
          zone: d.zone,
          color: d.color,
        },
      });
    }
    divisions.push(div);
  }

  console.log('[Seed] Organization & 6 Divisions verified.');

  // 2. Passwords
  const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@Capacity2026!';
  const trainerPassword = process.env.DEFAULT_TRAINER_PASSWORD || 'Trainer@Capacity2026!';
  const traineePassword = process.env.DEFAULT_TRAINEE_PASSWORD || 'Trainee@Capacity2026!';

  const adminHash = await hashPassword(adminPassword);
  const trainerHash = await hashPassword(trainerPassword);
  const traineeHash = await hashPassword(traineePassword);

  // 2.1 Core Administrator
  const admin = await prisma.user.upsert({
    where: { email: 'admin@imd.gov.in' },
    update: {
      fullName: 'Capacity Connect Administrator',
      role: Role.ADMIN,
      accountStatus: AccountStatus.ACTIVE,
      emailVerifiedAt: new Date(),
    },
    create: {
      fullName: 'Capacity Connect Administrator',
      email: 'admin@imd.gov.in',
      passwordHash: adminHash,
      role: Role.ADMIN,
      accountStatus: AccountStatus.ACTIVE,
      emailVerifiedAt: new Date(),
      organization: 'IMD Headquarters, New Delhi',
    },
  });

  await prisma.userProfile.upsert({
    where: { userId: admin.id },
    update: {},
    create: {
      userId: admin.id,
      divisionId: divisions[0].id,
      employeeId: 'IMD-ADM-001',
      officeLocation: 'Mausam Bhawan, New Delhi',
    },
  });

  // 2.2 Core Trainers
  const trainersSeed = [
    {
      name: 'Dr. Ravi Menon',
      email: 'ravi.menon@imd.gov.in',
      division: 'Cyclone Warning Division',
      title: 'Senior Scientist / Lead Trainer',
      spec: 'Tropical Cyclones & Doppler Radar',
      years: 14,
    },
    {
      name: 'Dr. Anita Rao',
      email: 'anita.rao@imd.gov.in',
      division: 'Aviation Meteorological Division',
      title: 'Principal Meteorologist',
      spec: 'Aviation Meteorology & TAF Operations',
      years: 11,
    },
    {
      name: 'Meera Iyer',
      email: 'meera.iyer@imd.gov.in',
      division: 'Numerical Weather Prediction (NWP)',
      title: 'NWP Specialist & Trainer',
      spec: 'Numerical Weather Prediction & WRF Modeling',
      years: 9,
    },
    {
      name: 'Farah Khan',
      email: 'farah.khan@imd.gov.in',
      division: 'Radar & Satellite Meteorology',
      title: 'Remote Sensing Instructor',
      spec: 'Satellite Meteorology & INSAT-3DR Multispectral Imagery',
      years: 12,
    },
  ];

  const trainers: any[] = [];
  for (const t of trainersSeed) {
    const user = await prisma.user.upsert({
      where: { email: t.email },
      update: {
        fullName: t.name,
        role: Role.TRAINER,
        accountStatus: AccountStatus.ACTIVE,
        emailVerifiedAt: new Date(),
      },
      create: {
        fullName: t.name,
        email: t.email,
        passwordHash: trainerHash,
        role: Role.TRAINER,
        accountStatus: AccountStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        organization: 'India Meteorological Department',
      },
    });

    await prisma.trainerProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        roleTitle: t.title,
        specialization: t.spec,
        division: t.division,
        yearsExperience: t.years,
        profileStrength: 92,
        bio: `${t.title} with over ${t.years} years of active service specializing in ${t.spec}.`,
      },
    });

    trainers.push(user);
  }

  // 2.3 Core Trainees
  const traineesSeed = [
    {
      name: 'Asha Verma',
      email: 'asha.verma@imd.gov.in',
      station: 'Regional Meteorological Centre, New Delhi',
      desig: 'Scientist B',
      divisionIndex: 0,
    },
    {
      name: 'Rajesh Sharma',
      email: 'rajesh.sharma@imd.gov.in',
      station: 'Meteorological Centre, Jaipur',
      desig: 'Meteorologist Grade-I',
      divisionIndex: 1,
    },
    {
      name: 'Pooja Nair',
      email: 'pooja.nair@imd.gov.in',
      station: 'Regional Meteorological Centre, Chennai',
      desig: 'Scientific Assistant',
      divisionIndex: 2,
    },
    {
      name: 'Arjun Das',
      email: 'arjun.das@imd.gov.in',
      station: 'Meteorological Centre, Bhubaneswar',
      desig: 'Scientist B',
      divisionIndex: 3,
    },
    {
      name: 'Sneha Kulkarni',
      email: 'sneha.k@imd.gov.in',
      station: 'Regional Meteorological Centre, Mumbai',
      desig: 'Scientist C',
      divisionIndex: 4,
    },
    {
      name: 'Vikram Singh',
      email: 'vikram.singh@imd.gov.in',
      station: 'Meteorological Centre, Shimla',
      desig: 'Scientist B',
      divisionIndex: 5,
    },
    {
      name: 'Deepak Patel',
      email: 'deepak.patel@imd.gov.in',
      station: 'Meteorological Centre, Ahmedabad',
      desig: 'Meteorologist Grade-II',
      divisionIndex: 0,
    },
    {
      name: 'Ananya Roy',
      email: 'ananya.roy@imd.gov.in',
      station: 'Regional Meteorological Centre, Kolkata',
      desig: 'Scientist B',
      divisionIndex: 1,
    },
  ];

  const trainees: any[] = [];
  for (const tr of traineesSeed) {
    const user = await prisma.user.upsert({
      where: { email: tr.email },
      update: {
        fullName: tr.name,
        role: Role.TRAINEE,
        accountStatus: AccountStatus.ACTIVE,
        emailVerifiedAt: new Date(),
      },
      create: {
        fullName: tr.name,
        email: tr.email,
        passwordHash: traineeHash,
        role: Role.TRAINEE,
        accountStatus: AccountStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        organization: 'India Meteorological Department',
      },
    });

    await prisma.traineeProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        stationOffice: tr.station,
        designation: tr.desig,
        onboardingCompleted: true,
      },
    });

    await prisma.userProfile.upsert({
      where: { userId: user.id },
      update: {
        divisionId: divisions[tr.divisionIndex].id,
      },
      create: {
        userId: user.id,
        divisionId: divisions[tr.divisionIndex].id,
        employeeId: `IMD-TRN-${tr.email.split('@')[0].toUpperCase()}`,
        officeLocation: tr.station,
      },
    });

    trainees.push(user);
  }

  // 2.4 Pending Approvals (Users with PENDING_APPROVAL status)
  const pendingUsersSeed = [
    {
      name: 'Kiran Joshi',
      email: 'kiran.joshi@imd.gov.in',
      role: Role.TRAINER,
      org: 'Bengaluru Regional Met Centre',
    },
    {
      name: 'Sana Ahmed',
      email: 'sana.ahmed@imd.gov.in',
      role: Role.TRAINEE,
      org: 'Hyderabad Met Centre',
    },
    {
      name: 'Vikram Patel',
      email: 'vikram.p@imd.gov.in',
      role: Role.TRAINEE,
      org: 'Ahmedabad Met Centre',
    },
    {
      name: 'Rhea Menon',
      email: 'rhea.menon@imd.gov.in',
      role: Role.TRAINER,
      org: 'Kochi Radar Station',
    },
  ];

  for (const p of pendingUsersSeed) {
    await prisma.user.upsert({
      where: { email: p.email },
      update: {
        accountStatus: AccountStatus.PENDING_APPROVAL,
      },
      create: {
        fullName: p.name,
        email: p.email,
        passwordHash: traineeHash,
        role: p.role,
        accountStatus: AccountStatus.PENDING_APPROVAL,
        emailVerifiedAt: new Date(),
        organization: p.org,
      },
    });
  }

  console.log('[Seed] Admin, Trainers, Trainees, and 4 Pending Approval accounts verified.');

  // 3. Announcements
  await prisma.announcement.deleteMany();
  await prisma.announcement.createMany({
    data: [
      {
        authorId: admin.id,
        title: 'Cyclone season training begins',
        type: 'Announcement',
        status: AnnouncementStatus.PUBLISHED,
        date: '18 Oct',
        publishOn: '25 Oct 2026, 09:00',
        isPinned: true,
        message: 'New cyclone tracking modules open to all trainees on 1 November. Enroll before 30 November to receive your certificate.',
        imageUrl: 'https://images.unsplash.com/photo-1527482797697-8795b05a13fe?w=800&auto=format&fit=crop&q=80',
      },
      {
        authorId: admin.id,
        title: 'Radar course update released',
        type: 'New content',
        status: AnnouncementStatus.PUBLISHED,
        date: '16 Oct',
        publishOn: '16 Oct 2026, 11:30',
        isPinned: false,
        message: 'S-band radar interpretation lessons have been refreshed with the latest Doppler dataset from Chennai and Kolkata radars.',
        imageUrl: 'https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?w=800&auto=format&fit=crop&q=80',
      },
      {
        authorId: admin.id,
        title: '500 certifications crossed',
        type: 'Achievement',
        status: AnnouncementStatus.PUBLISHED,
        date: '12 Oct',
        publishOn: '12 Oct 2026, 14:00',
        isPinned: false,
        message: 'Over 500 meteorologists across all IMD Regional Centres have completed the INSAT-3DR satellite imagery interpretation track.',
        imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80',
      },
      {
        authorId: admin.id,
        title: 'Server maintenance Sunday',
        type: 'Maintenance',
        status: AnnouncementStatus.PUBLISHED,
        date: '25 Oct',
        publishOn: '25 Oct 2026, 02:00',
        isPinned: false,
        message: 'Portal services will undergo routine database optimization and backup between 02:00 AM and 05:00 AM IST on Sunday.',
        imageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&auto=format&fit=crop&q=80',
      },
      {
        authorId: admin.id,
        title: 'Winter module preview',
        type: 'New content',
        status: AnnouncementStatus.DRAFT,
        date: '—',
        publishOn: '28 Oct 2026, 10:00',
        isPinned: false,
        message: 'Early preview of Western Disturbances forecasting and fog density detection modules for northern plain divisions.',
        imageUrl: 'https://images.unsplash.com/photo-1483921020237-2ff51e8e4b22?w=800&auto=format&fit=crop&q=80',
      },
    ],
  });

  console.log('[Seed] 5 Announcements seeded.');

  // 4. Course Categories & Courses
  const catTropical = await prisma.courseCategory.upsert({
    where: { code: 'CYC' },
    update: {},
    create: { name: 'Tropical Meteorology', code: 'CYC' },
  });

  const catRadar = await prisma.courseCategory.upsert({
    where: { code: 'RADAR' },
    update: {},
    create: { name: 'Radar Meteorology', code: 'RADAR' },
  });

  const catNWP = await prisma.courseCategory.upsert({
    where: { code: 'NWP' },
    update: {},
    create: { name: 'Numerical Models', code: 'NWP' },
  });

  const catAviation = await prisma.courseCategory.upsert({
    where: { code: 'AVN' },
    update: {},
    create: { name: 'Aviation Meteorology', code: 'AVN' },
  });

  const catSatellite = await prisma.courseCategory.upsert({
    where: { code: 'SAT' },
    update: {},
    create: { name: 'Remote Sensing', code: 'SAT' },
  });

  const coursesSeed = [
    {
      code: 'CT-101',
      title: 'Cyclone Track Analysis & Forecast Verification',
      category: catTropical.id,
      trainer: trainers[0].id,
      level: CourseLevel.ADVANCED,
      duration: '4 weeks',
      status: CourseStatus.ACTIVE,
      deadline: '30 Nov',
      desc: 'Advanced methodology for analyzing Bay of Bengal and Arabian Sea tropical cyclonic storm tracks using Dvorak technique.',
    },
    {
      code: 'DW-202',
      title: 'Doppler Weather Radar Meteorology & Nowcasting',
      category: catRadar.id,
      trainer: trainers[0].id,
      level: CourseLevel.INTERMEDIATE,
      duration: '3 weeks',
      status: CourseStatus.ACTIVE,
      deadline: '20 Nov',
      desc: 'Operational utilization of S-band and C-band dual-polarization Doppler weather radar networks across coastal India.',
    },
    {
      code: 'NW-301',
      title: 'Numerical Weather Prediction (NWP) Modeling & HPC Systems',
      category: catNWP.id,
      trainer: trainers[2].id,
      level: CourseLevel.ADVANCED,
      duration: '6 weeks',
      status: CourseStatus.ACTIVE,
      deadline: '15 Dec',
      desc: 'Global and regional high-resolution atmospheric modeling runs on MoES supercomputing clusters.',
    },
    {
      code: 'AM-401',
      title: 'Aviation Meteorology & Terminal Aerodrome Forecasts',
      category: catAviation.id,
      trainer: trainers[1].id,
      level: CourseLevel.BEGINNER,
      duration: '2 weeks',
      status: CourseStatus.ACTIVE,
      deadline: '05 Dec',
      desc: 'Meteorological reporting for aviation safety, METAR, SPECI, SIGMET, and low-level wind shear warnings.',
    },
    {
      code: 'SM-501',
      title: 'Satellite Meteorology & INSAT-3DR Multispectral Imagery',
      category: catSatellite.id,
      trainer: trainers[3].id,
      level: CourseLevel.INTERMEDIATE,
      duration: '4 weeks',
      status: CourseStatus.ACTIVE,
      deadline: '10 Dec',
      desc: 'Interpretation of geostationary satellite channels, water vapor imagery, and atmospheric motion vectors.',
    },
    {
      code: 'MD-601',
      title: 'Monsoon Dynamics & Extended Range Forecasting',
      category: catTropical.id,
      trainer: trainers[0].id,
      level: CourseLevel.ADVANCED,
      duration: '5 weeks',
      status: CourseStatus.INACTIVE,
      deadline: '15 Jan',
      desc: 'Intraseasonal oscillations, MJO tracking, and monsoon trough teleconnections.',
    },
  ];

  for (const c of coursesSeed) {
    const course = await prisma.course.upsert({
      where: { code: c.code },
      update: {
        title: c.title,
        status: c.status,
      },
      create: {
        code: c.code,
        title: c.title,
        description: c.desc,
        categoryId: c.category,
        authorId: c.trainer,
        institution: 'India Meteorological Department',
        level: c.level,
        duration: c.duration,
        status: c.status,
        deadline: c.deadline,
      },
    });

    await prisma.courseTrainer.upsert({
      where: { courseId_userId: { courseId: course.id, userId: c.trainer } },
      update: {},
      create: {
        courseId: course.id,
        userId: c.trainer,
        isPrimary: true,
      },
    });

    // Enroll trainees with varied completions and realistic timeline
    const enrollmentProgresses = [85, 92, 45, 100, 60, 75, 100, 30];
    const monthsBack = [5, 4, 3, 2, 1, 0];
    for (let i = 0; i < trainees.length; i++) {
      const trainee = trainees[i];
      const prog = enrollmentProgresses[i % enrollmentProgresses.length];
      const monthOffset = monthsBack[i % monthsBack.length];
      const enrolledDate = new Date();
      enrolledDate.setMonth(enrolledDate.getMonth() - monthOffset);

      await prisma.courseEnrollment.upsert({
        where: { courseId_userId: { courseId: course.id, userId: trainee.id } },
        update: {
          completionPercentage: prog,
        },
        create: {
          courseId: course.id,
          userId: trainee.id,
          completionPercentage: prog,
          enrolledAt: enrolledDate,
          completedAt: prog === 100 ? new Date() : null,
        },
      });
    }
  }

  console.log('[Seed] 6 Courses, assigned trainers, and enrollments created.');

  // 5. Competencies
  const compData = [
    { name: 'Radar Analysis', category: 'Operational', color: '#1f5eff', target: 80, scores: [82, 78, 85, 90, 74, 88, 80, 76] },
    { name: 'Cyclone Tracking', category: 'Forecasting', color: '#10b981', target: 85, scores: [88, 84, 91, 79, 85, 87, 82, 89] },
    { name: 'Numerical Models', category: 'Modeling', color: '#f59e0b', target: 75, scores: [72, 76, 70, 80, 75, 78, 74, 71] },
    { name: 'Satellite Imagery', category: 'Observation', color: '#8b5cf6', target: 80, scores: [84, 80, 82, 86, 78, 81, 85, 83] },
    { name: 'Aviation Forecasting', category: 'Aviation', color: '#06b6d4', target: 70, scores: [75, 72, 78, 80, 71, 74, 77, 73] },
    { name: 'Agrometeorological Advisory', category: 'Agrometeorology', color: '#ec4899', target: 75, scores: [70, 74, 76, 72, 79, 75, 73, 71] },
    { name: 'Instruments Calibration', category: 'Instrumentation', color: '#6366f1', target: 80, scores: [85, 82, 79, 88, 84, 80, 81, 86] },
  ];

  for (const comp of compData) {
    const c = await prisma.competency.upsert({
      where: { name: comp.name },
      update: {
        category: comp.category,
        color: comp.color,
      },
      create: {
        name: comp.name,
        category: comp.category,
        color: comp.color,
      },
    });

    for (let tIdx = 0; tIdx < trainees.length; tIdx++) {
      const t = trainees[tIdx];
      const assignedScore = comp.scores[tIdx % comp.scores.length];
      await prisma.userCompetencyScore.upsert({
        where: { userId_competencyId: { userId: t.id, competencyId: c.id } },
        update: {
          score: assignedScore,
          targetScore: comp.target,
        },
        create: {
          userId: t.id,
          competencyId: c.id,
          score: assignedScore,
          targetScore: comp.target,
        },
      });
    }
  }

  console.log('[Seed] Competencies & score matrices populated.');

  // 6. Portal Settings
  await prisma.portalSettings.deleteMany();
  await prisma.portalSettings.create({
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
      maintenanceMode: false,
      allowPublicSignup: true,
      retakesAllowed: true,
    },
  });

  console.log('[Seed] Complete Admin Portal database seeding successfully finished!');
}

main()
  .catch((e) => {
    console.error('[Seed] Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
