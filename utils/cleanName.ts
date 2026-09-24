export function cleanName(
  title: string | undefined,
  seriesTitle: string | null | undefined,
) {
  if (!title || !seriesTitle) {
    return title;
  }

  // If series and title are the same, return title as-is
  if (title.trim() === seriesTitle.trim()) {
    return title;
  }

  // Special cases where we want to keep the full title
  // Part/Chapter/Episode indicators ("Dune: Part One", "Star Wars: Episode I")
  if (
    /:\s*(Part|Chapter|Volume|Episode)\s+(One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten|\d+|[IVXLC]+)/i.test(
      title,
    )
  ) {
    return title;
  }

  // Named sequels (like "Matrix: Reloaded")
  if (
    /:\s*(Reloaded|Revolutions|Returns|Rises|Begins|Forever|Beyond|Resurrection)/i.test(
      title,
    )
  ) {
    return title;
  }

  // Common sequel patterns
  const sequelPatterns = [
    /:\s*(The\s+)?(Beginning|End|Final|Last|Ultimate|Return|Rise|Dawn|War|Battle)/i,
    /\s+(Returns?|Rises?|Begins?|Forever|Beyond|Reborn|Resurrection|Revenge|Strikes Back)/i,
  ];

  for (const pattern of sequelPatterns) {
    if (pattern.test(title)) {
      return title;
    }
  }

  const seriesPrefix = new RegExp(
    `^${seriesTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
    "i",
  );

  // the series name isn't a prefix -- there is nothing to strip, so leave the
  // title exactly as it is rather than running the tidy-up rules on it
  if (!seriesPrefix.test(title)) {
    return title;
  }

  // If none of the special cases apply, clean the name
  const cleaned = title
    .replace(seriesPrefix, "")
    // Remove common separators at start
    .replace(/^[\s\-\–\—:;,\.\|#]*/, "")
    // Remove movie-specific indicators
    .replace(/^(Movie|Movie|Episode|Chapter|Part)[\s\d\.\-:#]*/i, "")
    // Remove leading numbers with separators (but be careful with roman numerals)
    .replace(/^\d+[\s\-\.\):]*/, "")
    // Remove connecting words
    .replace(/^(and the|and|&|the)\s+/i, "")
    .trim();

  // stripping left nothing meaningful ("Iron Man 2" -> "2" -> "", "Rocky II" -> "II")
  if (!cleaned || /^[IVXLC]+$/i.test(cleaned)) {
    return title;
  }

  return cleaned;
}
