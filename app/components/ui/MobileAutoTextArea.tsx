import { useRef, useLayoutEffect } from "react";

interface MobileAutoTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
	maxLines: number;
}

export function MobileAutoTextarea({
	value,
	maxLines,
	className = "",
	...props
}: MobileAutoTextareaProps) {
	const ref = useRef<HTMLTextAreaElement>(null);

	useLayoutEffect(() => {
		const textarea = ref.current;
		if (!textarea) return;
		const { scrollTop } = textarea;
		textarea.style.height = "auto";
		textarea.style.height = `${textarea.scrollHeight}px`;
		textarea.scrollTop = scrollTop;
		// a growing box stays above the keyboard
		if (document.activeElement === textarea) {
			textarea.scrollIntoView({ block: "nearest" });
		}
	}, [value]);

	// prevent zoom on mobile when textarea is focused
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

	return (
		<textarea
			ref={ref}
			value={value}
			rows={1}
			style={{
				maxHeight: `${maxLines}lh`,
				fontSize: "16px", // prevents iOS zoom
			}}
			className={`w-full resize-none overflow-y-auto bg-transparent outline-none text-gray-300 text-md ${className}`}
			{...props}
		/>
	);
}
