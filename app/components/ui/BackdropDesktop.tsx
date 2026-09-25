import Image from "next/image";

interface BackdropDesktopProps {
	src: string;
	is_book?: boolean;
	// only the first rows of the list want this
	priority?: boolean;
}

const maskH =
	"linear-gradient(to right, transparent 0%, rgba(0,0,0,0.05) 5%, rgba(0,0,0,0.2) 11%, rgba(0,0,0,0.45) 18%, rgba(0,0,0,0.72) 26%, rgba(0,0,0,0.92) 34%, black 42%, black 58%, rgba(0,0,0,0.92) 66%, rgba(0,0,0,0.72) 74%, rgba(0,0,0,0.45) 82%, rgba(0,0,0,0.2) 89%, rgba(0,0,0,0.05) 95%, transparent 100%)";

const maskV =
	"linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.5) 8%, black 20%, black 80%, rgba(0,0,0,0.5) 92%, transparent 100%)";

export const BackdropDesktop = ({
	src,
	is_book,
	priority = false,
}: BackdropDesktopProps) => (
	<div
		className="relative overflow-hidden select-none h-full"
		style={{
			maskImage: `${maskH}, ${maskV}`,
			WebkitMaskImage: `${maskH}, ${maskV}`,
			maskComposite: "intersect",
			WebkitMaskComposite: "source-in",
		}}
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
