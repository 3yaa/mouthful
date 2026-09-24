import { CSSProperties } from "react";
import { getDisplayScore, getTierFromMu, TIERS } from "@/lib/tierConfig";
import { getTierInk, getTierInkLit } from "@/utils/styleUtils";

const VERDICT_FILL = 0.63;
const LONGEST_TIER = Math.max(...TIERS.map((t) => t.length));
const VERDICT_CQW = ((VERDICT_FILL * 100) / (0.72 * LONGEST_TIER)).toFixed(2);

interface ScoreMarkProps {
	mu?: number;
}

export function ScoreMark({ mu }: ScoreMarkProps) {
	if (mu == null) {
		return (
			<div className="flex h-full w-full flex-col items-center justify-center">
				<span className="font-display text-[2rem] leading-none text-zinc-600 transition-colors duration-300 ease-out group-hover:text-zinc-500">
					–
				</span>
			</div>
		);
	}

	const score = getDisplayScore(mu);
	const display = Number.isInteger(score) ? `${score}.0` : String(score);
	const tier = getTierFromMu(mu);
	const figure = score === 10 ? "10" : display;

	return (
		<div
			className="score-mark relative flex h-full w-full flex-col items-center gap-3"
			style={
				{
					"--tier-ink": getTierInk(tier),
					"--tier-lit": getTierInkLit(tier),
					"--verdict-cqw": VERDICT_CQW,
				} as CSSProperties
			}
		>
			<span className="score-figure font-display text-[2.125rem] leading-none tabular-nums">
				{figure}
			</span>
			<span className="relative flex w-full justify-center">
				<span aria-hidden className="score-well" />
				<span className="score-label relative text-[0.5rem] leading-none font-semibold whitespace-nowrap uppercase">
					{tier}
				</span>
				<span
					aria-hidden
					className="score-verdict font-display uppercase"
				>
					{tier}
				</span>
			</span>
		</div>
	);
}
