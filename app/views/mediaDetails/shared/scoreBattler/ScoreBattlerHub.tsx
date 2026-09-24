import { BaseMediaProps } from "@/types/media";
import { useMemo, useState, useCallback, useEffect } from "react";
import { updateRatings, updateRatingsDraw } from "@/lib/glicko";

import { ScoreBattlerDesktop } from "./ScoreBattlerDesktop";
import { ScoreBattlerMobile } from "./ScoreBattlerMobile";
import {
	BattleSession,
	createSession,
	getNextOpponent,
	recordResult,
} from "@/lib/battleSession";
import {
	getDisplayScore,
	getTierFromMu,
	Score,
	TIER_THRESHOLDS,
} from "@/lib/tierConfig";
import { ItemScore } from "@/lib/comparison";

interface ScoreBattlerHubProps<T extends BaseMediaProps> {
	items: T[];
	selectedItem: T;
	initialScore: Score;
	mediaType?: string;
	onClose: () => void;
	onScoreFinal: (finalScore: Score) => void;
	onOpponentUpdate: (itemId: number, score: Score) => void;
}

export function ScoreBattlerHub<T extends BaseMediaProps>({
	items,
	initialScore,
	selectedItem,
	mediaType,
	onClose,
	onScoreFinal,
	onOpponentUpdate,
}: ScoreBattlerHubProps<T>) {
	const allScored = useMemo(
		() =>
			items
				.filter((item) => item.score !== null)
				.map((item) => ({ id: item.id, score: item.score! })),
		[items],
	);
	// create session
	const [session, setSession] = useState<BattleSession | null>(() => {
		if (!initialScore) return null;
		return createSession(allScored, {
			id: selectedItem.id,
			score: initialScore,
		});
	});
	// pick new opponent each round
	const [currentOpponent, setCurrentOpponent] = useState<ItemScore | null>(
		() => {
			if (!session) return null;
			return getNextOpponent(session, allScored);
		},
	);

	const finalizeScore = useCallback(
		(finalScore: Score) => {
			onScoreFinal(finalScore);
			onClose();
		},
		[onScoreFinal, onClose],
	);

	useEffect(() => {
		if (!currentOpponent || !session || session.done) {
			// TEMP DIAGNOSTIC -- remove once the add-with-score path is settled
			console.log(
				"[battler] self-closing |",
				"opponent:", currentOpponent?.id,
				"| done:", session?.done,
			);
			if (session?.selectedItem.score)
				onScoreFinal(session?.selectedItem.score);
			onClose();
		}
	}, [onClose, currentOpponent, session, onScoreFinal]);

	// ── Comparison pick ───────────────────────────────────────────────────
	const muCap = useMemo(
		() =>
			getTierFromMu(initialScore.mu) !== "Goosebumps"
				? TIER_THRESHOLDS["Goosebumps"].muMin - 1
				: Infinity,
		[initialScore.mu],
	);

	const handlePick = useCallback(
		(choice: "better" | "worse" | "same") => {
			if (!session || !currentOpponent) return;

			const itemRating = {
				mu: session.selectedItem.score.mu,
				phi: session.selectedItem.score.phi,
			};
			const opRating = {
				mu: currentOpponent.score.mu,
				phi: currentOpponent.score.phi,
			};

			let won: boolean;
			let updatedItem: Score;
			let updatedOpponent: Score;
			//
			if (choice === "better") {
				const [winner, loser] = updateRatings(itemRating, opRating);
				updatedItem = winner;
				updatedOpponent = loser;
				won = true;
			} else if (choice === "worse") {
				const [winner, loser] = updateRatings(opRating, itemRating);
				updatedItem = loser;
				updatedOpponent = winner;
				won = false;
			} else {
				const [a, b] = updateRatingsDraw(itemRating, opRating);
				updatedItem = a;
				updatedOpponent = b;
				won = false;
			}
			updatedItem = {
				...updatedItem,
				mu: Math.min(muCap, updatedItem.mu),
			};
			// update selectedItem
			const updatedSession: BattleSession = {
				...session,
				selectedItem: {
					...session.selectedItem,
					score: { mu: updatedItem.mu, phi: updatedItem.phi },
				},
			};
			// update opponent
			onOpponentUpdate(currentOpponent.id, updatedOpponent);
			// update battle session
			const nextSession = recordResult(
				updatedSession,
				allScored,
				currentOpponent.id,
				currentOpponent.score.mu,
				won,
			);
			console.log("OLD OP: ", getDisplayScore(currentOpponent.score.mu));
			console.group("NEW OP: ", getDisplayScore(updatedOpponent.mu));
			// find next opponent
			const next = getNextOpponent(nextSession, allScored);
			if (nextSession.done || !next) {
				finalizeScore(nextSession.selectedItem.score);
				return;
			}
			//
			setSession(nextSession);
			setCurrentOpponent(next);
		},
		[
			session,
			currentOpponent,
			finalizeScore,
			onOpponentUpdate,
			allScored,
			muCap,
		],
	);

	const opponentItem = useMemo(
		() => items.find((i) => i.id === currentOpponent?.id) ?? null,
		[items, currentOpponent],
	);

	if (!opponentItem || !session) return null;

	return (
		<>
			<div className="lg:block hidden">
				<ScoreBattlerDesktop
					selectedItem={selectedItem}
					itemFacing={opponentItem as T}
					mediaType={mediaType}
					onPick={handlePick}
				/>
			</div>
			<div className="block lg:hidden">
				<ScoreBattlerMobile
					selectedItem={selectedItem}
					itemFacing={opponentItem as T}
					mediaType={mediaType}
					onPick={handlePick}
				/>
			</div>
		</>
	);
}
