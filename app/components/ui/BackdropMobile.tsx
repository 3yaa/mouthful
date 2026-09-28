import Image from "next/image";

interface BackdropImagePropsMobile {
	src: string;
	// preflight caps the img at the strip, so these only set the ratio and a ceiling
	width: number;
	height: number;
	// only the first rows of the list want this
	priority?: boolean;
}

// same eased curve the desktop backdrop uses, left edge only
const EDGE_WASH = [
	"linear-gradient(to right",
	"rgba(9,9,9,1) 0%",
	"rgba(9,9,9,0.98) 3%",
	"rgba(9,9,9,0.88) 6%",
	"rgba(9,9,9,0.7) 8.5%",
	"rgba(9,9,9,0.48) 11.5%",
	"rgba(9,9,9,0.28) 14%",
	"rgba(9,9,9,0.12) 17.5%",
	"rgba(9,9,9,0.03) 21%",
	"transparent 25%",
	"transparent 50%",
	"rgba(9,9,9,0.2) 100%)",
].join(", ");

const BOTTOM_WASH = [
	"linear-gradient(to bottom",
	"transparent 38%",
	"rgba(9,9,9,0.05) 48%",
	"rgba(9,9,9,0.16) 58%",
	"rgba(9,9,9,0.34) 68%",
	"rgba(9,9,9,0.56) 78%",
	"rgba(9,9,9,0.78) 88%",
	"rgba(9,9,9,0.92) 95%",
	"rgba(9,9,9,1) 100%)",
].join(", ");

const CORNER_WASH = [
	"radial-gradient(55% 100% at 0% 100%",
	"rgba(9,9,9,0.9) 0%",
	"rgba(9,9,9,0.72) 30%",
	"rgba(9,9,9,0.4) 55%",
	"rgba(9,9,9,0.14) 80%",
	"transparent 100%)",
].join(", ");

export const BackdropImageMobile = ({
	src,
	width,
	height,
	priority = false,
}: BackdropImagePropsMobile) => (
	<div className="absolute -top-3 bottom-0 left-11 -right-3 -z-10 overflow-hidden select-none">
		<div className="relative w-full h-full">
			{/* IMAGE */}
			<Image
				src={src}
				alt="Backdrop"
				width={width}
				height={height}
				sizes="(min-width: 768px) 85vw, 62vw"
				className="object-cover w-full h-full"
				style={{
					objectPosition: "center 12%",
					filter: "brightness(0.32) saturate(0.9)",
				}}
				// lazy past the first rows
				priority={priority}
			/>

			{/* EDGE GRADIENTS */}
			<div
				className="absolute inset-0 pointer-events-none"
				style={{
					background: `${CORNER_WASH}, ${BOTTOM_WASH}, ${EDGE_WASH}`,
				}}
			/>
		</div>
	</div>
);
