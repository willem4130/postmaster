import Anthropic from '@anthropic-ai/sdk'
import { config } from 'dotenv'

// Load .env file for API keys
config()

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export interface EmailInput {
  subject: string
  body: string
  from: string
  to?: string[]
  cc?: string[]
  date?: string
}

export interface CategoryResult {
  category: string
  confidence: number
  subcategory?: string
}

export interface PriorityResult {
  score: number // 0-100
  reason: string
  urgency: 'low' | 'medium' | 'high' | 'critical'
  suggestedDeadline?: string
}

export interface SummaryResult {
  summary: string
  keyPoints: string[]
  actionItems: string[]
  sentiment: 'positive' | 'neutral' | 'negative'
}

export interface EntityResult {
  dates: Array<{ value: string; context: string }>
  amounts: Array<{ value: string; currency?: string; context: string }>
  contacts: Array<{ name?: string; email?: string; role?: string }>
  organizations: string[]
  links: string[]
}

export interface ReplyResult {
  suggestion: string
  alternatives: string[]
  tone: string
}

export interface AggregatedAnalysisData {
  threadCount: number
  categoryBreakdown: Record<string, number>
  priorityDistribution: {
    critical: number
    high: number
    medium: number
    low: number
  }
  topSenders: Array<{ email: string; count: number }>
  topDomains: Array<{ domain: string; count: number }>
  actionItems: Array<{ item: string; threadId: string; priority: 'low' | 'medium' | 'high' | 'critical' }>
  entities: {
    dates: Array<{ value: string; context: string; threadId: string }>
    amounts: Array<{ value: string; currency?: string; context: string; threadId: string }>
    contacts: Array<{ name?: string; email?: string; role?: string; threadId: string }>
    organizations: Array<{ name: string; threadId: string }>
  }
  subjects: string[]
}

export class ClaudeClient {
  // Fast model for single-email analysis (categorize, priority, entities)
  private fastModel = 'claude-3-5-haiku-20241022'
  // Smart model for complex tasks (summarize threads, suggest replies, bulk analysis)
  private smartModel = 'claude-sonnet-4-20250514'

  async categorizeEmail(email: EmailInput): Promise<CategoryResult> {
    const response = await anthropic.messages.create({
      model: this.fastModel,
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: `Categorize this email into one of these categories: work, personal, finance, shopping, travel, social, newsletters, promotions, updates, urgent, spam.

Subject: ${email.subject}
From: ${email.from}
Body:
${email.body.substring(0, 2000)}

Respond with JSON only:
{
  "category": "category_name",
  "confidence": 0.0-1.0,
  "subcategory": "optional subcategory"
}`,
        },
      ],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
    } catch {}

    return { category: 'unknown', confidence: 0 }
  }

  async scorePriority(email: EmailInput): Promise<PriorityResult> {
    const response = await anthropic.messages.create({
      model: this.fastModel,
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: `Score the priority of this email from 0-100 (100 being most urgent).

Consider:
- Explicit deadlines or time-sensitive language
- Sender importance (boss, client, etc.)
- Action required vs. informational
- Financial implications
- Keywords: urgent, ASAP, deadline, important, etc.

Subject: ${email.subject}
From: ${email.from}
Date: ${email.date || 'Unknown'}
Body:
${email.body.substring(0, 2000)}

Respond with JSON only:
{
  "score": 0-100,
  "reason": "brief explanation",
  "urgency": "low|medium|high|critical",
  "suggestedDeadline": "ISO date string if applicable, null otherwise"
}`,
        },
      ],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
    } catch {}

    return { score: 50, reason: 'Unable to determine priority', urgency: 'medium' }
  }

  async summarizeThread(messages: EmailInput[]): Promise<SummaryResult> {
    const threadContent = messages
      .map(
        (m, i) => `
--- Message ${i + 1} ---
From: ${m.from}
Date: ${m.date || 'Unknown'}
Subject: ${m.subject}

${m.body.substring(0, 1500)}
`
      )
      .join('\n')

    const response = await anthropic.messages.create({
      model: this.smartModel,
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: `Summarize this email thread concisely.

${threadContent}

Respond with JSON only:
{
  "summary": "2-3 sentence summary of the thread",
  "keyPoints": ["key point 1", "key point 2", ...],
  "actionItems": ["action item 1", "action item 2", ...],
  "sentiment": "positive|neutral|negative"
}`,
        },
      ],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
    } catch {}

    return {
      summary: 'Unable to generate summary',
      keyPoints: [],
      actionItems: [],
      sentiment: 'neutral',
    }
  }

  async extractEntities(email: EmailInput): Promise<EntityResult> {
    const response = await anthropic.messages.create({
      model: this.fastModel,
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: `Extract structured entities from this email.

Subject: ${email.subject}
From: ${email.from}
Body:
${email.body.substring(0, 3000)}

Extract:
- Dates/deadlines mentioned
- Monetary amounts
- Contact information (names, emails, roles)
- Organizations mentioned
- URLs/links

Respond with JSON only:
{
  "dates": [{"value": "ISO date or description", "context": "why this date matters"}],
  "amounts": [{"value": "100.00", "currency": "USD", "context": "what it's for"}],
  "contacts": [{"name": "John Doe", "email": "john@example.com", "role": "Client"}],
  "organizations": ["Company A", "Company B"],
  "links": ["https://example.com"]
}`,
        },
      ],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
    } catch {}

    return {
      dates: [],
      amounts: [],
      contacts: [],
      organizations: [],
      links: [],
    }
  }

  async suggestReply(messages: EmailInput[], tone: string = 'professional'): Promise<ReplyResult> {
    const threadContent = messages
      .map(
        (m, i) => `
--- Message ${i + 1} ---
From: ${m.from}
Subject: ${m.subject}

${m.body.substring(0, 1000)}
`
      )
      .join('\n')

    const toneDescriptions: Record<string, string> = {
      professional: 'Professional and business-appropriate',
      friendly: 'Warm and friendly while remaining professional',
      formal: 'Very formal and respectful',
      casual: 'Casual and conversational',
      brief: 'Concise and to the point',
    }

    const response = await anthropic.messages.create({
      model: this.smartModel,
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: `Suggest a reply to this email thread.

Tone: ${toneDescriptions[tone] || tone}

${threadContent}

Provide a suggested reply and 2 alternatives with different approaches.

Respond with JSON only:
{
  "suggestion": "The main suggested reply text",
  "alternatives": ["Alternative reply 1", "Alternative reply 2"],
  "tone": "${tone}"
}`,
        },
      ],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
    } catch {}

    return {
      suggestion: '',
      alternatives: [],
      tone,
    }
  }

  async processEmail(email: EmailInput): Promise<{
    category: CategoryResult
    priority: PriorityResult
    entities: EntityResult
  }> {
    // Run categorization, priority scoring, and entity extraction in parallel
    const [category, priority, entities] = await Promise.all([
      this.categorizeEmail(email),
      this.scorePriority(email),
      this.extractEntities(email),
    ])

    return { category, priority, entities }
  }

  async processEmailWithActionItems(email: EmailInput): Promise<{
    category: CategoryResult
    priority: PriorityResult
    entities: EntityResult
    actionItems: string[]
  }> {
    const response = await anthropic.messages.create({
      model: this.fastModel,
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: `Analyze this email comprehensively. Extract category, priority, entities, and action items.

Subject: ${email.subject}
From: ${email.from}
Date: ${email.date || 'Unknown'}
Body:
${email.body.substring(0, 2500)}

Respond with JSON only:
{
  "category": {
    "category": "work|personal|finance|shopping|travel|social|newsletters|promotions|updates|urgent|spam",
    "confidence": 0.0-1.0,
    "subcategory": "optional"
  },
  "priority": {
    "score": 0-100,
    "reason": "brief explanation",
    "urgency": "low|medium|high|critical",
    "suggestedDeadline": "ISO date or null"
  },
  "entities": {
    "dates": [{"value": "date", "context": "why it matters"}],
    "amounts": [{"value": "100.00", "currency": "USD", "context": "what for"}],
    "contacts": [{"name": "John", "email": "john@example.com", "role": "Client"}],
    "organizations": ["Company A"],
    "links": []
  },
  "actionItems": ["action item 1", "action item 2"]
}`,
        },
      ],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        return {
          category: parsed.category || { category: 'unknown', confidence: 0 },
          priority: parsed.priority || { score: 50, reason: 'Unable to determine', urgency: 'medium' },
          entities: parsed.entities || { dates: [], amounts: [], contacts: [], organizations: [], links: [] },
          actionItems: parsed.actionItems || [],
        }
      }
    } catch {}

    return {
      category: { category: 'unknown', confidence: 0 },
      priority: { score: 50, reason: 'Unable to determine', urgency: 'medium' },
      entities: { dates: [], amounts: [], contacts: [], organizations: [], links: [] },
      actionItems: [],
    }
  }

  async generateExecutiveSummary(data: AggregatedAnalysisData): Promise<string> {
    const response = await anthropic.messages.create({
      model: this.smartModel,
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: `Generate an executive summary for this batch of ${data.threadCount} emails.

Category Breakdown:
${Object.entries(data.categoryBreakdown)
  .map(([cat, count]) => `- ${cat}: ${count}`)
  .join('\n')}

Priority Distribution:
- Critical: ${data.priorityDistribution.critical}
- High: ${data.priorityDistribution.high}
- Medium: ${data.priorityDistribution.medium}
- Low: ${data.priorityDistribution.low}

Top Senders:
${data.topSenders.slice(0, 5).map((s) => `- ${s.email}: ${s.count} emails`).join('\n')}

Top Domains:
${data.topDomains.slice(0, 5).map((d) => `- ${d.domain}: ${d.count} emails`).join('\n')}

Action Items (${data.actionItems.length} total):
${data.actionItems.slice(0, 10).map((a) => `- [${a.priority}] ${a.item}`).join('\n')}

Key Dates Found: ${data.entities.dates.length}
Amounts/Money Mentioned: ${data.entities.amounts.length}
Contacts Referenced: ${data.entities.contacts.length}
Organizations Mentioned: ${data.entities.organizations.length}

Sample Subjects:
${data.subjects.slice(0, 5).map((s) => `- ${s}`).join('\n')}

Write a 2-3 paragraph executive summary that:
1. Highlights the most important patterns and urgent items
2. Identifies key action items requiring attention
3. Notes any significant dates, amounts, or contacts

Be concise and actionable. Focus on what matters most.`,
        },
      ],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    return text || 'Unable to generate executive summary.'
  }
}
