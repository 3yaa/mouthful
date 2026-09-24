export interface Score {
	mu: number;
	phi: number;
}

export const TIERS = [
	"Goosebumps",
	"Exceptional",
	"Amazing",
	"Good",
	"Pretty good",
	"Average",
	"Off-key",
	"Bad",
	"Appalling",
] as const;

export type Tier = (typeof TIERS)[number];

export const TIER_THRESHOLDS: Record<
	Tier,
	{ min: number; muMin: number; muMax: number; seed: number }
> = {
	Goosebumps: { min: 10.0, muMin: 2000, muMax: Infinity, seed: 2100 },
	Exceptional: { min: 9.0, muMin: 1800, muMax: 2000, seed: 1900 },
	Amazing: { min: 8.0, muMin: 1600, muMax: 1800, seed: 1700 },
	Good: { min: 7.0, muMin: 1400, muMax: 1600, seed: 1500 },
	"Pretty good": { min: 6.0, muMin: 1200, muMax: 1400, seed: 1300 },
	Average: { min: 5.0, muMin: 1000, muMax: 1200, seed: 1100 },
	"Off-key": { min: 4.0, muMin: 800, muMax: 1000, seed: 900 },
	Bad: { min: 2.0, muMin: 400, muMax: 800, seed: 600 },
	Appalling: { min: 1.0, muMin: 0, muMax: 400, seed: 200 },
};

export const TIER_PHI_THRESHOLD: Record<Tier, number> = {
	Goosebumps: 1,
	Exceptional: 130,
	Amazing: 130,
	Good: 130,
	"Pretty good": 135,
	Average: 135,
	"Off-key": 135,
	Bad: 180,
	Appalling: 180,
};

export const getTierFromMu = (mu: number): Tier => {
	for (const [name, tier] of Object.entries(TIER_THRESHOLDS)) {
		if (mu >= tier.muMin) return name as Tier;
	}
	return "Appalling";
};

export const getSeedMu = (tier: Tier): number => {
	return TIER_THRESHOLDS[tier].seed;
};

// just within own tier
export const getTierAdjacentRange = (
	tier: Tier,
): { min: number; max: number } => {
	const current = TIER_THRESHOLDS[tier];
	return {
		min: current.muMin,
		max: current.muMax,
	};
};

export const getDisplayScore = (mu: number): number => {
	return Math.min(10, Math.max(0, Math.floor((mu / 200) * 10) / 10));
};

// display score moves in 0.1 steps, and 0.1 == 20 mu
const MU_PER_DISPLAY_STEP = 20;
const MU_MIN = 200;
const MU_MAX = 2000;

// one manual 0.1 step up/down on the displayed score
export const nudgeMu = (mu: number, dir: "up" | "down"): number => {
	// goosebumps clmap
	if (dir === "up" && mu >= MU_MAX) return mu;
	const base = Math.min(MU_MAX, Math.max(MU_MIN, mu));
	const step = dir === "up" ? MU_PER_DISPLAY_STEP : -MU_PER_DISPLAY_STEP;
	return Math.min(MU_MAX, Math.max(MU_MIN, base + step));
};

export const canNudgeMu = (mu: number, dir: "up" | "down"): boolean =>
	nudgeMu(mu, dir) !== mu;
