import Image from "next/image";
import type { CSSProperties } from "react";

interface BackdropDesktopProps {
	src: string;
	is_book?: boolean;
	// only the first rows of the list want this
	priority?: boolean;
}

const RAMP: [number, number][] = [
	[0, 0],
	[0.05, 0.119],
	[0.2, 0.262],
	[0.45, 0.429],
	[0.72, 0.619],
	[0.92, 0.81],
	[1, 1],
];

const maskH = `linear-gradient(to right, ${[
	...RAMP.map(([a, f]) => `rgba(0,0,0,${a}) calc(var(--art-ramp) * ${f})`),
	...[...RAMP]
		.reverse()
		.map(
			([a, f]) => `rgba(0,0,0,${a}) calc(100% - var(--art-ramp) * ${f})`,
		),
].join(", ")})`;

const maskV =
	"linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.5) 8%, black 20%, black 80%, rgba(0,0,0,0.5) 92%, transparent 100%)";

// every listing backdrop fades the same way
export const ART_MASK: CSSProperties = {
	maskImage: `${maskH}, ${maskV}`,
	WebkitMaskImage: `${maskH}, ${maskV}`,
	maskComposite: "intersect",
	WebkitMaskComposite: "source-in",
	transitionProperty: "--art-ramp",
};

export const BackdropDesktop = ({
	src,
	is_book,
	priority = false,
}: BackdropDesktopProps) => (
	<div
		className="relative overflow-hidden select-none h-full duration-420 ease-leave live:[--art-ramp:15%] live:duration-800 live:ease-arrive live:delay-200"
		style={ART_MASK}
	>
		<Image
			src={src}
			alt="Backdrop"
			width={540}
			height={304}
			sizes="35vw"
			className="absolute w-full"
			style={{
				objectPosition: is_book ? "center -40px" : "center -16px",
				filter: "brightness(0.55)",
			}}
			// lazy for the rest
			priority={priority}
		/>
		<span
			aria-hidden
			className="absolute inset-0 bg-black/28 transition-opacity duration-420 ease-leave live:opacity-0 live:duration-800 live:ease-arrive live:delay-200"
		/>
	</div>
);
