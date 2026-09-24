"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { FIELD_LABEL } from "@/utils/styleUtils";

interface AuthFieldProps {
	label: string;
	name: string;
	type: "email" | "text" | "password";
	value: string;
	onChange: (value: string) => void;
	autoComplete: string;
	placeholder?: string;
	disabled?: boolean;
	autoFocus?: boolean;
}

export function AuthField({
	label,
	name,
	type,
	value,
	onChange,
	autoComplete,
	placeholder,
	disabled = false,
	autoFocus = false,
}: AuthFieldProps) {
	const [revealed, setRevealed] = useState(false);
	const isSecret = type === "password";
	const Reveal = revealed ? EyeOff : Eye;

	return (
		<div>
			<label htmlFor={name} className={`${FIELD_LABEL} mb-1.5`}>
				{label}
			</label>
			<div className="relative">
				<input
					id={name}
					name={name}
					type={isSecret && revealed ? "text" : type}
					value={value}
					onChange={(e) => onChange(e.target.value)}
					placeholder={placeholder}
					autoComplete={autoComplete}
					autoFocus={autoFocus}
					required
					disabled={disabled}
					className={`w-full rounded-lg px-4 py-3 ${
						isSecret ? "pr-12" : ""
					} neu-carved font-medium text-zinc-300/85 outline-none transition-all duration-300 ease-out placeholder-zinc-500 focus:neu-carved-in focus:text-zinc-200 disabled:opacity-60`}
				/>
				{isSecret && (
					<button
						type="button"
						onClick={() => setRevealed((on) => !on)}
						disabled={disabled}
						aria-label={
							revealed ? "Hide password" : "Show password"
						}
						aria-pressed={revealed}
						title={revealed ? "Hide password" : "Show password"}
						className="absolute top-1/2 right-2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-zinc-500 transition-[background-color,box-shadow,color,transform] duration-150 enabled:hover:neu-carved-hi enabled:hover:cursor-pointer enabled:hover:text-zinc-300 enabled:active:scale-95 focus-visible:neu-carved-hi focus-visible:text-zinc-200 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-(--tone) disabled:opacity-45"
					>
						<Reveal className="h-4 w-4" strokeWidth={1.75} />
					</button>
				)}
			</div>
		</div>
	);
}
