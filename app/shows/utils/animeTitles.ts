const SHOUT_LETTERS = 4;
const ROMAN = /^[IVXLCDM]+$/;

const lettersOf = (word: string) => word.match(/\p{L}/gu) ?? [];
const allCaps = (letters: string[]) =>
	letters.every((letter) => letter === letter.toLocaleUpperCase());
const isNumeral = (letters: string[]) => ROMAN.test(letters.join(""));

// lowercase, then raise the first letter after a quote, bracket or dash
const unshout = (word: string) =>
	word
		.toLocaleLowerCase()
		.replace(
			/(^\P{L}*|[/–—-])(\p{L})/gu,
			(_, lead: string, letter: string) =>
				lead + letter.toLocaleUpperCase(),
		);

// undoes anilist's shouting. by run, so THE in "THE FINAL CHAPTERS" goes too
export function titleCase(value: string): string {
	// the separators are captured so the string can be put back together
	const parts = value.split(/(\s+)/);
	const out = [...parts];
	let run: number[] = [];
	let shouting = false;

	const settle = () => {
		if (shouting) {
			for (const at of run) {
				const letters = lettersOf(parts[at]);
				if (letters.length && !isNumeral(letters))
					out[at] = unshout(parts[at]);
			}
		}
		run = [];
		shouting = false;
	};

	parts.forEach((part, at) => {
		const letters = lettersOf(part);
		// no letters at all (space, &, digit) carries the run, not ends it
		if (letters.length && !allCaps(letters)) return settle();
		run.push(at);
		if (letters.length >= SHOUT_LETTERS && !isNumeral(letters))
			shouting = true;
	});
	settle();

	return out.join("");
}

type AnimeTitleContext = "part" | "entry";

interface AnimeTitleLabelOptions {
	franchiseTitle?: string;
	// anilist files under romaji while the show carries the english title
	alternateTitle?: string | null;
	// "part" drops the season numbers the stepper already shows
	context: AnimeTitleContext;
}

// the one place titles get shortened, so rows and part labels cannot disagree
export function animeTitleLabel(
	label: string | null | undefined,
	{ franchiseTitle, alternateTitle, context }: AnimeTitleLabelOptions,
): string | null {
	if (!label)
		return context === "entry" && franchiseTitle
			? titleCase(franchiseTitle)
			: null;

	const norm = (value?: string | null) =>
		(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");
	const titles = [franchiseTitle, alternateTitle].filter(Boolean) as string[];
	let rest = label.trim();

	// no assuming a colon splits the names, so walk until the prefix covers
	for (const candidate of titles) {
		const wanted = norm(candidate);
		if (!wanted) continue;
		let seen = "";
		let cut = 0;
		for (let i = 0; i < rest.length && seen.length < wanted.length; i++) {
			seen += norm(rest[i]);
			cut = i + 1;
		}
		// mid-word is not the name
		if (seen !== wanted || /[\p{L}\p{N}]/u.test(rest[cut] ?? "")) continue;
		// the name's own "!!" or closing bracket goes with it
		rest = rest.slice(cut).replace(/^[!?！？.…。”’」』】)\]]+/u, "");
		break;
	}

	// anilist's disambiguation tags, not part of any name
	rest = rest.replace(
		/\s*\((tv|ona|ova|movie|special|tv short|\d{4})\)\s*$/i,
		"",
	);
	// generic right after the franchise
	rest = rest.replace(/^[\s:\-–—~]*(?:the\s+)?movie\b/i, "");

	if (context === "part") {
		rest = rest
			.replace(/\b\d+(st|nd|rd|th)\s+season\b/gi, "")
			.replace(/\bseason\s+\d+\b/gi, "")
			.replace(/\bpart\s+\d+\b/gi, "")
			// needs the space, or "Thousand-Year Blood War" splits
			.replace(/\s*[-–—]\s+/g, ": ");
	}

	rest = rest
		.replace(/^[\s:\-–—~]+|[\s:\-–—~]+$/g, "")
		.replace(/\s{2,}/g, " ")
		.trim();

	if (context === "entry") {
		// a bare number is the title, not an abbreviation
		if (/^\d+(?:\.\d+)?$/.test(rest)) return titleCase(label.trim());
		return titleCase(rest || franchiseTitle || label.trim());
	}

	// the stepper already shows this as the season number
	if (/^([ivxlcdm]+|\d+)$/i.test(rest)) return null;
	const bare = norm(rest);
	if (!bare || titles.some((title) => norm(title) === bare)) return null;
	return rest;
}

// season controls. animeTitleLabel does all the cleaning
export function slotSubtitle(
	label?: string | null,
	showTitle?: string,
	altTitle?: string | null,
): string | null {
	return animeTitleLabel(label, {
		franchiseTitle: showTitle,
		alternateTitle: altTitle,
		context: "part",
	});
}
