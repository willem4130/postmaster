import Anthropic from '@anthropic-ai/sdk'

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

export class ClaudeClient {
  private model = 'claude-3-5-sonnet-20241022'

  async categorizeEmail(email: EmailInput): Promise<CategoryResult> {
    const response = await anthropic.messages.create({
      model: this.model,
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
      model: this.model,
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
      model: this.model,
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
      model: this.model,
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
      model: this.model,
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
}
