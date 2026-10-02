const LETTERS = "MOUTHFUL";
const T_AT = 3;
const TRACK_EM = 0.22;

const LETTER = "inline-block [text-indent:0]";
const ODD_T =
	"font-lettering italic font-semibold text-[1.12em] leading-none h-[1em] w-[0.762em] -ml-[0.033em] mr-[0.167em] [font-variation-settings:'SOFT'_100,'WONK'_1,'opsz'_144]";
const SILVER =
	"bg-linear-to-b from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)]";

function Word({ fill }: { fill: string }) {
	return LETTERS.split("").map((letter, i) => (
		<span
			key={i}
			aria-hidden
			className={`${LETTER} ${fill} ${i === T_AT ? ODD_T : ""}`}
		>
			{letter}
		</span>
	));
}

export function Wordmark() {
	return (
		<header className="mt-8 shrink-0 text-center lg:mt-0">
			<h1
				aria-label="Mouthful"
				style={{
					letterSpacing: `${TRACK_EM}em`,
					textIndent: `${TRACK_EM}em`,
				}}
				className="font-display text-xl leading-[1.15] font-semibold select-none sm:text-4xl lg:text-[3.25rem]"
			>
				<span className="relative inline-block h-[1.15em] align-top indent-0">
					<span className="text-zinc-500/15">
						<Word fill="" />
					</span>
					<span className="wordmark-sweep wordmark-lit">
						<span>
							<Word fill={SILVER} />
						</span>
					</span>
					<span className="wordmark-sweep wordmark-glint pointer-events-none text-white">
						<span>
							<Word fill="" />
						</span>
					</span>
				</span>
			</h1>
		</header>
	);
}
