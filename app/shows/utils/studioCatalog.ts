import type { AnimeFormat } from "@/types/show";
import type { AuthFetch } from "@/app/auth/hooks/useAuthFetch";

// a cour, movie, ova
export type StudioWork = {
	anilistId: number;
	title: string | null;
	base: string; // base title
	part: string | null; // cour title
	titleRomaji: string | null;
	format: AnimeFormat;
	status: string | null;
	episode_count: number | null;
	duration: number | null;
	startDate: string | null; //"YYYY-MM"
	posterUrl: string | null;
	posterColor: string | null;
	popularity: number;
	score: number | null; // anilist score
};

export type StudioSort = "popular" | "recent";

export type StudioCatalog = {
	id: number;
	name: string;
	works: StudioWork[];
	page: number;
	hasMore: boolean;
};

export async function fetchStudioCatalog(
	studio: string,
	authFetch: AuthFetch,
	{ page = 1, sort = "popular" }: { page?: number; sort?: StudioSort } = {},
): Promise<StudioCatalog | null> {
	const res = await authFetch(
		`/api/shows-api/anime-studio?studio=${encodeURIComponent(studio)}` +
			`&page=${page}&sort=${sort}`,
	);
	if (!res.ok) return null;
	const data = await res.json();
	return data.success
		? {
				id: data.studio.id,
				name: data.studio.name,
				works: data.works ?? [],
				page: data.page ?? 1,
				hasMore: !!data.hasMore,
			}
		: null;
}
