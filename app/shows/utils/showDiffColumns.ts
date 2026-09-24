import type { ColumnConfig } from "@/types/media";
import type { ShowProps } from "@/types/show";
import { slotOf } from "@/app/shows/utils/slotRef";
import { airSeasonLabel } from "@/utils/formattingUtils";

export const DIFF_COLUMNS_SHOW: [
	ColumnConfig<ShowProps>,
	ColumnConfig<ShowProps>,
] = [
	{
		label: "Creator",
		sortKey: "creator",
		getValue: (s) =>
			(s.anilistId != null ? slotOf(s)?.studio : null) ?? s.creator,
	},
	{
		label: "Released",
		sortKey: "dateReleased",
		getValue: (s) =>
			(s.anilistId != null
				? airSeasonLabel(slotOf(s)?.startDate)
				: null) ?? s.dateReleased,
	},
];
