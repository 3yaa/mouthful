"use client";
import { Loading } from "@/app/components/ui/Loading";
import { ListingHeader } from "./ListingHeader";
import { DIFF_COLUMNS_SHOW } from "@/app/shows/utils/showDiffColumns";
import { DIFF_COLUMNS_MOVIE } from "@/types/movie";
import { DIFF_COLUMNS_BOOK } from "@/types/book";
import { DIFF_COLUMNS_GAME } from "@/types/game";

export const LISTING_COLUMN = "w-full md:w-[70%] lg:w-[65%]";

const LISTINGS = {
	movie: DIFF_COLUMNS_MOVIE,
	show: DIFF_COLUMNS_SHOW,
	book: DIFF_COLUMNS_BOOK,
	game: DIFF_COLUMNS_GAME,
} as const;

export type ListingKind = keyof typeof LISTINGS;

export function listingOf(path: string): ListingKind | undefined {
	const kind = path.replace(/^\//, "").replace(/s$/, "");
	return kind in LISTINGS ? (kind as ListingKind) : undefined;
}

export function ListingLoader() {
	return (
		<div className="relative flex-1">
			<Loading
				customBg="bg-transparent"
				customStyle="h-12 w-12 border-gray-400"
				text=""
			/>
		</div>
	);
}

export function ListingSkeleton({ listing }: { listing?: ListingKind }) {
	return (
		<div className={`${LISTING_COLUMN} mx-auto h-screen flex flex-col`}>
			{listing && (
				<ListingHeader
					mediaType={listing}
					differentColumns={LISTINGS[listing]}
				/>
			)}
			<ListingLoader />
		</div>
	);
}
