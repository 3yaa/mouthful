import { useAuth } from "@/app/auth/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function useLogout() {
	const { setAuthToken } = useAuth();
	const [isLoggingOut, setIsLoggingOut] = useState(false);
	const router = useRouter();

	const logout = async () => {
		setIsLoggingOut(true);

		try {
			const response = await fetch(`/api/auth/logout`, {
				method: "GET",
				credentials: "include",
			});

			if (!response.ok && response.status !== 204) {
				throw new Error(`Logout failed`);
			}

			setAuthToken(null);
			router.push("/");
		} catch (error) {
			console.log("Logout failed: ", error);
			throw error; // Re-throw so caller can handle
		} finally {
			setIsLoggingOut(false);
		}
	};

	return { logout, isLoggingOut };
}
