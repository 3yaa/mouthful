import { useRef, useLayoutEffect, useCallback, useState } from "react";

interface MobileAutoTextareaProps extends Omit<
	React.TextareaHTMLAttributes<HTMLTextAreaElement>,
	"onInput"
> {
	minHeight?: number;
	maxHeight?: number;
}

export function MobileAutoTextarea({
	value,
	onChange,
	onKeyDown,
	minHeight = 0,
	maxHeight = 400,
	className = "",
	...props
}: MobileAutoTextareaProps) {
	const ref = useRef<HTMLTextAreaElement>(null);
	const [isOverflowing, setIsOverflowing] = useState(false);

	const adjustHeight = useCallback(() => {
		const textarea = ref.current;
		if (!textarea) return;

		const isActive = document.activeElement === textarea;

		// Reset height to auto to get accurate scrollHeight
		textarea.style.height = "auto";

		// Calculate new height based on content
		const currentHeight = textarea.scrollHeight;
		const newHeight = Math.min(
			Math.max(currentHeight, minHeight),
			maxHeight,
		);
		const willOverflow = currentHeight > maxHeight;

		// Apply height change
		textarea.style.height = `${newHeight}px`;
		setIsOverflowing(willOverflow);

		if (isActive) {
			textarea.scrollIntoView({ block: "nearest" });
		}
	}, [maxHeight, minHeight]);

	// Adjust height when value changes
	useLayoutEffect(() => {
		adjustHeight();
	}, [value, adjustHeight]);

	// Prevent zoom on mobile when textarea is focused
	useLayoutEffect(() => {
		const textarea = ref.current;
		if (!textarea) return;

		const handleFocus = () => {
			const scrollX = window.scrollX;
			const scrollY = window.scrollY;

			requestAnimationFrame(() => {
				window.scrollTo(scrollX, scrollY);
			});
		};

		textarea.addEventListener("focus", handleFocus);
		return () => textarea.removeEventListener("focus", handleFocus);
	}, []);

	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLTextAreaElement>) => {
			onChange?.(e);
		},
		[onChange],
	);

	const handleInput = useCallback(() => {
		requestAnimationFrame(() => {
			adjustHeight();
		});
	}, [adjustHeight]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
			if (e.key === "Enter") {
				setTimeout(() => adjustHeight(), 0);
			}
			onKeyDown?.(e);
		},
		[adjustHeight, onKeyDown],
	);

	return (
		<textarea
			ref={ref}
			value={value}
			onChange={handleChange}
			onInput={handleInput}
			onKeyDown={handleKeyDown}
			rows={1}
			style={{
				minHeight: `${minHeight}px`,
				maxHeight: `${maxHeight}px`,
				paddingBottom: isOverflowing ? "1.25rem" : undefined,
				boxSizing: "border-box",
				overflowY: isOverflowing ? "auto" : "hidden",
				fontSize: "16px", // Prevents iOS zoom
			}}
			className={`w-full resize-none bg-transparent outline-none text-gray-300 text-md ${className}`}
			{...props}
		/>
	);
}
