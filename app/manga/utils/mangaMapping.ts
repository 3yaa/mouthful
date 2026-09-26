import { MangaAPIProps, MangaProps } from "@/types/manga";

export function mapMangaAPIDatatoManga(
	dataAPI: MangaAPIProps,
): Partial<MangaProps> {
	return {
		anilistId: dataAPI.anilist_id,
		title: dataAPI.title,
		author: dataAPI.author_name?.join(", ") || undefined,
		status: "Want to Read",
		datePublished: dataAPI.first_publish_year ?? undefined,
		chapters: dataAPI.chapters,
		rating: dataAPI.rating ?? undefined,
		cover: dataAPI.cover ?? undefined,
		series: dataAPI.series,
	};
}
