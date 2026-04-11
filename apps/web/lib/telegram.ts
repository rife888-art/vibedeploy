// Telegram notification helper
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

interface AuditNotification {
  repoName: string
  grade: string
  score: number
  summary: string
  criticalCount: number
  warningCount: number
  infoCount: number
  auditUrl: string
  prevGrade?: string | null
  prevScore?: number | null
}

function gradeEmoji(grade: string): string {
  const emojis: Record<string, string> = {
    A: '\u{1F7E2}', // green circle
    B: '\u{1F535}', // blue circle
    C: '\u{1F7E1}', // yellow circle
    D: '\u{1F7E0}', // orange circle
    F: '\u{1F534}', // red circle
  }
  return emojis[grade] || '\u{26AA}' // white circle fallback
}

function trendText(score: number, prevScore: number | null | undefined): string {
  if (prevScore == null) return ''
  const diff = score - prevScore
  if (diff > 0) return ` \u{2B06}\u{FE0F} +${diff}`
  if (diff < 0) return ` \u{2B07}\u{FE0F} ${diff}`
  return ' \u{27A1}\u{FE0F} no change'
}

export async function sendTelegramNotification(
  chatId: string,
  audit: AuditNotification
): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('TELEGRAM_BOT_TOKEN is not set')
    return false
  }

  const emoji = gradeEmoji(audit.grade)
  const trend = trendText(audit.score, audit.prevScore)

  const message = [
    `${emoji} *VibeDeploy Security Audit*`,
    '',
    `*Repo:* \`${audit.repoName}\``,
    `*Grade:* ${audit.grade} (${audit.score}/100)${trend}`,
    '',
    audit.criticalCount > 0
      ? `\u{1F6A8} ${audit.criticalCount} critical`
      : '\u{2705} 0 critical',
    `\u{26A0}\u{FE0F} ${audit.warningCount} warnings`,
    `\u{2139}\u{FE0F} ${audit.infoCount} info`,
    '',
    audit.summary,
    '',
    `[\u{1F4CB} View full report](${audit.auditUrl})`,
  ].join('\n')

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'Markdown',
          disable_web_page_preview: true,
        }),
      }
    )

    return res.ok
  } catch {
    return false
  }
}

// Verify a chat ID works by sending a test message
export async function sendTestMessage(chatId: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) return false

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: '\u{2705} VibeDeploy connected! You will receive audit notifications here.',
          parse_mode: 'Markdown',
        }),
      }
    )

    return res.ok
  } catch {
    return false
  }
}
