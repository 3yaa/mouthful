"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import {
	animate,
	motion,
	useMotionValue,
	useReducedMotion,
	useTransform,
	type MotionValue,
} from "framer-motion";

// the charm's centre in the viewBox
export const CX = 20;
export const CY = 74;
const DEG = Math.PI / 180;

// one compass point as two facets, lit side first
function facets(angle: number, reach: number, base: number) {
	const tip = [
		CX + reach * Math.sin(angle * DEG),
		CY - reach * Math.cos(angle * DEG),
	];
	const side = (turn: number) => [
		CX + base * Math.sin((angle + turn) * DEG),
		CY - base * Math.cos((angle + turn) * DEG),
	];
	const at = (p: number[]) => p.map((n) => n.toFixed(2)).join(",");
	const hub = `${CX},${CY}`;
	return [
		`${at(tip)} ${at(side(90))} ${hub}`,
		`${at(tip)} ${at(side(-90))} ${hub}`,
	];
}

// [angle, reach, base, lit, shade] -- north alone carries colour
const POINTS: [number, number, number, string, string][] = [
	[45, 6.5, 1.6, "#52525b", "#3f3f46"],
	[135, 6.5, 1.6, "#52525b", "#3f3f46"],
	[225, 6.5, 1.6, "#52525b", "#3f3f46"],
	[315, 6.5, 1.6, "#52525b", "#3f3f46"],
	[90, 10, 2.1, "#a1a1aa", "#52525b"],
	[270, 10, 2.1, "#a1a1aa", "#52525b"],
	[180, 12, 2.4, "#d4d4d8", "#71717a"],
	[0, 12, 2.4, "#c4554c", "#7a2b25"],
];

const TICKS = Array.from({ length: 16 }, (_, i) => i * 22.5);

// how far above the top edge it hangs while lowered in or reeled out
const DROP = 130;
// how far a click tugs the chain
const TUG = 22;
const CORD = 41;
const MAX_SWING = 70;
// a slow first compile can hold the next page this long
const SWAP_WINDOW = 8000;

// set as a swap charm leaves -- the way home on the page it lands on is already hanging
let swapTrip: { to: string; at: number } | null = null;

// where a face's turning part sits at rest, under the pointer, and as it leaves
export type CharmTurns = { rest: number; hover: number; go: number };

export type CharmPhase = "arriving" | "idle" | "leaving";

export type CharmMotion = {
	pull: MotionValue<number>;
	turn: MotionValue<number>;
	// 0 wound up, 1 run all the way out -- only a reel's film uses it
	spool: MotionValue<number>;
	hot: boolean;
	phase: CharmPhase;
};

// how a charm comes and goes -- the compass's lamp pull, a reel's film, a set's power cut
export type CharmMove = "lamp" | "roll" | "power";

export function BadgeLink({
	href,
	title,
	className,
	onClick,
	heading = "explore",
}: {
	href: string;
	title: string;
	className: string;
	onClick?: () => void;
	// north sends you out to discover, south brings you home
	heading?: "explore" | "home";
}) {
	const rest = heading === "home" ? 180 : 0;
	return (
		<HangingCharm
			href={href}
			title={title}
			className={className}
			onClick={onClick}
			turns={{ rest, hover: rest + 22, go: rest + 180 }}
		>
			{({ pull, turn }) => <CompassCharm pull={pull} needle={turn} />}
		</HangingCharm>
	);
}

// the hanging, swinging and reeling every charm shares -- a face only draws
export function HangingCharm({
	href,
	title,
	className,
	onClick,
	turns,
	move = "lamp",
	children,
}: {
	href: string;
	title: string;
	className: string;
	onClick?: () => void;
	turns: CharmTurns;
	move?: CharmMove;
	children: (motion: CharmMotion) => ReactNode;
}) {
	const still = !!useReducedMotion();
	const router = useRouter();
	// one discover page to the other -- the compass never left, it only sways
	const [viaSwap] = useState(
		() =>
			move === "lamp" &&
			typeof window !== "undefined" &&
			swapTrip?.to === window.location.pathname &&
			performance.now() - swapTrip.at < SWAP_WINDOW,
	);
	// a pendulum around the top edge, kicked by the pointer
	const swing = useMotionValue(0);
	// how far the charm hangs below its rest
	const pull = useMotionValue(0);
	const lowered = useMotionValue(
		still || move !== "lamp" || viaSwap ? 0 : -DROP,
	);
	const spool = useMotionValue(move === "roll" && !still ? 1 : 0);
	const fade = useMotionValue(move !== "lamp" && !still ? 0 : 1);
	const needle = useMotionValue(
		move === "roll" && !still ? turns.rest - 720 : turns.rest,
	);
	const [hot, setHot] = useState(false);
	const [phase, setPhase] = useState<CharmPhase>(still ? "idle" : "arriving");
	const leaving = useRef(false);
	const leaveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
	const lastKick = useRef(0);

	// a needle drifts and settles -- never a loose spring that wobbles
	const point = (angle: number) => {
		if (still) return;
		animate(needle, angle, { type: "spring", stiffness: 120, damping: 12 });
	};
	const kick = (velocity: number) => {
		if (still) return;
		const v = swing.getVelocity() + velocity;
		animate(swing, 0, {
			type: "spring",
			stiffness: 90,
			damping: 3.5,
			velocity: Math.max(-MAX_SWING, Math.min(MAX_SWING, v)),
		});
	};

	// arrives once the page underneath has shown
	const restTurn = turns.rest;
	useEffect(() => {
		if (still) return;
		let raf = 0;
		const stops: (() => void)[] = [];
		const started = performance.now();
		const arrive = () => {
			if (move === "roll") {
				// spun in, winding its bit of film back as it slows to rest
				const windIn = { duration: 0.9, ease: [0.2, 0.7, 0.3, 1] } as const;
				const film = animate(spool, 0, windIn);
				const wind = animate(needle, restTurn, windIn);
				const show = animate(fade, 1, { duration: 0.2 });
				const sway = animate(swing, 0, {
					type: "spring",
					stiffness: 90,
					damping: 3.5,
					velocity: 14,
					delay: 0.8,
				});
				film.then(() => setPhase("idle"));
				stops.push(film.stop, wind.stop, show.stop, sway.stop);
				return;
			}
			if (move === "power") {
				// already hanging -- the set fades up, then its screen comes on
				const show = animate(fade, 1, { duration: 0.3, ease: "easeOut" });
				show.then(() => setPhase("idle"));
				stops.push(show.stop);
				return;
			}
			if (viaSwap) {
				swapTrip = null;
				// a quicker, tighter wiggle than the hover's lazy swing
				const sway = animate(swing, 0, {
					type: "spring",
					stiffness: 160,
					damping: 5,
					velocity: 70,
				});
				setPhase("idle");
				stops.push(sway.stop);
				return;
			}
			const drop = animate(lowered, 0, {
				type: "spring",
				stiffness: 150,
				damping: 14,
				delay: 0.08,
			});
			// it lands with a little sway
			const sway = animate(swing, 0, {
				type: "spring",
				stiffness: 90,
				damping: 3.5,
				velocity: 30,
				delay: 0.38,
			});
			setPhase("idle");
			stops.push(drop.stop, sway.stop);
		};
		const wait = () => {
			const covered = document.querySelector("[data-route-flash]");
			if (covered && performance.now() - started < 1500) {
				raf = requestAnimationFrame(wait);
				return;
			}
			arrive();
		};
		raf = requestAnimationFrame(wait);
		return () => {
			cancelAnimationFrame(raf);
			stops.forEach((stop) => stop());
		};
	}, [still, move, viaSwap, restTurn, lowered, swing, spool, fade, needle]);

	// a page left another way never gets pushed afterwards
	useEffect(() => () => clearTimeout(leaveTimer.current), []);

	// a lamp pull -- tugged down, let go, reeled out, then the page changes
	const go = async () => {
		if (leaving.current) return;
		leaving.current = true;
		setPhase("leaving");
		if (move !== "lamp") swapTrip = { to: href, at: performance.now() };
		const leave = () => {
			onClick?.();
			router.push(href);
		};
		if (still) return leave();
		if (move === "roll") {
			// the reel spins up, feeding a little film, then it is gone
			const runOut = { duration: 0.55, ease: [0.4, 0, 0.8, 0.5] } as const;
			animate(needle, turns.go, runOut);
			animate(spool, 1, runOut);
			animate(fade, 0, { duration: 0.2, delay: 0.38 });
			leaveTimer.current = setTimeout(leave, 400);
			return;
		}
		if (move === "power") {
			// the knob clicks over and the face switches itself off
			animate(needle, turns.go, { duration: 0.18, ease: [0.3, 0, 0.3, 1] });
			animate(fade, 0.5, { duration: 0.2, delay: 0.3 });
			leaveTimer.current = setTimeout(leave, 320);
			return;
		}
		// one smooth half-turn that lands as the charm leaves
		animate(needle, turns.go, {
			duration: 0.5,
			ease: [0.45, 0, 0.25, 1],
		});
		await animate(pull, TUG, { duration: 0.14, ease: [0.3, 0, 0.3, 1] });
		// the tug and the reel share one curve, so the lift is a single motion
		const lift = { duration: 0.32, ease: [0.33, 0, 0.5, 1] } as const;
		animate(pull, 0, lift);
		animate(lowered, -DROP, lift);
		// the route loads under the last of the reel instead of after it
		leaveTimer.current = setTimeout(leave, lift.duration * 600);
	};

	return (
		<Link
			href={href}
			aria-label={title}
			draggable={false}
			onDragStart={(e) => e.preventDefault()}
			className={`origin-top select-none ${className}`}
			onClick={(e) => {
				e.stopPropagation();
				// a new tab keeps the browser's own behaviour
				if (e.metaKey || e.ctrlKey || e.shiftKey) return;
				e.preventDefault();
				go();
			}}
		>
			<motion.span
				className={`block transition-opacity duration-300 ${hot ? "opacity-100" : "opacity-70"}`}
				style={{
					rotate: swing,
					y: lowered,
					originX: 0.5,
					originY: 0,
				}}
				onPointerDown={(e) => {
					// a press never starts a text selection
					e.preventDefault();
				}}
				onPointerEnter={(e) => {
					setHot(true);
					router.prefetch(href);
					if (!leaving.current && (move === "lamp" || phase === "idle"))
						point(turns.hover);
					kick(e.movementX >= 0 ? 22 : -22);
				}}
				onPointerMove={(e) => {
					const now = performance.now();
					if (Math.abs(e.movementX) < 2) return;
					if (now - lastKick.current < 90) return;
					lastKick.current = now;
					kick(e.movementX * 4);
				}}
				onPointerLeave={() => {
					setHot(false);
					if (!leaving.current && (move === "lamp" || phase === "idle"))
						point(turns.rest);
				}}
			>
				{move === "lamp" ? (
					children({ pull, turn: needle, spool, hot, phase })
				) : (
					<motion.span className="block" style={{ opacity: fade }}>
						{children({ pull, turn: needle, spool, hot, phase })}
					</motion.span>
				)}
			</motion.span>
		</Link>
	);
}

// cord, cap, bail and ring -- the face hangs inside the pulled group; a hanger replaces all four
export function CharmFrame({
	pull,
	hanger,
	children,
}: {
	pull: MotionValue<number>;
	hanger?: ReactNode;
	children: ReactNode;
}) {
	const id = useId();
	const stretch = useTransform(pull, (p) => 1 + p / CORD);
	return (
		<svg
			width="40"
			height="104"
			viewBox="0 0 40 104"
			xmlns="http://www.w3.org/2000/svg"
			className="overflow-visible"
		>
			<defs>
				<linearGradient id={`${id}-cap`} x1="0" y1="0" x2="1" y2="0">
					<stop offset="0" stopColor="#3f3f46" />
					<stop offset="0.45" stopColor="#71717a" />
					<stop offset="1" stopColor="#27272a" />
				</linearGradient>
			</defs>

			{/* braided cord */}
			{!hanger && (
				<motion.g style={{ scaleY: stretch, originX: 0.5, originY: 0 }}>
					<line
						x1="20"
						y1="0"
						x2="20"
						y2="41"
						stroke="#3f3f46"
						strokeWidth="2.4"
					/>
					{Array.from({ length: 10 }, (_, i) => (
						<line
							key={i}
							x1="18.9"
							y1={1 + i * 4}
							x2="21.1"
							y2={3.4 + i * 4}
							stroke="#a1a1aa"
							strokeWidth="0.8"
							opacity="0.55"
						/>
					))}
				</motion.g>
			)}

			<motion.g style={{ y: pull }}>
				{hanger ?? (
					<>
						{/* cap and ring */}
						<rect
							x="16.5"
							y="39"
							width="7"
							height="8"
							rx="2"
							fill={`url(#${id}-cap)`}
						/>
						<line
							x1="17.6"
							y1="43"
							x2="22.4"
							y2="43"
							stroke="#18181b"
							strokeWidth="0.7"
						/>

						{/* bail -- the ring threads through it */}
						<rect
							x="18.4"
							y="52.5"
							width="3.2"
							height="6"
							rx="1.4"
							fill="#3f3f46"
							stroke="#18181b"
							strokeWidth="0.5"
						/>
					</>
				)}

				{children}

				{!hanger && (
					<circle
						cx="20"
						cy="51"
						r="3"
						fill="none"
						stroke="#71717a"
						strokeWidth="1.4"
					/>
				)}
			</motion.g>
		</svg>
	);
}

function CompassCharm({
	pull,
	needle,
}: {
	pull: MotionValue<number>;
	needle: MotionValue<number>;
}) {
	const id = useId();
	const centre = {
		transformBox: "fill-box",
		transformOrigin: "center",
	} as const;
	return (
		<CharmFrame pull={pull}>
			<defs>
				<radialGradient id={`${id}-face`} cx="0.4" cy="0.35" r="0.75">
					<stop offset="0" stopColor="#2a2a2f" />
					<stop offset="1" stopColor="#111113" />
				</radialGradient>
			</defs>

			{/* face */}
			<circle
				cx={CX}
				cy={CY}
				r="17"
				fill={`url(#${id}-face)`}
				stroke="#3f3f46"
				strokeWidth="1"
			/>
			<circle
				cx={CX}
				cy={CY}
				r="13.6"
				fill="none"
				stroke="#27272a"
				strokeWidth="0.8"
			/>
			{TICKS.map((angle) => {
				const major = angle % 90 === 0;
				const inner = major ? 14 : 14.8;
				return (
					<line
						key={angle}
						x1={CX + inner * Math.sin(angle * DEG)}
						y1={CY - inner * Math.cos(angle * DEG)}
						x2={CX + 16 * Math.sin(angle * DEG)}
						y2={CY - 16 * Math.cos(angle * DEG)}
						stroke={major ? "#a1a1aa" : "#52525b"}
						strokeWidth={major ? 0.9 : 0.6}
					/>
				);
			})}

			{/* rose */}
			<motion.g style={{ ...centre, rotate: needle }}>
				{POINTS.map(([angle, reach, base, lit, shade]) => {
					const [left, right] = facets(angle, reach, base);
					return (
						<g key={angle}>
							<polygon points={left} fill={lit} />
							<polygon points={right} fill={shade} />
						</g>
					);
				})}
				<circle
					cx={CX}
					cy={CY}
					r="2.2"
					fill="#e4e4e7"
					stroke="#18181b"
					strokeWidth="0.8"
				/>
				<circle cx={CX} cy={CY} r="0.8" fill="#3f3f46" />
			</motion.g>
		</CharmFrame>
	);
}
