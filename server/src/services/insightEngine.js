import { z } from 'zod';
import { pool } from '../db.js';
import { getAiConfig } from './aiConfig.js';
import { callAi, parseJsonContent } from './recommendationEngine.js';

const STATUS_LABELS = {
  idea: 'Ide',
  planned: 'Direncanakan',
  in_progress: 'Dikerjakan',
  done: 'Selesai',
  archived: 'Diarsipkan',
};

const aiInsightSchema = z.object({
  summary: z.string().trim().min(20).max(1200),
  strengths: z.array(z.string().trim().min(3).max(300)).max(5).optional().default([]),
  risks: z.array(z.string().trim().min(3).max(300)).max(5).optional().default([]),
  recommendedProjects: z.array(z.object({
    ideaId: z.coerce.number().int().positive(),
    reason: z.string().trim().min(5).max(400),
    nextAction: z.string().trim().min(5).max(400),
    priority: z.enum(['high', 'medium', 'low']).optional().default('medium'),
  })).max(5).optional().default([]),
  actionPlan: z.array(z.string().trim().min(3).max(400)).max(6).optional().default([]),
  encouragement: z.string().trim().max(400).optional().default(''),
});

const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, value));
const percent = (numerator, denominator) => (
  denominator > 0 ? clamp(Math.round((numerator / denominator) * 100)) : 0
);

function dateValue(value) {
  if (!value) return 0;
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    return new Date(`${value}T00:00:00+07:00`).getTime();
  }
  return new Date(value).getTime() || 0;
}

function latestDate(...values) {
  return values.reduce((latest, value) => {
    const time = dateValue(value);
    return time > latest ? time : latest;
  }, 0);
}

function scoreLabel(score, hasData) {
  if (!hasData) return 'Belum ada data';
  if (score >= 80) return 'Sangat produktif';
  if (score >= 65) return 'Produktif';
  if (score >= 50) return 'Cukup aktif';
  if (score >= 30) return 'Perlu momentum';
  return 'Mulai dari langkah kecil';
}

function mapProject(row) {
  const tasks = {
    total: Number(row.tasks_total) || 0,
    done: Number(row.tasks_done) || 0,
    inProgress: Number(row.tasks_in_progress) || 0,
    todo: Number(row.tasks_todo) || 0,
  };
  const checklist = {
    total: Number(row.checklist_total) || 0,
    done: Number(row.checklist_done) || 0,
  };

  return {
    ideaId: Number(row.id),
    title: row.title,
    category: row.category,
    status: row.status,
    updatedAt: row.updated_at,
    reminderAt: row.reminder_at,
    lastLogDate: row.last_log_date,
    lastTaskUpdate: row.last_task_update,
    lastCheckUpdate: row.last_check_update,
    loggedDays: Number(row.logged_days) || 0,
    tasks,
    checklist,
  };
}

async function loadInsightData(ownerId, periodDays) {
  const [ideaResult, taskResult, checklistResult, activityResult, dayResult, blockersResult, projectResult] = await Promise.all([
    pool.query(`
      SELECT
        count(*)::int AS total_ideas,
        count(*) FILTER (WHERE status IN ('planned', 'in_progress'))::int AS active_projects,
        count(*) FILTER (WHERE status = 'done')::int AS done_projects,
        count(*) FILTER (WHERE status = 'archived')::int AS archived_projects,
        count(*) FILTER (WHERE status = 'idea')::int AS raw_ideas,
        count(*) FILTER (WHERE created_at >= NOW() - ($2::int * INTERVAL '1 day'))::int AS new_ideas,
        count(*) FILTER (WHERE status = 'done' AND updated_at >= NOW() - ($2::int * INTERVAL '1 day'))::int AS completed_in_period,
        count(*) FILTER (WHERE status IN ('planned', 'in_progress') AND updated_at < NOW() - INTERVAL '14 days')::int AS stale_projects,
        count(*) FILTER (
          WHERE reminder_at IS NOT NULL
            AND reminder_at < NOW()
            AND status NOT IN ('done', 'archived')
        )::int AS overdue_reminders
      FROM ideas
      WHERE owner_id = $1
    `, [ownerId, periodDays]),
    pool.query(`
      SELECT
        count(*)::int AS total,
        count(*) FILTER (WHERE t.status = 'done')::int AS done,
        count(*) FILTER (WHERE t.status = 'in_progress')::int AS in_progress,
        count(*) FILTER (WHERE t.status = 'todo')::int AS todo,
        count(*) FILTER (
          WHERE t.status = 'done'
            AND t.updated_at >= NOW() - ($2::int * INTERVAL '1 day')
        )::int AS completed_in_period
      FROM monitoring_tasks t
      JOIN ideas i ON i.id = t.idea_id
      WHERE i.owner_id = $1
    `, [ownerId, periodDays]),
    pool.query(`
      SELECT
        count(DISTINCT ci.id)::int AS total_items,
        count(DISTINCT cc.item_id)::int AS done_items
      FROM monitoring_checklist_items ci
      JOIN ideas i ON i.id = ci.idea_id
      LEFT JOIN monitoring_checklist_checks cc
        ON cc.item_id = ci.id
       AND cc.is_done
       AND cc.log_date >= CURRENT_DATE - ($2::int)
      WHERE i.owner_id = $1 AND ci.archived_at IS NULL
    `, [ownerId, periodDays]),
    pool.query(`
      WITH activity_dates AS (
        SELECT d.log_date
        FROM monitoring_days d
        JOIN ideas i ON i.id = d.idea_id
        WHERE i.owner_id = $1
        UNION
        SELECT cc.log_date
        FROM monitoring_checklist_checks cc
        JOIN monitoring_checklist_items ci ON ci.id = cc.item_id
        JOIN ideas i ON i.id = ci.idea_id
        WHERE i.owner_id = $1
        UNION
        SELECT t.worked_on
        FROM monitoring_tasks t
        JOIN ideas i ON i.id = t.idea_id
        WHERE i.owner_id = $1 AND t.worked_on IS NOT NULL
      )
      SELECT
        count(*) FILTER (WHERE log_date >= CURRENT_DATE - ($2::int))::int AS active_days,
        count(*) FILTER (
          WHERE log_date >= CURRENT_DATE - ($2::int * 2)
            AND log_date < CURRENT_DATE - ($2::int)
        )::int AS previous_active_days,
        count(*) FILTER (WHERE log_date >= CURRENT_DATE - 6)::int AS last_7_days,
        count(*) FILTER (
          WHERE log_date >= CURRENT_DATE - 13
            AND log_date < CURRENT_DATE - 6
        )::int AS previous_7_days
      FROM activity_dates
    `, [ownerId, periodDays]),
    pool.query(`
      SELECT
        count(*) FILTER (WHERE d.log_date >= CURRENT_DATE - ($2::int))::int AS logged_days,
        count(*) FILTER (
          WHERE d.log_date >= CURRENT_DATE - ($2::int)
            AND btrim(d.notes) <> ''
        )::int AS note_days,
        count(*) FILTER (
          WHERE d.log_date >= CURRENT_DATE - ($2::int)
            AND btrim(d.blockers) <> ''
        )::int AS blocker_days,
        max(d.log_date)::text AS last_log_date
      FROM monitoring_days d
      JOIN ideas i ON i.id = d.idea_id
      WHERE i.owner_id = $1
    `, [ownerId, periodDays]),
    pool.query(`
      SELECT d.idea_id, i.title, d.log_date::text AS log_date, btrim(d.blockers) AS blockers
      FROM monitoring_days d
      JOIN ideas i ON i.id = d.idea_id
      WHERE i.owner_id = $1
        AND btrim(d.blockers) <> ''
        AND d.log_date >= CURRENT_DATE - ($2::int)
      ORDER BY d.log_date DESC, d.id DESC
      LIMIT 5
    `, [ownerId, periodDays]),
    pool.query(`
      SELECT i.id, i.title, i.category, i.status::text AS status,
             i.updated_at, i.reminder_at,
             (SELECT count(*) FROM monitoring_tasks t WHERE t.idea_id = i.id)::int AS tasks_total,
             (SELECT count(*) FROM monitoring_tasks t WHERE t.idea_id = i.id AND t.status = 'done')::int AS tasks_done,
             (SELECT count(*) FROM monitoring_tasks t WHERE t.idea_id = i.id AND t.status = 'in_progress')::int AS tasks_in_progress,
             (SELECT count(*) FROM monitoring_tasks t WHERE t.idea_id = i.id AND t.status = 'todo')::int AS tasks_todo,
             (SELECT count(*) FROM monitoring_days d
               WHERE d.idea_id = i.id AND d.log_date >= CURRENT_DATE - ($2::int))::int AS logged_days,
             (SELECT max(d.log_date)::text FROM monitoring_days d WHERE d.idea_id = i.id) AS last_log_date,
             (SELECT max(t.updated_at) FROM monitoring_tasks t WHERE t.idea_id = i.id) AS last_task_update,
             (SELECT max(cc.updated_at)
                FROM monitoring_checklist_checks cc
                JOIN monitoring_checklist_items ci ON ci.id = cc.item_id
               WHERE ci.idea_id = i.id) AS last_check_update,
             (SELECT count(*) FROM monitoring_checklist_items ci
               WHERE ci.idea_id = i.id AND ci.archived_at IS NULL)::int AS checklist_total,
             (SELECT count(DISTINCT cc.item_id)
                FROM monitoring_checklist_checks cc
                JOIN monitoring_checklist_items ci ON ci.id = cc.item_id
               WHERE ci.idea_id = i.id
                 AND cc.is_done
                 AND cc.log_date >= CURRENT_DATE - ($2::int))::int AS checklist_done
      FROM ideas i
      WHERE i.owner_id = $1 AND i.status IN ('idea', 'planned', 'in_progress')
      ORDER BY i.updated_at DESC, i.id DESC
      LIMIT 12
    `, [ownerId, periodDays]),
  ]);

  const ideas = ideaResult.rows[0] || {};
  const tasks = taskResult.rows[0] || {};
  const checklist = checklistResult.rows[0] || {};
  const activity = activityResult.rows[0] || {};
  const days = dayResult.rows[0] || {};

  return {
    periodDays,
    ideas: {
      total: Number(ideas.total_ideas) || 0,
      active: Number(ideas.active_projects) || 0,
      done: Number(ideas.done_projects) || 0,
      archived: Number(ideas.archived_projects) || 0,
      raw: Number(ideas.raw_ideas) || 0,
      newInPeriod: Number(ideas.new_ideas) || 0,
      completedInPeriod: Number(ideas.completed_in_period) || 0,
      stale: Number(ideas.stale_projects) || 0,
      overdueReminders: Number(ideas.overdue_reminders) || 0,
    },
    tasks: {
      total: Number(tasks.total) || 0,
      done: Number(tasks.done) || 0,
      inProgress: Number(tasks.in_progress) || 0,
      todo: Number(tasks.todo) || 0,
      completedInPeriod: Number(tasks.completed_in_period) || 0,
    },
    checklist: {
      totalItems: Number(checklist.total_items) || 0,
      doneItems: Number(checklist.done_items) || 0,
    },
    activity: {
      activeDays: Number(activity.active_days) || 0,
      previousActiveDays: Number(activity.previous_active_days) || 0,
      last7Days: Number(activity.last_7_days) || 0,
      previous7Days: Number(activity.previous_7_days) || 0,
      loggedDays: Number(days.logged_days) || 0,
      noteDays: Number(days.note_days) || 0,
      blockerDays: Number(days.blocker_days) || 0,
      lastLogDate: days.last_log_date || null,
    },
    blockers: blockersResult.rows.map((row) => ({
      ideaId: Number(row.idea_id),
      title: row.title,
      date: row.log_date,
      text: row.blockers,
    })),
    projects: projectResult.rows.map(mapProject),
  };
}

function computeMetrics(data) {
  const { periodDays, ideas, tasks, checklist, activity } = data;
  const taskExecution = tasks.total > 0 ? percent(tasks.done, tasks.total) : null;
  const checklistExecution = checklist.totalItems > 0
    ? percent(checklist.doneItems, checklist.totalItems)
    : null;
  const execution = taskExecution ?? checklistExecution ?? 0;
  const completionBase = Math.max(0, ideas.total - ideas.archived);
  const completion = percent(ideas.done, completionBase);
  const targetActiveDays = Math.max(1, Math.round((periodDays * 5) / 7));
  const consistency = clamp(Math.round((activity.activeDays / targetActiveDays) * 100));
  const recentRate = activity.last7Days / 7;
  const previousRate = activity.previous7Days / 7;
  const momentum = (activity.last7Days === 0 && activity.previous7Days === 0)
    ? 0
    : clamp(Math.round(50 + ((recentRate - previousRate) * 100)));
  const score = (ideas.total === 0)
    ? 0
    : Math.round(
      (execution * 0.35)
      + (consistency * 0.25)
      + (completion * 0.2)
      + (momentum * 0.2)
    );

  return {
    execution,
    consistency,
    completion,
    momentum,
    score,
    targetActiveDays,
  };
}

function buildRecommendedProjects(data) {
  return data.projects
    .map((project) => {
      const taskRatio = project.tasks.total > 0
        ? project.tasks.done / project.tasks.total
        : 0;
      const checklistRatio = project.checklist.total > 0
        ? project.checklist.done / project.checklist.total
        : 0;
      const lastActivity = latestDate(
        project.updatedAt,
        project.lastLogDate,
        project.lastTaskUpdate,
        project.lastCheckUpdate
      );
      const idleDays = Math.max(0, Math.floor((Date.now() - lastActivity) / (24 * 60 * 60 * 1000)));
      const overdueReminder = project.reminderAt
        && new Date(project.reminderAt).getTime() < Date.now();

      let points = project.status === 'in_progress'
        ? 30
        : project.status === 'planned' ? 20 : 5;
      if (idleDays <= 3) points += 25;
      else if (idleDays <= 7) points += 18;
      else if (idleDays <= 14) points += 10;
      else if (idleDays > 21) points -= 10;
      points += taskRatio * 20;
      points += checklistRatio * 10;
      points += Math.min(15, project.loggedDays * 2);
      if (overdueReminder) points += 15;

      const statusLabel = STATUS_LABELS[project.status] || project.status;
      const reasonParts = [`Status ${statusLabel.toLowerCase()}`];
      if (project.tasks.total > 0) {
        reasonParts.push(`${project.tasks.done}/${project.tasks.total} task selesai`);
      }
      if (project.checklist.total > 0) {
        reasonParts.push(`${project.checklist.done}/${project.checklist.total} checklist tercapai`);
      }
      reasonParts.push(
        idleDays === 0 ? 'diperbarui hari ini' : `terakhir aktif ${idleDays} hari lalu`
      );

      let reason = `${reasonParts.join(', ')}.`;
      if (taskRatio >= 0.6) {
        reason += ' Progres task sudah tinggi; sisa pekerjaan relatif kecil.';
      } else if (idleDays > 14) {
        reason += ' Proyek perlu sesi reaktivasi agar tidak kehilangan momentum.';
      } else {
        reason += ' Momentum masih segar untuk dilanjutkan.';
      }

      let nextAction = 'Tetapkan definisi selesai dan jadwalkan review proyek minggu ini.';
      if (project.tasks.todo > 0) {
        nextAction = `Selesaikan ${Math.min(project.tasks.todo, 3)} task prioritas dan catat progresnya hari ini.`;
      } else if (project.tasks.inProgress > 0) {
        nextAction = 'Tuntaskan task yang sedang berjalan, lalu tandai selesai.';
      } else if (project.checklist.total > project.checklist.done) {
        nextAction = `Centang ${project.checklist.total - project.checklist.done} item checklist yang belum selesai.`;
      } else if (project.tasks.total === 0) {
        nextAction = 'Pecah proyek menjadi 3 task kecil dan jadwalkan sesi kerja pertama.';
      }

      return {
        ideaId: project.ideaId,
        title: project.title,
        category: project.category,
        status: project.status,
        priority: points >= 65 ? 'high' : points >= 40 ? 'medium' : 'low',
        reason,
        nextAction,
        _points: points,
      };
    })
    .sort((left, right) => right._points - left._points)
    .slice(0, 3)
    .map((project) => ({
      ideaId: project.ideaId,
      title: project.title,
      category: project.category,
      status: project.status,
      priority: project.priority,
      reason: project.reason,
      nextAction: project.nextAction,
    }));
}

function buildLocalReport(data, aiAvailable = false) {
  const metrics = computeMetrics(data);
  const recommendedProjects = buildRecommendedProjects(data);
  const { periodDays, ideas, tasks, checklist, activity, blockers } = data;
  const hasData = ideas.total > 0;

  const strengths = [];
  if (metrics.execution >= 70 && tasks.total > 0) {
    strengths.push(`Eksekusi kuat: ${tasks.done} dari ${tasks.total} task sudah selesai.`);
  }
  if (metrics.consistency >= 70) {
    strengths.push(`Ritme kerja terjaga: aktif di ${activity.activeDays} hari dalam ${periodDays} hari terakhir.`);
  }
  if (metrics.completion >= 50) {
    strengths.push(`Pipeline sehat: ${ideas.done} ide sudah selesai dan ${ideas.active} masih berjalan.`);
  }
  if (metrics.momentum >= 65) {
    strengths.push('Momentum naik dibanding pekan sebelumnya.');
  }
  if (ideas.newInPeriod > 0) {
    strengths.push(`${ideas.newInPeriod} ide baru masuk pada periode ini.`);
  }
  if (strengths.length === 0) {
    strengths.push(hasData
      ? 'Sudah ada bahan untuk dianalisis; mulai dengan satu langkah kecil hari ini.'
      : 'Belum ada aktivitas, tetapi kamu bisa memulai dari satu ide sederhana.');
  }

  const risks = [];
  if (ideas.stale > 0) {
    risks.push(`${ideas.stale} proyek aktif tidak diperbarui lebih dari 14 hari.`);
  }
  if (ideas.overdueReminders > 0) {
    risks.push(`${ideas.overdueReminders} pengingat sudah terlewat dan perlu ditindaklanjuti.`);
  }
  if (tasks.todo > 0) {
    risks.push(`${tasks.todo} task belum dikerjakan; pecah menjadi langkah yang lebih kecil bila terasa berat.`);
  }
  if (activity.blockerDays > 0) {
    risks.push(`Blocker tercatat di ${activity.blockerDays} hari. Tinjau hambatan yang berulang.`);
  }
  if (ideas.active > 3) {
    risks.push(`Fokus terpecah: ada ${ideas.active} proyek aktif sekaligus.`);
  }
  if (activity.activeDays === 0) {
    risks.push('Tidak ada aktivitas monitoring pada periode ini.');
  }
  if (risks.length === 0) {
    risks.push('Tidak ada risiko besar yang terdeteksi dari data saat ini.');
  }

  const actionPlan = [];
  if (recommendedProjects[0]) {
    actionPlan.push(`Fokus utama: selesaikan "${recommendedProjects[0].title}" — ${recommendedProjects[0].nextAction}`);
  }
  if (ideas.stale > 0) {
    actionPlan.push(`Jadwalkan 30 menit untuk mereaktivasi ${ideas.stale} proyek yang sudah lama tidak diperbarui.`);
  }
  if (activity.blockerDays > 0) {
    actionPlan.push(`Tuliskan solusi untuk blocker yang muncul di ${activity.blockerDays} hari terakhir.`);
  }
  if (ideas.overdueReminders > 0) {
    actionPlan.push(`Tuntaskan ${ideas.overdueReminders} pengingat yang sudah terlewat.`);
  }
  actionPlan.push(`Catat progres minimal ${Math.min(3, Math.max(1, metrics.targetActiveDays))} hari lagi agar skor konsistensi naik.`);

  const topProject = recommendedProjects[0]?.title;
  const summary = hasData
    ? `Dalam ${periodDays} hari terakhir, kamu aktif di ${activity.activeDays} hari dengan ${tasks.done} dari ${tasks.total} task selesai. ${ideas.done} ide sudah selesai dan ${ideas.active} masih berjalan.${topProject ? ` Prioritas terdekat adalah "${topProject}".` : ''}`
    : 'Belum ada ide atau aktivitas monitoring. Tambahkan ide pertama, lalu catat progres harian agar insight produktivitas bisa dianalisis.';

  let encouragement = 'Mulai dari satu task kecil hari ini; konsistensi lebih penting daripada lonjakan sesekali.';
  if (metrics.score >= 80) {
    encouragement = 'Momentummu sangat kuat. Pertahankan ritme dan tutup satu proyek sebelum menambah beban baru.';
  } else if (metrics.score >= 60) {
    encouragement = 'Kamu sudah berada di jalur yang baik. Fokuskan energi pada satu proyek hingga selesai.';
  } else if (metrics.score >= 40) {
    encouragement = 'Ada fondasi yang bisa didorong. Pilih satu proyek dan tetapkan target kecil yang realistis.';
  }

  return {
    period: periodDays,
    generatedAt: new Date().toISOString(),
    source: 'local',
    warning: null,
    aiAvailable,
    score: metrics.score,
    scoreLabel: scoreLabel(metrics.score, hasData),
    summary,
    encouragement,
    subscores: {
      execution: metrics.execution,
      consistency: metrics.consistency,
      completion: metrics.completion,
      momentum: metrics.momentum,
    },
    metrics: {
      ...ideas,
      tasks,
      checklist,
      activity,
      completionRate: metrics.completion,
      executionRate: metrics.execution,
      consistencyRate: metrics.consistency,
      momentumRate: metrics.momentum,
    },
    strengths,
    risks,
    recommendedProjects,
    actionPlan: actionPlan.slice(0, 5),
    recentBlockers: blockers.slice(0, 3),
  };
}

function mergeAiReport(localReport, aiReport, data) {
  const projectMap = new Map(data.projects.map((project) => [project.ideaId, project]));
  const recommended = aiReport.recommendedProjects
    .map((item) => {
      const project = projectMap.get(item.ideaId);
      if (!project) return null;
      return {
        ideaId: project.ideaId,
        title: project.title,
        category: project.category,
        status: project.status,
        priority: item.priority,
        reason: item.reason,
        nextAction: item.nextAction,
      };
    })
    .filter(Boolean)
    .slice(0, 3);

  return {
    ...localReport,
    source: 'ai',
    warning: null,
    summary: aiReport.summary,
    strengths: aiReport.strengths.length ? aiReport.strengths : localReport.strengths,
    risks: aiReport.risks.length ? aiReport.risks : localReport.risks,
    recommendedProjects: recommended.length ? recommended : localReport.recommendedProjects,
    actionPlan: aiReport.actionPlan.length ? aiReport.actionPlan : localReport.actionPlan,
    encouragement: aiReport.encouragement || localReport.encouragement,
  };
}

async function analyzeWithAi(data, localReport, ai) {
  if (!ai.enabled) {
    return {
      ...localReport,
      warning: 'AI belum dikonfigurasi; insight dihitung dari metrik lokal.',
    };
  }

  const projectSummary = data.projects.map((project) => ({
    ideaId: project.ideaId,
    title: project.title,
    category: project.category,
    status: project.status,
    tasks: project.tasks,
    checklist: project.checklist,
    loggedDays: project.loggedDays,
  }));

  const systemPrompt = [
    'Anda adalah coach produktivitas dan product manager untuk pekerja kreatif di Indonesia.',
    'Analisis data kerja pengguna secara realistis, suportif, dan langsung dapat ditindaklanjuti.',
    'Gunakan hanya data yang diberikan. Jangan mengarang angka, proyek, atau penyebab yang tidak ada di data.',
    'Sebut proyek hanya dengan ideaId yang tersedia.',
    'Tulis dalam Bahasa Indonesia yang ringkas dan natural, tanpa markdown.',
    'Balas hanya dengan JSON valid.',
  ].join(' ');

  const userPrompt = [
    `Periode analisis: ${data.periodDays} hari terakhir.`,
    `Metrik: ${JSON.stringify(localReport.metrics)}`,
    `Skor produktivitas yang sudah dihitung server: ${localReport.score}/100 (${localReport.scoreLabel}).`,
    `Proyek aktif: ${JSON.stringify(projectSummary)}`,
    `Blocker terbaru: ${JSON.stringify(data.blockers.slice(0, 5))}`,
    'Buat laporan insight dengan format JSON:',
    '{"summary":"ringkasan 2-4 kalimat","strengths":["kekuatan konkret"],"risks":["risiko konkret"],"recommendedProjects":[{"ideaId":1,"reason":"alasan berbasis data","nextAction":"langkah berikutnya","priority":"high|medium|low"}],"actionPlan":["aksi prioritas"],"encouragement":"satu kalimat penyemangat"}',
    'Isi strengths/risks maksimal 4, recommendedProjects maksimal 3, actionPlan maksimal 4.',
    'Jangan mengubah skor atau subscores; fokus pada interpretasi dan rekomendasi.',
  ].join('\n');

  try {
    const content = await callAi([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], 0.4, ai);
    const parsed = aiInsightSchema.parse(parseJsonContent(content));
    return mergeAiReport(localReport, parsed, data);
  } catch (error) {
    console.warn('[insights] AI gagal, memakai analisis lokal:', error.message);
    return {
      ...localReport,
      warning: 'AI tidak tersedia; insight dihitung dari metrik lokal.',
    };
  }
}

export async function buildInsightReport({ ownerId, periodDays = 30, useAi = false }) {
  const [data, ai] = await Promise.all([
    loadInsightData(ownerId, periodDays),
    getAiConfig(),
  ]);
  const localReport = buildLocalReport(data, ai.enabled);
  if (!useAi) return localReport;
  return analyzeWithAi(data, localReport, ai);
}
