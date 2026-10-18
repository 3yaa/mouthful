"use client";
import { useId } from "react";
import {
	motion,
	useTransform,
	type MotionValue,
	type TargetAndTransition,
	type Transition,
} from "framer-motion";
import {
	CharmFrame,
	CX,
	CY,
	HangingCharm,
	type CharmPhase,
} from "@/app/views/mediaListing/ShowsBadge";

const DEG = Math.PI / 180;
const centre = { transformBox: "fill-box", transformOrigin: "center" } as const;

// the other list's discover -- a reel hangs toward the films, a set toward the shows
export function SwapCharm({
	to,
	href,
	title,
	className,
	onClick,
}: {
	to: "movie" | "show";
	href: string;
	title: string;
	className: string;
	onClick?: () => void;
}) {
	return (
		<HangingCharm
			href={href}
			title={title}
			className={className}
			onClick={onClick}
			// never the compass's lamp pull -- a reel runs its film, a set powers off
			move={to === "movie" ? "roll" : "power"}
			turns={
				to === "movie"
					? { rest: 0, hover: 40, go: 720 }
					: { rest: 0, hover: 60, go: 180 }
			}
		>
			{({ pull, turn, spool, hot, phase }) => (
				<CharmFrame
					pull={pull}
					hanger={
						to === "movie" ? (
							<FilmLeader spool={spool} />
						) : (
							<PowerCable />
						)
					}
				>
					{to === "movie" ? (
						<ReelFace turn={turn} spool={spool} />
					) : (
						<SetFace turn={turn} hot={hot} phase={phase} />
					)}
				</CharmFrame>
			)}
		</HangingCharm>
	);
}

const HOLES = Array.from({ length: 5 }, (_, i) => i * 72);
// the spin carries it -- the film only feeds a little
const RUN = 26;

function FilmStock({ id }: { id: string }) {
	return (
		<linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
			<stop offset="0" stopColor="#5b4527" />
			<stop offset="0.5" stopColor="#86673a" />
			<stop offset="1" stopColor="#4a3820" />
		</linearGradient>
	);
}

// sprocket pairs down a strip whose left edge is at x, a frame line every third
function Perforations({ id, x }: { id: string; x: number }) {
	return (
		<pattern id={id} width="40" height="7.8" patternUnits="userSpaceOnUse">
			{[0, 2.6, 5.2].map((y) => (
				<g key={y} fill="#1c150d">
					<rect
						x={x + 0.5}
						y={y + 0.7}
						width="0.9"
						height="1.2"
						rx="0.2"
					/>
					<rect
						x={x + 3}
						y={y + 0.7}
						width="0.9"
						height="1.2"
						rx="0.2"
					/>
				</g>
			))}
			<line
				x1={x + 1.5}
				y1="0"
				x2={x + 2.9}
				y2="0"
				stroke="#2b2116"
				strokeWidth="0.4"
			/>
		</pattern>
	);
}

// hung by its own leader, threaded down into the spool -- it runs with the film
function FilmLeader({ spool }: { spool: MotionValue<number> }) {
	const id = useId();
	const feed = useTransform(spool, (out) => out * RUN);
	return (
		<>
			<defs>
				<FilmStock id={`${id}-film`} />
				<Perforations id={`${id}-perfs`} x={17.8} />
				<clipPath id={`${id}-leader`}>
					<rect x="16" y="0" width="8" height="62" />
				</clipPath>
			</defs>
			<g clipPath={`url(#${id}-leader)`}>
				<rect
					x="17.8"
					y="-1"
					width="4.4"
					height="63"
					fill={`url(#${id}-film)`}
					stroke="#2b2116"
					strokeWidth="0.5"
				/>
				<motion.g style={{ y: feed }}>
					<rect
						x="17.8"
						y={-RUN - 8}
						width="4.4"
						height={RUN + 72}
						fill={`url(#${id}-perfs)`}
					/>
				</motion.g>
			</g>
		</>
	);
}

const COILS = Array.from({ length: 10 }, (_, i) => 12 + i * 3.4);

// an old set's coiled cord, into a rubber sleeve between the ears
function PowerCable() {
	const last = COILS[COILS.length - 1];
	return (
		<g strokeLinecap="round">
			<line
				x1="20"
				y1="-1"
				x2="20"
				y2="12"
				stroke="#2f2f35"
				strokeWidth="1.8"
			/>
			{COILS.map((y) => (
				<g key={y} fill="none">
					<ellipse
						cx="20"
						cy={y}
						rx="3.4"
						ry="1.5"
						stroke="#2f2f35"
						strokeWidth="1.5"
					/>
					<path
						d={`M16.9 ${y + 0.3} Q20 ${y + 1.9} 23.1 ${y + 0.3}`}
						stroke="#6b6b74"
						strokeWidth="0.6"
					/>
				</g>
			))}
			<line
				x1="20"
				y1={last + 1.5}
				x2="20"
				y2="53.6"
				stroke="#2f2f35"
				strokeWidth="1.8"
			/>
			<rect
				x="18.2"
				y="53.4"
				width="3.6"
				height="7"
				rx="1.3"
				fill="#27272a"
				stroke="#0f0f11"
				strokeWidth="0.5"
			/>
			<line
				x1="18.7"
				y1="55.6"
				x2="21.3"
				y2="55.6"
				stroke="#3f3f46"
				strokeWidth="0.5"
			/>
			<line
				x1="18.7"
				y1="57.6"
				x2="21.3"
				y2="57.6"
				stroke="#3f3f46"
				strokeWidth="0.5"
			/>
		</g>
	);
}

function ReelFace({
	turn,
	spool,
}: {
	turn: MotionValue<number>;
	spool: MotionValue<number>;
}) {
	const id = useId();
	const feed = useTransform(spool, (out) => out * RUN);
	return (
		<>
			<defs>
				<radialGradient id={`${id}-metal`} cx="0.38" cy="0.32" r="0.8">
					<stop offset="0" stopColor="#3a3a40" />
					<stop offset="1" stopColor="#131316" />
				</radialGradient>
				<FilmStock id={`${id}-film`} />
				<Perforations id={`${id}-perfs`} x={34.4} />
				{/* the film only shows below where it leaves the spool */}
				<clipPath id={`${id}-out`}>
					<rect x="30" y="72" width="14" height={RUN + 40} />
				</clipPath>
			</defs>

			{/* the film off the spool, behind the flange -- it runs out and winds back */}
			<g clipPath={`url(#${id}-out)`}>
				<motion.g style={{ y: feed }}>
					<path
						d={`M34.4 ${72 - RUN} L38.8 ${72 - RUN} L38.8 89.5 Q38.8 93.4 35.2 94.2 L34.4 94.4 Z`}
						fill={`url(#${id}-film)`}
						stroke="#2b2116"
						strokeWidth="0.5"
					/>
					<rect
						x="34.4"
						y={72 - RUN}
						width="4.4"
						height={RUN + 20}
						fill={`url(#${id}-perfs)`}
					/>
				</motion.g>
			</g>

			{/* flange */}
			<circle
				cx={CX}
				cy={CY}
				r="17"
				fill={`url(#${id}-metal)`}
				stroke="#52525b"
				strokeWidth="1"
			/>
			<circle
				cx={CX}
				cy={CY}
				r="15.2"
				fill="none"
				stroke="#27272a"
				strokeWidth="0.8"
			/>

			<motion.g style={{ ...centre, rotate: turn }}>
				{HOLES.map((angle) => (
					<circle
						key={angle}
						cx={CX + 8.7 * Math.sin(angle * DEG)}
						cy={CY - 8.7 * Math.cos(angle * DEG)}
						r="3.7"
						fill="#09090b"
						stroke="#3f3f46"
						strokeWidth="0.6"
					/>
				))}
				{/* keeps the fill-box centred on the hub */}
				<circle cx={CX} cy={CY} r="12.4" fill="none" />
				<circle
					cx={CX}
					cy={CY}
					r="2.6"
					fill="#d4d4d8"
					stroke="#18181b"
					strokeWidth="0.8"
				/>
				<rect
					x={CX - 0.7}
					y={CY - 0.7}
					width="1.4"
					height="1.4"
					fill="#3f3f46"
				/>
			</motion.g>
		</>
	);
}

const SCANLINES = Array.from({ length: 11 }, (_, i) => 66 + i * 1.6);

// a CRT's switch-off -- the picture squeezes to a line, then a dot
const POWER: Record<
	CharmPhase,
	{ picture: TargetAndTransition; beam: TargetAndTransition }
> = {
	arriving: {
		picture: { scaleX: 0.02, scaleY: 0.02, opacity: 0 },
		beam: { opacity: 0 },
	},
	idle: {
		picture: {
			scaleX: [0.02, 0.02, 1, 1],
			scaleY: [0.02, 0.02, 0.04, 1],
			opacity: [0, 1, 1, 1],
		},
		beam: { opacity: [0.9, 0.9, 0.5, 0] },
	},
	leaving: {
		picture: {
			scaleX: [1, 1, 0.02, 0.02],
			scaleY: [1, 0.04, 0.04, 0.02],
			opacity: [1, 1, 1, 0],
		},
		beam: { opacity: [0, 0.6, 0.9, 0] },
	},
};
const POWER_TIMES: Record<CharmPhase, Transition> = {
	arriving: { duration: 0 },
	idle: { duration: 0.45, times: [0, 0.15, 0.5, 1] },
	leaving: { duration: 0.32, times: [0, 0.35, 0.7, 1] },
};

function SetFace({
	turn,
	hot,
	phase,
}: {
	turn: MotionValue<number>;
	hot: boolean;
	phase: CharmPhase;
}) {
	const id = useId();
	return (
		<>
			<defs>
				<linearGradient id={`${id}-body`} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stopColor="#3a3a40" />
					<stop offset="1" stopColor="#1c1c20" />
				</linearGradient>
				<radialGradient id={`${id}-glass`} cx="0.42" cy="0.4" r="0.75">
					<stop offset="0" stopColor="#1d2a29" />
					<stop offset="1" stopColor="#0b1010" />
				</radialGradient>
				<clipPath id={`${id}-screen`}>
					<rect x="7.5" y="64.5" width="20" height="19" rx="4" />
				</clipPath>
			</defs>

			{/* rabbit ears either side of the bail */}
			<g stroke="#71717a" strokeWidth="0.9" strokeLinecap="round">
				<line x1="18.4" y1="61.4" x2="10.8" y2="52.2" />
				<line x1="21.6" y1="61.4" x2="29.2" y2="52.2" />
			</g>
			<circle cx="10.8" cy="52.2" r="1.05" fill="#a1a1aa" />
			<circle cx="29.2" cy="52.2" r="1.05" fill="#a1a1aa" />
			<ellipse cx="20" cy="61.6" rx="3.2" ry="1.7" fill="#3f3f46" />

			{/* cabinet and feet */}
			<rect x="9" y="85.6" width="4" height="2.4" rx="1" fill="#27272a" />
			<rect
				x="27"
				y="85.6"
				width="4"
				height="2.4"
				rx="1"
				fill="#27272a"
			/>
			<rect
				x="4.5"
				y="61.5"
				width="31"
				height="25"
				rx="5"
				fill={`url(#${id}-body)`}
				stroke="#52525b"
				strokeWidth="1"
			/>

			{/* screen -- lit under the pointer, switched on as it arrives and off as it leaves */}
			<g clipPath={`url(#${id}-screen)`}>
				<rect
					x="7.5"
					y="64.5"
					width="20"
					height="19"
					fill={`url(#${id}-glass)`}
				/>
				<motion.g
					style={centre}
					initial={false}
					animate={POWER[phase].picture}
					transition={POWER_TIMES[phase]}
				>
					<motion.rect
						x="7.5"
						y="64.5"
						width="20"
						height="19"
						fill="#5eead4"
						initial={false}
						animate={{ opacity: hot ? 0.14 : 0.03 }}
						transition={{ duration: 0.3 }}
					/>
					<motion.rect
						x="7.5"
						y="64.5"
						width="20"
						height="19"
						fill="#e6fffb"
						initial={false}
						animate={POWER[phase].beam}
						transition={POWER_TIMES[phase]}
					/>
					{SCANLINES.map((y) => (
						<line
							key={y}
							x1="7.5"
							y1={y}
							x2="27.5"
							y2={y}
							stroke="#000"
							strokeWidth="0.5"
							opacity="0.28"
						/>
					))}
				</motion.g>
				<path
					d="M9.6 69 Q10.4 66.2 14 65.8"
					fill="none"
					stroke="#fff"
					strokeWidth="0.9"
					strokeLinecap="round"
					opacity="0.12"
				/>
			</g>
			<rect
				x="7.5"
				y="64.5"
				width="20"
				height="19"
				rx="4"
				fill="none"
				stroke="#18181b"
				strokeWidth="0.8"
			/>

			{/* channel knob, a smaller one, and the speaker */}
			<motion.g style={{ ...centre, rotate: turn }}>
				<circle
					cx="31.4"
					cy="69.4"
					r="2.1"
					fill="#52525b"
					stroke="#18181b"
					strokeWidth="0.6"
				/>
				<line
					x1="31.4"
					y1="69.4"
					x2="31.4"
					y2="67.6"
					stroke="#d4d4d8"
					strokeWidth="0.7"
					strokeLinecap="round"
				/>
			</motion.g>
			<circle
				cx="31.4"
				cy="74.6"
				r="1.3"
				fill="#3f3f46"
				stroke="#18181b"
				strokeWidth="0.5"
			/>
			<g stroke="#27272a" strokeWidth="0.7" strokeLinecap="round">
				<line x1="29.9" y1="79.2" x2="32.9" y2="79.2" />
				<line x1="29.9" y1="80.8" x2="32.9" y2="80.8" />
				<line x1="29.9" y1="82.4" x2="32.9" y2="82.4" />
			</g>
		</>
	);
}
