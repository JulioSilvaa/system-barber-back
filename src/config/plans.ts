export type Plan = 'BASIC' | 'PRO';

export const TRIAL_DAYS = 30;

const PLAN_MODULES: Record<Plan, string[]> = {
  BASIC: [],
  PRO: ['COPILOT', 'WHATSAPP', 'MARKETING'],
};

function readPriceCents(raw: string | undefined, fallbackCents: number): number {
  if (!raw) return fallbackCents;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallbackCents;
  return Math.round(parsed * 100);
}

export function getPlanPriceCents(plan: Plan): number {
  switch (plan) {
    case 'BASIC':
      return readPriceCents(process.env.PLAN_PRICE_BASIC, 9990);
    case 'PRO':
      return readPriceCents(process.env.PLAN_PRICE_PRO, 19990);
  }
}

export { PLAN_MODULES };

export function isPlan(value: unknown): value is Plan {
  return value === 'BASIC' || value === 'PRO';
}
