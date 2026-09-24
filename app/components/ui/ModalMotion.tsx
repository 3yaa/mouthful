"use client";

import { motion, HTMLMotionProps, Variants } from "framer-motion";

// how long backdrop takes to leave
export const MODAL_EXIT_MS = 180;

const backdropVariants: Variants = {
	hidden: { opacity: 0 },
	// slightly ahead of the panel
	visible: { opacity: 1, transition: { duration: 0.32, ease: "easeOut" } },
	exit: {
		opacity: 0,
		transition: { duration: MODAL_EXIT_MS / 1000, ease: "easeIn" },
	},
};

// no scale, and a tween rather than a spring
const panelVariants: Variants = {
	hidden: { opacity: 0, y: 20 },
	visible: {
		opacity: 1,
		y: 0,
		transition: {
			y: { duration: 0.52, ease: [0.16, 1, 0.3, 1] },
			opacity: { duration: 0.28, ease: "easeOut" },
		},
	},
	// nothing of its own on exit
	exit: {},
};

export function ModalBackdrop(props: HTMLMotionProps<"div">) {
	return (
		<motion.div
			data-modal
			variants={backdropVariants}
			initial="hidden"
			animate="visible"
			exit="exit"
			{...props}
		/>
	);
}

export function ModalPanel(props: HTMLMotionProps<"div">) {
	return (
		<motion.div
			variants={panelVariants}
			initial="hidden"
			animate="visible"
			exit="exit"
			{...props}
		/>
	);
}
