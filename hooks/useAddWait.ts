import { useCallback, useState } from "react";

// for making details wait after adding
export function useAddWait(add?: () => void | Promise<unknown>) {
	const [isSubmitting, setIsSubmitting] = useState(false);

	const submit = useCallback(async () => {
		if (!add || isSubmitting) return;
		setIsSubmitting(true);
		try {
			await add();
		} finally {
			setIsSubmitting(false);
		}
	}, [add, isSubmitting]);

	return { isSubmitting, submit };
}
