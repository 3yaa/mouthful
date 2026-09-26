import { MangaProps } from "@/types/manga";

type ChapterRow = Pick<MangaProps, "curChapter" | "chapters">;

// a running serial has no last chapter until a reload finds one
export const chapterTotal = (chapters?: number | null) => chapters ?? "???";

export const chapterLabel = (manga: ChapterRow) =>
	`Ch ${manga.curChapter ?? 0}/${chapterTotal(manga.chapters)}`;

// nothing to divide by fills the bar -- same as an airing show
export const chapterProgress = ({ curChapter, chapters }: ChapterRow) =>
	!chapters || !curChapter
		? 100
		: Math.min(100, (curChapter / chapters) * 100);
