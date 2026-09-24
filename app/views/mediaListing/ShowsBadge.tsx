"use client";
import Link from "next/link";
import { motion } from "framer-motion";

export function BadgeLink({
	href,
	title,
	className,
	onClick,
}: {
	href: string;
	title: string;
	className: string;
	onClick?: () => void;
}) {
	return (
		<Link
			href={href}
			title={title}
			className={`origin-top ${className}`}
			onClick={(e) => {
				e.stopPropagation();
				onClick?.();
			}}
		>
			<motion.span
				className="block opacity-60 hover:opacity-90 transition-opacity duration-300 origin-top will-change-transform"
				whileHover={{ y: -2, scale: 1.04 }}
				whileTap={{ y: 2, scale: 0.96 }}
				transition={{ type: "spring", stiffness: 520, damping: 30 }}
			>
				<ShowsBadge />
			</motion.span>
		</Link>
	);
}

export function ShowsBadge() {
	return (
		<svg
			width="42"
			height="108"
			viewBox="0 0 80 205"
			xmlns="http://www.w3.org/2000/svg"
		>
			<defs>
				<clipPath id="ribbon-clip">
					<polygon points="10,0 70,0 70,65 40,82 10,65" />
				</clipPath>
			</defs>
			{/* Ribbon stripes - monotone grays */}
			<rect
				x="10"
				y="0"
				width="12"
				height="90"
				fill="#3a3a3a"
				clipPath="url(#ribbon-clip)"
			/>
			<rect
				x="22"
				y="0"
				width="12"
				height="90"
				fill="#5a5a5a"
				clipPath="url(#ribbon-clip)"
			/>
			<rect
				x="34"
				y="0"
				width="12"
				height="90"
				fill="#7a7a7a"
				clipPath="url(#ribbon-clip)"
			/>
			<rect
				x="46"
				y="0"
				width="12"
				height="90"
				fill="#5a5a5a"
				clipPath="url(#ribbon-clip)"
			/>
			<rect
				x="58"
				y="0"
				width="12"
				height="90"
				fill="#3a3a3a"
				clipPath="url(#ribbon-clip)"
			/>
			{/* Fabric weave texture */}
			{Array.from({ length: 18 }).map((_, i) => (
				<line
					key={i}
					x1="10"
					y1={i * 5}
					x2="70"
					y2={i * 5}
					stroke="#000"
					strokeWidth="0.4"
					opacity="0.25"
					clipPath="url(#ribbon-clip)"
				/>
			))}
			{/* Sheen */}
			<rect
				x="10"
				y="0"
				width="5"
				height="65"
				fill="white"
				opacity="0.12"
				clipPath="url(#ribbon-clip)"
			/>
			{/* Eyelet */}
			<circle
				cx="40"
				cy="88"
				r="5"
				fill="#181000"
				stroke="#c9a84c"
				strokeWidth="2"
			/>
			<circle
				cx="40"
				cy="88"
				r="2"
				fill="none"
				stroke="#c9a84c"
				strokeWidth="0.8"
			/>
			{/* Chain */}
			<line
				x1="40"
				y1="93"
				x2="40"
				y2="95"
				stroke="#7a5c10"
				strokeWidth="1.5"
				strokeDasharray="2.5 2"
			/>
			{/* Star - nudged up a touch more */}
			<g transform="translate(40,128) scale(0.7)">
				<polygon
					points="0,-52 9.18,-22.17 36.77,-36.77 22.17,-9.18 52,0 22.17,9.18 36.77,36.77 9.18,22.17 0,52 -9.18,22.17 -36.77,36.77 -22.17,9.18 -52,0 -22.17,-9.18 -36.77,-36.77 -9.18,-22.17"
					fill="#1c1100"
					stroke="#7a5c10"
					strokeWidth="3"
				/>
				<polygon
					points="0,-52 9.18,-22.17 36.77,-36.77 22.17,-9.18 52,0 22.17,9.18 36.77,36.77 9.18,22.17 0,52 -9.18,22.17 -36.77,36.77 -22.17,9.18 -52,0 -22.17,-9.18 -36.77,-36.77 -9.18,-22.17"
					fill="none"
					stroke="#c9a84c"
					strokeWidth="0.8"
					opacity="0.35"
				/>
				<circle
					cx="0"
					cy="0"
					r="27"
					fill="#0e0a00"
					stroke="#c9a84c"
					strokeWidth="2.5"
				/>
				<circle
					cx="0"
					cy="0"
					r="23"
					fill="none"
					stroke="#7a5c10"
					strokeWidth="1"
					strokeDasharray="4 3"
				/>
				<circle
					cx="0"
					cy="0"
					r="19"
					fill="#070500"
					stroke="#c9a84c"
					strokeWidth="1.2"
				/>
				<path
					d="M0,-14 L2.8,-2.8 L14,0 L2.8,2.8 L0,14 L-2.8,2.8 L-14,0 L-2.8,-2.8 Z"
					fill="#c9a84c"
				/>
				<circle cx="0" cy="-23" r="2" fill="#c9a84c" />
				<circle cx="19.9" cy="-11.5" r="2" fill="#c9a84c" />
				<circle cx="19.9" cy="11.5" r="2" fill="#c9a84c" />
				<circle cx="0" cy="23" r="2" fill="#c9a84c" />
				<circle cx="-19.9" cy="11.5" r="2" fill="#c9a84c" />
				<circle cx="-19.9" cy="-11.5" r="2" fill="#c9a84c" />
			</g>
		</svg>
	);
}
