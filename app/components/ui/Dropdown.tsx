import { useState, useRef, useEffect, ReactNode } from "react";
import { ChevronDown, ArrowUpFromDot } from "lucide-react";
import { motion } from "framer-motion";
import { Portal } from "@/utils/portal";

export interface Option {
	value: string;
	label: string;
	scoreLabel?: number;
	bgStyle?: string;
	textStyle?: string;
}

interface DropdownProps {
	value: string;
	options: Option[];
	onChange: (value: string) => void;
	disabled?: boolean;
	dropStyle?: string[];
	customStyle?: string;
	dropDuration?: number;
	trailing?: ReactNode;
	// for score
	flip?: boolean;
}

export function Dropdown({
	value,
	options,
	onChange,
	customStyle = "text-zinc-200 font-bold",
	disabled = false,
	dropStyle,
	dropDuration = 0.3,
	trailing,
	flip = false,
}: DropdownProps) {
	const [isOpen, setIsOpen] = useState(false);
	const selectRef = useRef<HTMLDivElement>(null);
	const buttonRef = useRef<HTMLButtonElement>(null);
	const menuRef = useRef<HTMLDivElement>(null);

	// makes dropdown close when clicking outside it
	useEffect(() => {
		if (!isOpen) return;
		const handleClickOutside = (event: MouseEvent) => {
			if (
				selectRef.current &&
				menuRef.current &&
				!selectRef.current.contains(event.target as Node) &&
				!menuRef.current.contains(event.target as Node)
			) {
				setIsOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () =>
			document.removeEventListener("mousedown", handleClickOutside);
	}, [isOpen]);
	// makes dropdown close when pressing 'ecs' key
	useEffect(() => {
		if (!isOpen) return;
		const handleEscapeKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				// the card under it keeps its escape
				event.stopPropagation();
				setIsOpen(false);
			}
		};
		if (isOpen) {
			document.addEventListener("keydown", handleEscapeKey);
			return () =>
				document.removeEventListener("keydown", handleEscapeKey);
		}
	}, [isOpen]);

	const selectedOption = options.find((option) => {
		return option.value === value;
	});

	const handleSelect = (optionValue: string) => {
		onChange(optionValue);
		setIsOpen(false);
	};

	return (
		<div ref={selectRef} className={`relative ${customStyle}`}>
			{/* BUTTON FOR DROPDOWN */}
			<button
				ref={buttonRef}
				type="button"
				onClick={() => !disabled && setIsOpen(!isOpen)}
				disabled={disabled}
				className={`
          group/dd w-full rounded-lg
          flex items-center justify-between gap-3 px-4 py-3
          ${flip ? "flex-row-reverse" : ""}
          transition-all duration-300 ease-out
          focus:outline-none
            ${
				isOpen
					? "neu-menu rounded-b-none"
					: "neu-raised hover:neu-raised-hi active:scale-[0.99]"
			}
          ${
				disabled
					? "opacity-40 cursor-not-allowed hover:scale-100 hover:shadow-lg hover:shadow-black/20 active:scale-100"
					: "cursor-pointer"
			}
        `}
			>
				<div className="flex items-center gap-2">
					<span className="text-sm font-bold tracking-wide">
						{selectedOption
							? selectedOption.label
							: "Select Option"}
					</span>
					{trailing}
				</div>
				<ChevronDown
					className={`w-4 h-4 text-zinc-400 transition-all duration-300 ease-out ${
						isOpen
							? "rotate-180 text-zinc-300 opacity-100"
							: "rotate-0 opacity-0 group-hover/dd:opacity-100 group-focus-visible/dd:opacity-100"
					}`}
				/>
			</button>
			{/* DROPDOWN */}
			{isOpen && (
				<Portal>
					<motion.div
						ref={menuRef}
						initial={{ opacity: 0, clipPath: "inset(0 0 100% 0)" }}
						animate={{ opacity: 1, clipPath: "inset(0 0 0% 0)" }}
						transition={{
							duration: dropDuration,
							ease: [0.25, 1, 0.5, 1],
						}}
						className="z-50 rounded-lg rounded-t-none neu-menu overflow-hidden min-w-max"
						style={{
							position: "fixed",
							top:
								buttonRef.current?.getBoundingClientRect()
									.bottom ?? 0,
							left:
								buttonRef.current?.getBoundingClientRect()
									.left ?? 0,
							width: buttonRef.current?.offsetWidth, // keeps same width as button
						}}
					>
						{options.map((option) => {
							const textStyle =
								dropStyle?.[0] || option.textStyle;
							const bgStyle = dropStyle?.[1] || option.bgStyle;
							return (
								<button
									key={option.value}
									type="button"
									onClick={() => handleSelect(option.value)}
									className={`w-full flex items-center justify-between px-3 py-2 text-sm font-bold text-zinc-300 focus:outline-none border-b border-zinc-800/90 last:border-none transition-all duration-200 ease-out cursor-pointer
                  ${
						option.value === value
							? `rounded-md bg-linear-to-r from-transparent ${bgStyle}`
							: "hover:bg-zinc-800/70 hover:text-zinc-100"
					}`}
								>
									<span
										className={`${option.value === value ? `${textStyle}` : ""}
                    `}
									>
										{option.label}
									</span>
									{option.scoreLabel && (
										<span className="flex justify-end items-center gap-1 shrink-0">
											{option.value !== "Goosebumps" && (
												<ArrowUpFromDot className="w-3.5 text-center text-zinc-400/70 text-sm leading-none" />
											)}
											<span className="text-sm font-mono text-zinc-400/90 shrink-0">
												{option.scoreLabel}
											</span>
										</span>
									)}
								</button>
							);
						})}
					</motion.div>
				</Portal>
			)}
		</div>
	);
}
