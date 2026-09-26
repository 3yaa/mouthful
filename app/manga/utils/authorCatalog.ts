import type { AuthFetch } from "@/app/auth/hooks/useAuthFetch";

// a serial or a one-shot they wrote or drew
export type AuthorWork = {
	anilistId: number;
	title: string;
	format: string | null;
	status: string | null;
	chapters: number | null;
	startYear: number | null;
	posterUrl: string | null;
	posterColor: string | null;
	popularity: number;
	score: number | null; // anilist score
	role: string;
};

export type AuthorSort = "popular" | "recent";

export type AuthorCatalog = {
	id: number;
	name: string;
	works: AuthorWork[];
	page: number;
	hasMore: boolean;
};

export async function fetchAuthorCatalog(
	author: string,
	authFetch: AuthFetch,
	{ page = 1, sort = "popular" }: { page?: number; sort?: AuthorSort } = {},
): Promise<AuthorCatalog | null> {
	const res = await authFetch(
		`/api/manga-api/anilist-author?name=${encodeURIComponent(author)}` +
			`&page=${page}&sort=${sort}`,
	);
	if (!res.ok) return null;
	const data = await res.json();
	return data.success
		? {
				id: data.author.id,
				name: data.author.name,
				works: data.works ?? [],
				page: data.page ?? 1,
				hasMore: !!data.hasMore,
			}
		: null;
}
