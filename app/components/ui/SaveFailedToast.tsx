"use client";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import {
	dismissFailures,
	retryFailures,
	useSaveFailures,
} from "@/hooks/saveFailures";

// a write the server refused
export function SaveFailedToast() {
	const failures = useSaveFailures();
	const last = failures.at(-1);
	const canRetry = failures.some((f) => f.retry);
	const what =
		failures.length > 1
			? `Couldn't save ${failures.length} changes`
			: last
				? `Couldn't ${last.verb} ${last.label}`
				: "";

	return (
		<div className="fixed inset-x-0 bottom-18 lg:bottom-5 z-60 flex justify-center px-4 pointer-events-none">
			<AnimatePresence>
				{last && (
					<motion.div
						key="save-failed"
						role="status"
						initial={{ opacity: 0, y: 6 }}
						animate={{
							opacity: 1,
							y: 0,
							transition: { duration: 0.24, ease: "easeOut" },
						}}
						exit={{ opacity: 0, transition: { duration: 0.18 } }}
						className="pointer-events-auto flex items-center gap-2.5 min-w-0 max-w-full pl-3 pr-1.5 py-1 rounded-full bg-zinc-900/80 backdrop-blur-md text-xs text-zinc-400 select-none"
					>
						<span className="w-1 h-1 shrink-0 rounded-full bg-rose-400/80" />
						<span className="min-w-0 truncate">{what}</span>
						{canRetry && (
							<button
								type="button"
								onClick={retryFailures}
								className="shrink-0 text-zinc-200 hover:text-white transition-colors duration-150 cursor-pointer"
							>
								Retry
							</button>
						)}
						<button
							type="button"
							onClick={dismissFailures}
							title="Dismiss"
							className="shrink-0 p-0.5 rounded-full text-zinc-600 hover:text-zinc-300 transition-colors duration-150 cursor-pointer"
						>
							<X className="w-3 h-3" />
						</button>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
