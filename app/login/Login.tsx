"use client";
import { useAuth } from "@/app/auth/hooks/useAuth";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";
import { AuthCard, AuthSubmit } from "@/app/auth/components/AuthCard";
import { AuthField } from "@/app/auth/components/AuthField";

export function Login() {
	const { setAuthToken } = useAuth();
	const router = useRouter();
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState("");
	const [formData, setFormData] = useState({
		email: "",
		password: "",
	});

	const update = (field: keyof typeof formData) => (value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
		// clear error when user starts typing
		if (error) setError("");
	};

	const handleSubmit = async () => {
		if (isLoading) return;
		setIsLoading(true);
		setError("");

		try {
			const response = await fetch(`/api/auth/login`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				credentials: "include",
				body: JSON.stringify({
					email: formData.email,
					password: formData.password,
				}),
			});

			if (!response.ok) {
				throw new Error(`Login failed`);
			}

			const data = await response.json();
			setAuthToken(data.accessToken);
			router.push("/");
		} catch (error) {
			console.log("login failed: ", error);
			setError("Invalid email or password. Please try again.");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<AuthCard
			tone="emerald"
			caption="Sign in"
			error={error}
			onSubmit={handleSubmit}
			switchTo={{ href: "/register", label: "Create account" }}
		>
			<AuthField
				label="Email"
				name="email"
				type="email"
				value={formData.email}
				onChange={update("email")}
				autoComplete="email"
				placeholder="you@example.com"
				disabled={isLoading}
				autoFocus
			/>
			<AuthField
				label="Password"
				name="password"
				type="password"
				value={formData.password}
				onChange={update("password")}
				autoComplete="current-password"
				placeholder="••••••••"
				disabled={isLoading}
			/>
			<AuthSubmit
				label="Sign In"
				icon={LogIn}
				busy={isLoading}
				incomplete={!formData.email || !formData.password}
			/>
		</AuthCard>
	);
}
