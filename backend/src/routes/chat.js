import { Router } from 'express';
import { run, newId, getAll, getOne, saveDb } from '../db/db.js';
import { authenticate, tenantGuard } from '../middleware/auth.js';
import { classifyIntent, generateResponse } from '../services/gemini.js';
import { ragAnswer } from '../services/rag.js';

const router = Router();
router.use(authenticate, tenantGuard);

/**
 * POST /api/chat/message — Send a message to the AI assistant
 * Routes through Gemini-powered intent classification → worker delegation
 */
router.post('/message', async (req, res) => {
  try {
    const { message, thread_id } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    const threadId = thread_id || newId();

    // Store user message
    const userMsgId = newId();
    run(
      `INSERT INTO chat_history (id, tenant_id, user_id, thread_id, role, content)
       VALUES (?, ?, ?, ?, 'user', ?)`,
      userMsgId, req.tenantId, req.user.id, threadId, message
    );

    // Step 1: Classify intent using Gemini
    let intentResult;
    try {
      intentResult = await classifyIntent(message, req.user.role);
    } catch (err) {
      console.error('[chat] Intent classification failed, using fallback:', err.message);
      intentResult = fallbackClassify(message);
    }

    const { intent, worker } = intentResult;

    // Step 2: Route to appropriate worker
    let response;
    try {
      response = await routeToWorker(intent, worker, message, req.user, req.tenantId, threadId);
    } catch (err) {
      console.error('[chat] Worker failed, using fallback:', err.message);
      const errMsg = err.message?.includes('429') || err.message?.includes('quota')
        ? '⏳ The AI service is temporarily rate-limited. Please wait a moment and try again.\n\n_The system uses your request data locally, so no information is lost._'
        : `I encountered an issue processing your request. Please try again.\n\n_Error: ${err.message}_`;
      response = { content: errMsg, citations: [] };
    }

    // Step 3: Store assistant response
    const assistantMsgId = newId();
    run(
      `INSERT INTO chat_history (id, tenant_id, user_id, thread_id, role, content, intent, worker, citations)
       VALUES (?, ?, ?, ?, 'assistant', ?, ?, ?, ?)`,
      assistantMsgId, req.tenantId, req.user.id, threadId,
      response.content, intent, worker,
      response.citations?.length ? JSON.stringify(response.citations) : null
    );
    saveDb();

    res.json({
      thread_id: threadId,
      message: {
        id: assistantMsgId,
        content: response.content,
        intent,
        confidence: intentResult.confidence,
        worker,
        citations: response.citations || []
      }
    });
  } catch (err) {
    console.error('[chat/message]', err);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

/**
 * Route message to the appropriate worker based on intent.
 */
async function routeToWorker(intent, worker, message, user, tenantId, threadId) {
  switch (intent) {
    case 'policy_question':
      return await handlePolicyQuestion(message, tenantId);

    case 'checklist_status':
      return handleChecklistStatus(user, tenantId);

    case 'reminder_request':
      return await handleReminderRequest(message, user, tenantId);

    case 'metrics_query':
      return handleMetricsQuery(tenantId, user);

    case 'task_creation':
      return await handleTaskCreation(message, user, tenantId);

    case 'feedback':
      return { content: "Thank you for your feedback! 💬 It helps us improve the assistant. Your input has been recorded.", citations: [] };

    default:
      return await handleGeneralQuestion(message, user, tenantId);
  }
}

/**
 * Policy question → RAG pipeline
 */
async function handlePolicyQuestion(message, tenantId) {
  const result = await ragAnswer(message, tenantId);
  const citations = result.citations.map(c => `${c.source} (${c.section})`);
  return { content: result.answer, citations };
}

/**
 * Checklist status → DB query
 */
function handleChecklistStatus(user, tenantId) {
  const progress = getAll(
    `SELECT op.status, ot.title, ot.category
     FROM onboarding_progress op
     JOIN onboarding_tasks ot ON op.task_id = ot.id
     WHERE op.user_id = ? AND op.tenant_id = ?
     ORDER BY ot.order_index`, user.id, tenantId
  );

  if (progress.length === 0) {
    return { content: "You don't have any onboarding tasks assigned yet. Check with HR if you're a new hire!", citations: [] };
  }

  const completed = progress.filter(p => p.status === 'completed').length;
  const total = progress.length;
  const pct = Math.round((completed / total) * 100);

  let content = `## 📋 Your Onboarding Progress\n\n`;
  content += `**Score**: ${pct}% (${completed}/${total} tasks)\n\n`;

  for (const p of progress) {
    const icon = p.status === 'completed' ? '✅' : p.status === 'in_progress' ? '🔄' : '⬜';
    content += `${icon} **${p.title}** — _${p.status.replace('_', ' ')}_\n`;
  }

  if (completed < total) {
    const next = progress.find(p => p.status !== 'completed');
    content += `\n💡 **Next up**: ${next?.title}`;
  } else {
    content += `\n🎉 **Congratulations!** You've completed all onboarding tasks!`;
  }

  return { content, citations: [] };
}

/**
 * Reminder request → Create reminder
 */
async function handleReminderRequest(message, user, tenantId) {
  const prompt = `Extract reminder details from this message. Return JSON only:
{"title": "...", "due_description": "...", "due_days_from_now": <number>}
Message: "${message}"`;

  try {
    const result = await generateResponse('You extract structured data from messages. Return valid JSON only.', prompt);
    const parsed = JSON.parse(result);

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (parsed.due_days_from_now || 1));

    run(
      `INSERT INTO reminders (id, tenant_id, user_id, title, message, due_at, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      newId(), tenantId, user.id, parsed.title || 'Reminder',
      message, dueDate.toISOString()
    );
    saveDb();

    return {
      content: `✅ **Reminder set!**\n\n📌 **${parsed.title}**\n📅 Due: ${dueDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}\n\nI'll notify you when it's due.`,
      citations: []
    };
  } catch {
    return { content: "I'd like to set that reminder, but I couldn't parse the details. Could you specify what to remind you about and when?", citations: [] };
  }
}

/**
 * Metrics query → Analytics data
 */
function handleMetricsQuery(tenantId, user) {
  const managerRoles = ['admin', 'hr', 'manager', 'team_lead'];
  if (!managerRoles.includes(user.role)) {
    return { content: "📊 Detailed team metrics are available to managers and team leads. You can view your personal onboarding progress instead!", citations: [] };
  }

  const metrics = getAll(
    `SELECT metric_type, value, period_start, period_end FROM metrics
     WHERE tenant_id = ? AND period = 'weekly' ORDER BY computed_at DESC LIMIT 10`, tenantId
  );

  const totalUsers = getOne('SELECT COUNT(*) as count FROM users WHERE tenant_id = ? AND is_active = 1', tenantId)?.count || 0;
  const newHires = getOne("SELECT COUNT(*) as count FROM users WHERE tenant_id = ? AND role = 'new_hire'", tenantId)?.count || 0;

  let content = `## 📊 Team Metrics Summary\n\n`;
  content += `👥 **Team Size**: ${totalUsers} members (${newHires} new hires)\n\n`;
  content += `### Weekly Metrics\n`;

  for (const m of metrics) {
    const label = m.metric_type.replace(/_/g, ' ');
    const unit = m.metric_type.includes('time') ? ' days' : m.metric_type.includes('rate') ? '%' : m.metric_type.includes('hours') ? ' hrs' : '';
    content += `| ${label} | **${m.value}${unit}** |\n`;
  }

  content += `\n_Period: ${metrics[0]?.period_start} to ${metrics[0]?.period_end}_`;
  return { content, citations: [] };
}

/**
 * Task creation → Generate action item
 */
async function handleTaskCreation(message, user, tenantId) {
  return {
    content: `✅ **Action item noted!**\n\nI've recorded your request. In the full system, this would create a tracked task visible on your dashboard.\n\n_Request: "${message}"_`,
    citations: []
  };
}

/**
 * General question → Gemini direct + RAG context
 */
async function handleGeneralQuestion(message, user, tenantId) {
  // Try RAG first to see if docs have relevant info
  const ragResult = await ragAnswer(message, tenantId);
  if (ragResult.chunks_used > 0) {
    return { content: ragResult.answer, citations: ragResult.citations.map(c => `${c.source} (${c.section})`) };
  }

  // Fall back to general assistant
  const systemPrompt = `You are ITIS, an onboarding and team intelligence assistant for Acme Corp.
You help employees with:
- Company policies and HR questions
- Onboarding checklists and progress
- Setting reminders and action items
- Team metrics and performance data

Be helpful, concise, and professional. If asked about specific policies and you don't have the information, recommend checking with HR.
The user's name is ${user.display_name} and their role is ${user.role}.`;

  const answer = await generateResponse(systemPrompt, message);
  return { content: answer, citations: [] };
}

/**
 * Fallback classifier when Gemini is unavailable.
 */
function fallbackClassify(message) {
  const lower = message.toLowerCase();
  if (lower.match(/policy|benefit|leave|pto|vacation|handbook|rule|insurance|dental|401k|salary/)) return { intent: 'policy_question', confidence: 0.7, worker: 'onboarding-rag' };
  if (lower.match(/checklist|progress|task|onboarding|todo|setup|training/)) return { intent: 'checklist_status', confidence: 0.7, worker: 'onboarding-rag' };
  if (lower.match(/remind|reminder|schedule|deadline|due|notify/)) return { intent: 'reminder_request', confidence: 0.7, worker: 'action-generator' };
  if (lower.match(/metric|velocity|sprint|dashboard|team|performance|cycle|lead time/)) return { intent: 'metrics_query', confidence: 0.7, worker: 'metrics-analyzer' };
  if (lower.match(/feedback|rate|rating|helpful/)) return { intent: 'feedback', confidence: 0.7, worker: 'onboarding-rag' };
  return { intent: 'general_question', confidence: 0.5, worker: 'onboarding-rag' };
}

/**
 * GET /api/chat/history/:threadId
 */
router.get('/history/:threadId', (req, res) => {
  const messages = getAll(
    `SELECT id, role, content, intent, worker, citations, created_at
     FROM chat_history WHERE thread_id = ? AND tenant_id = ? AND user_id = ?
     ORDER BY created_at ASC`,
    req.params.threadId, req.tenantId, req.user.id
  );
  res.json({ messages });
});

export default router;
