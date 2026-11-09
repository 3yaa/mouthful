import { useRef, useLayoutEffect } from "react";

interface AutoTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
	maxLines: number;
}

export function AutoTextarea({
	value,
	maxLines,
	className = "",
	...props
}: AutoTextareaProps) {
	const ref = useRef<HTMLTextAreaElement>(null);

	useLayoutEffect(() => {
		const textarea = ref.current;
		if (!textarea) return;
		const { scrollTop } = textarea;
		textarea.style.height = "auto";
		textarea.style.height = `${textarea.scrollHeight}px`;
		textarea.scrollTop = scrollTop;
	}, [value]);

	return (
		<textarea
			ref={ref}
			value={value}
			rows={1}
			style={{ maxHeight: `${maxLines}lh` }}
			className={`w-full resize-none overflow-y-auto bg-transparent outline-none text-gray-300 text-md ${className}`}
			{...props}
		/>
	);
}
