"use client";
import { useAuth } from "@/app/auth/hooks/useAuth";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { AuthCard, AuthSubmit } from "@/app/auth/components/AuthCard";
import { AuthField } from "@/app/auth/components/AuthField";

export function Register() {
	const { setAuthToken } = useAuth();
	const router = useRouter();
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState("");
	const [formData, setFormData] = useState({
		email: "",
		username: "",
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
			const response = await fetch(`/api/auth/register`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				credentials: "include",
				body: JSON.stringify({
					email: formData.email,
					username: formData.username,
					password: formData.password,
				}),
			});

			if (!response.ok) {
				throw new Error(`Registration failed`);
			}

			const data = await response.json();
			setAuthToken(data.accessToken);
			router.push("/");
		} catch (error) {
			console.log("registration failed: ", error);
			setError(
				"Registration failed. Please check your details and try again.",
			);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<AuthCard
			tone="blue"
			caption="Create account"
			error={error}
			onSubmit={handleSubmit}
			switchTo={{ href: "/login", label: "Sign in instead" }}
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
				label="Username"
				name="username"
				type="text"
				value={formData.username}
				onChange={update("username")}
				autoComplete="username"
				placeholder="yourname"
				disabled={isLoading}
			/>
			<AuthField
				label="Password"
				name="password"
				type="password"
				value={formData.password}
				onChange={update("password")}
				autoComplete="new-password"
				placeholder="••••••••"
				disabled={isLoading}
			/>
			<AuthSubmit
				label="Create Account"
				icon={UserPlus}
				busy={isLoading}
				incomplete={
					!formData.email || !formData.username || !formData.password
				}
			/>
		</AuthCard>
	);
}
