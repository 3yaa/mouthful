import type { Metadata } from "next";
import { Cinzel, Geist } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/app/auth/AuthContext";
import { NavMenu } from "./components/NavMenu";
import { RouteGuard } from "@/app/auth/RouteGuard";
import { NavProvider } from "./components/NavContext";
import { RouteFlashProvider } from "./components/RouteFlash";

const geist = Geist({ subsets: ["latin"], display: "swap" });

// title text
const cinzel = Cinzel({
	subsets: ["latin"],
	display: "swap",
	weight: ["400", "600", "700"],
	variable: "--font-cinzel",
});

export const metadata: Metadata = {
	title: "Mouthful",
	description: "Manage all your libraries in one place",
	icons: {
		icon: "/logo.png",
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" className={`${geist.className} ${cinzel.variable}`}>
			{/* so we don't play a cold dns + tcp + tls handshake on first image load */}
			<link rel="preconnect" href="https://image.tmdb.org" />
			<link rel="preconnect" href="https://images.igdb.com" />
			<link rel="dns-prefetch" href="https://assets.hardcover.app" />
			<body className="antialiased bg-zinc-950 text-zinc-100">
				<AuthProvider>
					<NavProvider>
						<RouteFlashProvider>
							<RouteGuard>{children}</RouteGuard>
							<NavMenu />
						</RouteFlashProvider>
					</NavProvider>
				</AuthProvider>
			</body>
		</html>
	);
}
