import { BaseMediaProps } from "@/types/media";

export const actions = ["better", "worse", "same"] as const;

// shows carry a bare poster url; everything else stores { url, color }
export const coverFor = <T extends BaseMediaProps>(
	item: T | null,
): string | null => item?.cover?.url || item?.posterUrl || null;

export interface ScoreBattlerUIProps<T extends BaseMediaProps> {
	selectedItem: T;
	itemFacing: T;
	mediaType?: string;
	onPick: (choice: "better" | "worse" | "same") => void;
	// writes nothing
	onCancel: () => void;
}
