"use client";
import {
	Menu,
	Home,
	Video,
	Tv,
	Book,
	Gamepad2,
	X,
	ChevronRight,
	LogIn,
	LogOut,
	type LucideIcon,
} from "lucide-react";
import { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/app/auth/hooks/useAuth";
import { useLogout } from "@/app/auth/hooks/useLogout";
import { useNav } from "./NavContext";
import { useScrollVisibility } from "@/hooks/useScrollVisibility";
import { useFlash } from "./RouteFlash";
import { listingOf } from "@/app/views/mediaListing/ListingSkeleton";

type NavigationItem = {
	label: string;
	icon: LucideIcon;
	path: string;
};

type ActionItem = {
	label: string;
	icon: LucideIcon;
	action: () => Promise<void>;
	isAction: true;
};

type MenuItem = NavigationItem | ActionItem;

// don't show in auth
const AUTH_ROUTES = ["/login", "/register"];

const allMenuItems: NavigationItem[] = [
	{ label: "Movies", icon: Video, path: "/movies" },
	{ label: "Shows", icon: Tv, path: "/shows" },
	{ label: "Books", icon: Book, path: "/books" },
	{ label: "Games", icon: Gamepad2, path: "/games" },
	{ label: "Home", icon: Home, path: "/" },
];

export function NavMenu() {
	const { isNavOpen, setIsNavOpen } = useNav();
	const menuRef = useRef<HTMLDivElement>(null);
	const router = useRouter();
	const pathname = usePathname() || "/";
	const { isAuthenticated } = useAuth();
	const { logout, isLoggingOut } = useLogout();
	const isButtonsVisible = useScrollVisibility(30);
	const flash = useFlash();

	// Determine which menu items to show based on path and auth status
	const getMenuItems = (): MenuItem[] => {
		const authItem: MenuItem = isAuthenticated
			? {
					label: isLoggingOut ? "Logging out..." : "Logout",
					icon: LogOut,
					action: logout,
					isAction: true,
				}
			: { label: "Login", icon: LogIn, path: "/login" };
		return [...allMenuItems, authItem];
	};

	const menuItems = getMenuItems();
	const onAuthScreen = AUTH_ROUTES.some((route) =>
		pathname.startsWith(route),
	);

	// Close menu when clicking outside
	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (
				menuRef.current &&
				event.target instanceof Node &&
				!menuRef.current.contains(event.target)
			) {
				setIsNavOpen(false);
			}
		}

		if (isNavOpen) {
			document.addEventListener("mousedown", handleClickOutside);
		}

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isNavOpen, setIsNavOpen]);

	useEffect(() => {
		function handleEscape(event: KeyboardEvent) {
			const isDesktop = window.matchMedia("(min-width: 900px)").matches;
			if (!isDesktop || onAuthScreen) return;
			// don't trigger when typing/textarea
			if (
				event.target instanceof HTMLInputElement ||
				event.target instanceof HTMLTextAreaElement
			) {
				return;
			}
			//
			switch (event.key) {
				case "Escape":
					if (
						document.querySelector(
							"[data-modal], [aria-modal='true']",
						)
					)
						return;
					setIsNavOpen(!isNavOpen);
					return;
				case "5":
					if (isNavOpen) {
						router.push("/");
						setIsNavOpen(false);
					}
					return;
				case "1":
					if (isNavOpen) {
						router.push("/movies");
						setIsNavOpen(false);
					}
					return;
				case "2":
					if (isNavOpen) {
						router.push("/shows");
						setIsNavOpen(false);
					}
					return;
				case "3":
					if (isNavOpen) {
						router.push("/books");
						setIsNavOpen(false);
					}
					return;
				case "4":
					if (isNavOpen) {
						router.push("/games");
						setIsNavOpen(false);
					}
					return;
				default:
					return;
			}
		}

		document.addEventListener("keydown", handleEscape);

		return () => {
			document.removeEventListener("keydown", handleEscape);
		};
	}, [isNavOpen, router, setIsNavOpen, onAuthScreen]);

	if (onAuthScreen) return null;

	return (
		<>
			<div
				ref={menuRef}
				className={`flex fixed bottom-2 left-2 lg:bottom-8 lg:left-8 z-40 flex-col items-start
        lg:translate-y-0 transition-transform duration-300 ease-in-out
        ${isButtonsVisible ? "translate-y-0" : "translate-y-24"}`}
				onClick={() => setIsNavOpen(!isNavOpen)}
			>
				{/* Dropdown */}
				<AnimatePresence>
					{isNavOpen && (
						<motion.div
							initial={{ opacity: 0, y: 6, scale: 0.97 }}
							animate={{ opacity: 1, y: 0, scale: 1 }}
							exit={{
								opacity: 0,
								y: 6,
								scale: 0.97,
								transition: { duration: 0.12, ease: "easeIn" },
							}}
							transition={{
								type: "spring",
								stiffness: 240,
								damping: 28,
							}}
							className="mb-3 w-40 rounded-xl bg-linear-to-bl from-zinc-transparent via-zinc-800/20 to-zinc-800/60 backdrop-blur-xl 
                       border border-zinc-800/50 ring-1 ring-zinc-800/50 overflow-hidden"
						>
							<ul className="flex flex-col-reverse">
								{menuItems.reverse().map((item, i) => {
									const Icon = item.icon;

									// Handle logout action item
									if ("isAction" in item && item.isAction) {
										return (
											<motion.li
												key={item.label}
												initial={{ opacity: 0, x: -10 }}
												animate={{ opacity: 1, x: 0 }}
												exit={{
													opacity: 0,
													x: -10,
													transition: {
														duration: 0.08,
													},
												}}
												whileTap={{ scale: 0.97 }}
												transition={{
													delay: i * 0.05,
													duration: 0.1,
												}}
											>
												<button
													onClick={(e) => {
														e.stopPropagation();
														setIsNavOpen(false);
														item.action();
													}}
													disabled={isLoggingOut}
													className="w-full flex items-center justify-between pl-4.5 pr-5 py-3
                                   text-sm font-medium text-zinc-300 
                                   hover:text-red-400 hover:bg-linear-to-r from-red-500/8
                                   transition-all group hover:cursor-pointer
                                   disabled:opacity-50 disabled:cursor-not-allowed"
												>
													<div className="flex items-center gap-3">
														<Icon className="w-4.5 h-4.5 opacity-70 group-hover:opacity-100 transition-opacity" />
														<span className="tracking-wide truncate">
															{item.label}
														</span>
													</div>
													<ChevronRight
														className="w-4 h-4 opacity-0 group-hover:opacity-100 
                                                 -translate-x-1 group-hover:translate-x-0 
                                                 transition-all duration-200"
													/>
												</button>
											</motion.li>
										);
									}

									// regular navigation items
									if ("path" in item) {
										return (
											<motion.li
												key={item.label}
												initial={{ opacity: 0, x: -10 }}
												animate={{ opacity: 1, x: 0 }}
												exit={{
													opacity: 0,
													x: -10,
													transition: {
														duration: 0.08,
													},
												}}
												whileTap={{ scale: 0.97 }}
												transition={{
													delay: i * 0.05,
													duration: 0.1,
												}}
											>
												<Link
													href={item.path}
													onClick={(e) => {
														e.stopPropagation();
														setIsNavOpen(false);
														if (
															item.path !==
															pathname
														)
															flash(
																listingOf(
																	item.path,
																),
															);
													}}
													className="w-full flex items-center justify-between pl-4.5 pr-5 py-3
                                   text-sm font-medium text-zinc-300 
                                   hover:text-emerald-500 hover:bg-linear-to-r from-emerald-500/8
                                   active:text-emerald-400 active:from-emerald-500/20
                                   transition-all group hover:cursor-pointer"
												>
													<div className="flex items-center gap-3">
														<Icon className="w-4.5 h-4.5 opacity-70 group-hover:opacity-100 transition-opacity" />
														<span className="tracking-wide truncate">
															{item.label}
														</span>
													</div>
													<ChevronRight
														className="w-4 h-4 opacity-0 group-hover:opacity-100 
                                                 -translate-x-1 group-hover:translate-x-0 
                                                 transition-all duration-200"
													/>
												</Link>
											</motion.li>
										);
									}

									return null;
								})}
							</ul>
						</motion.div>
					)}
				</AnimatePresence>

				{/* MAIN BUTTON */}
				<button
					//border-0 border-zinc-950/50
					className={`flex items-center justify-center w-14 h-14 lg:w-14 lg:h-14 rounded-full 
          bg-linear-to-bl from-zinc-transparent to-zinc-800/60 
          hover:bg-linear-to-bl hover:from-zinc-800/60 hover:to-transparent
          backdrop-blur-xl shadow-md shadow-black
          hover:scale-105 active:scale-95 
          transition-all duration-200 relative z-10 hover:cursor-pointer focus:outline-none`}
				>
					{isNavOpen ? (
						<X className="w-5 h-5 text-zinc-300" />
					) : (
						<Menu className="w-5 h-5 text-zinc-300" />
					)}
				</button>
			</div>
		</>
	);
}
