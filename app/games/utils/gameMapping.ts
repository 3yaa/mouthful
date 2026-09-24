import { GameProps, IGDBProps, IGDBDlcProps } from "@/types/game";
import { cleanName } from "@/utils/cleanName";

export function mapIGDBDataToGame(dataGame: IGDBProps): Partial<GameProps> {
  return {
    igdbId: dataGame.igdbId,
    title: dataGame.title,
    dateReleased: dataGame.released_year,
    cover: dataGame.cover_url
      ? { url: dataGame.cover_url, color: "" }
      : undefined,
    logoUrl: dataGame.logo_url ?? undefined,
    studio: dataGame.developer?.[0]?.name,
    dlcs: [
      { id: dataGame.igdbId, name: dataGame.title },
      ...(dataGame.expansions?.map((dlc) => ({
        id: dlc.id,
        name: cleanName(dlc.name, dataGame.title),
      })) || []),
    ],
    dlcIndex: 0,
  };
}

export function mapIGDBDlcsDataToGame(
  dataDlc: IGDBDlcProps,
  mainTitle: string,
): Partial<GameProps> {
  return {
    igdbId: dataDlc.igdbId,
    title: cleanName(dataDlc.title, mainTitle),
    dateReleased: dataDlc.released_year,
    cover: dataDlc.cover_url
      ? { url: dataDlc.cover_url, color: "" }
      : undefined,
    studio: dataDlc.developer?.[0]?.name,
  };
}
