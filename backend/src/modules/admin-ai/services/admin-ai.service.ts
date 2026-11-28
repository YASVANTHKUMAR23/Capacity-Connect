import { Injectable, Logger } from '@nestjs/common';
import { NvidiaAiService } from './nvidia-ai.service';
import { AdminAiQueryService } from './admin-ai-query.service';

export interface AdminAiChatResponse {
  type: 'answer' | 'metric' | 'table' | 'chart' | 'error';
  message: string;
  data?: any;
  visualization?: any;
  sources?: Array<{ entity: string; metric?: string }>;
  suggestedQuestions?: string[];
  generatedAt: string;
}

@Injectable()
export class AdminAiService {
  private readonly logger = new Logger(AdminAiService.name);

  constructor(
    private readonly nvidiaAi: NvidiaAiService,
    private readonly queryService: AdminAiQueryService,
  ) {}

  async processQuery(question: string, history: Array<{ role: 'user' | 'assistant'; text: string }> = []): Promise<AdminAiChatResponse> {
    const qLower = question.toLowerCase();

    // 1. Tool execution to ground AI in actual PostgreSQL records
    let toolResult: any = null;
    let toolName = 'overview';

    if (qLower.includes('trainer') && (qLower.includes('highest') || qLower.includes('most') || qLower.includes('workload') || qLower.includes('name') || qLower.includes('top'))) {
      toolName = 'trainer_statistics';
      toolResult = await this.queryService.getTrainerStatistics();
    } else if (qLower.includes('trainer') || qLower.includes('how many trainer')) {
      toolName = 'trainer_overview';
      toolResult = await this.queryService.getTrainerStatistics();
    } else if (qLower.includes('course') && (qLower.includes('lowest') || qLower.includes('completion') || qLower.includes('fail') || qLower.includes('rate'))) {
      toolName = 'course_statistics';
      toolResult = await this.queryService.getCourseStatistics();
    } else if (qLower.includes('competenc') || qLower.includes('skill') || qLower.includes('gap')) {
      toolName = 'competency_statistics';
      toolResult = await this.queryService.getCompetencyStatistics();
    } else if (qLower.includes('division') || qLower.includes('region') || qLower.includes('hub')) {
      toolName = 'division_statistics';
      toolResult = await this.queryService.getDivisionStatistics();
    } else if (qLower.includes('enrollment') && (qLower.includes('trend') || qLower.includes('month'))) {
      toolName = 'enrollment_trend';
      toolResult = await this.queryService.getMonthlyEnrollmentTrend();
    } else {
      toolName = 'portal_overview';
      toolResult = await this.queryService.getPortalOverview();
    }

    // 2. Build system instructions with verified database facts
    const systemPrompt = `You are the Capacity Connect Admin Intelligence Assistant for the India Meteorological Department (IMD).
You answer administrator inquiries strictly grounded in authentic PostgreSQL records.
NEVER fabricate numbers, statistics, or records.
Here are the verified real-time database facts for the current query:
TOOL USED: ${toolName}
VERIFIED DATABASE DATA:
${JSON.stringify(toolResult, null, 2)}

Provide a clear, professional, concise response summarizing the requested information with exact accuracy.
If the administrator asked for names, lists, or comparisons, explain the exact rankings from the database records above.`;

    // 3. Query NVIDIA Kimi K3.1 Pro or provide structured grounded response
    let aiExplanation = '';

    if (this.nvidiaAi.isConfigured()) {
      try {
        const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
          { role: 'system', content: systemPrompt },
        ];

        // Append last 3 turns of conversation history for context
        history.slice(-3).forEach((h) => {
          messages.push({
            role: h.role,
            content: h.text,
          });
        });

        messages.push({ role: 'user', content: question });

        aiExplanation = await this.nvidiaAi.chat(messages, {
          model: 'moonshotai/kimi-k3.1-pro',
          reasoning_effort: 'low',
        });
      } catch (err: any) {
        this.logger.warn(`NVIDIA AI API call failed or timed out (${err.message}). Grounding response in local verified data.`);
        aiExplanation = this.generateGroundedSummary(toolName, toolResult, question);
      }
    } else {
      aiExplanation = this.generateGroundedSummary(toolName, toolResult, question);
    }

    // 4. Construct normalized structured response
    const response: AdminAiChatResponse = {
      type: this.determineResponseType(toolName, question),
      message: aiExplanation,
      data: toolResult,
      sources: [{ entity: this.mapToolToEntity(toolName) }],
      suggestedQuestions: [
        'How many trainers and trainees are registered?',
        'Which courses have the lowest completion rate?',
        'Show trainer workload distribution.',
        'Identify critical competency gaps across divisions.',
      ],
      generatedAt: new Date().toISOString(),
    };

    if (toolName === 'enrollment_trend') {
      response.visualization = {
        chartType: 'line',
        xKey: 'month',
        data: toolResult,
      };
    }

    return response;
  }

  private generateGroundedSummary(tool: string, data: any, question: string): string {
    if (tool === 'trainer_statistics' || tool === 'trainer_overview') {
      const top = data.topTrainersByTrainees || [];
      if (top.length > 0) {
        const listStr = top.map((t: any, idx: number) => `${idx + 1}. ${t.name} (${t.specialization}) - ${t.traineesCount} trainees across ${t.coursesCount} courses`).join('\n');
        return `Capacity Connect currently has ${data.totalTrainers} registered trainers.\n\nTop trainers by assigned trainees:\n${listStr}`;
      }
      return `Capacity Connect currently has ${data.totalTrainers} registered trainers.`;
    }

    if (tool === 'course_statistics') {
      const lowest = data.lowestCompletionCourses || [];
      const listStr = lowest.map((c: any, idx: number) => `${idx + 1}. ${c.title} (${c.code}): ${c.completionRate}% completion (${c.completed}/${c.enrolled} trainees)`).join('\n');
      return `There are ${data.totalCourses} courses in the catalog.\n\nCourses with lowest completion rates:\n${listStr}`;
    }

    if (tool === 'competency_statistics') {
      const gaps = data.criticalSkillGaps || [];
      if (gaps.length > 0) {
        const gapStr = gaps.slice(0, 5).map((g: any, idx: number) => `${idx + 1}. ${g.subject} (${g.category}) - Gap: ${g.skillGap}% (Avg: ${g.avgScore ?? 'Not assessed'}% vs Target: ${g.targetScore}%)`).join('\n');
        return `Total competencies tracked: ${data.totalCompetencies}.\n\nCritical skill gaps identified:\n${gapStr}`;
      }
      return `Total competencies tracked: ${data.totalCompetencies}. All evaluated domains are currently meeting target thresholds.`;
    }

    if (tool === 'division_statistics') {
      const divs = (data.divisions || []).slice(0, 5).map((d: any, idx: number) => `${idx + 1}. ${d.name} (${d.zone}): ${d.traineesCount} trainees`).join('\n');
      return `There are ${data.totalDivisions} active regional meteorological divisions.\n\nTop divisions by participation:\n${divs}`;
    }

    if (tool === 'enrollment_trend') {
      return `Monthly enrollment and completion trends have been computed from real-time database records across the last 6 months.`;
    }

    return `Capacity Connect Overview:\n• Registered Users: ${data.totalUsers}\n• Trainers: ${data.totalTrainers}\n• Trainees: ${data.totalTrainees}\n• Active Courses: ${data.activeCourses}\n• Course Enrollments: ${data.totalEnrollments}\n• Certificates Issued: ${data.totalCertificates}\n• Pending Approvals: ${data.pendingApprovals}`;
  }

  private determineResponseType(tool: string, q: string): 'answer' | 'table' | 'chart' {
    if (tool === 'enrollment_trend') return 'chart';
    if (tool === 'trainer_statistics' || tool === 'course_statistics') return 'table';
    return 'answer';
  }

  private mapToolToEntity(tool: string): string {
    if (tool.includes('trainer')) return 'TrainerProfile & CourseTrainer';
    if (tool.includes('course')) return 'Course & CourseEnrollment';
    if (tool.includes('competency')) return 'Competency & UserCompetencyScore';
    if (tool.includes('division')) return 'Division & UserProfile';
    return 'User';
  }
}
