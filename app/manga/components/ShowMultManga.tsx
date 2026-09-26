import { MangaSearchResult } from "@/types/manga";
import { X, Check } from "lucide-react";
import Image from "next/image";
import { isResizable } from "@/utils/image-loader";
import { Loading } from "@/app/components/ui/Loading";
import { ModalBackdrop, ModalPanel } from "@/app/components/ui/ModalMotion";

interface MultSearchProps {
	onClose: () => void;
	prompt: string;
	manga: MangaSearchResult[];
	onClickedManga: (manga: MangaSearchResult) => void;
	isLoading?: boolean;
}

export function ShowMultManga({
	onClose,
	manga,
	prompt,
	onClickedManga,
	isLoading,
}: MultSearchProps) {
	return (
		<ModalBackdrop className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 overflow-x-hidden">
			<ModalPanel className="relative bg-[#121212] backdrop-blur-xl border border-zinc-800/50 rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] flex flex-col shadow-xl">
				{isLoading && (
					<Loading
						customStyle={"border-emerald-400 h-8 w-8"}
						text="Searching..."
					/>
				)}
				{/* CLOSE -- go back to detail page */}
				<div className="absolute right-3 top-3 flex items-center gap-2">
					<button
						className="py-1.5 px-2 rounded-lg bg-zinc-800/50 hover:bg-red-600/50 hover:cursor-pointer transition-all group"
						onClick={onClose}
						title={"Close"}
					>
						<X className="w-5 h-5 text-gray-400 group-hover:text-red-300 transition-colors" />
					</button>
				</div>

				{/* TITLE */}
				<h2 className="text-xl font-semibold text-white mb-4">
					Search Results
					{prompt && (
						<span className="text-gray-200 text-lg"> {prompt}</span>
					)}
				</h2>

				<div className="overflow-y-auto space-y-2.5">
					{manga.length === 0 ? (
						<p className="text-gray-400">No manga found.</p>
					) : (
						manga.map((entry, index) => (
							<button
								key={`${entry.anilist_id}-${index}`}
								className="relative w-full text-left p-2 rounded-xl bg-zinc-800/60 hover:bg-zinc-600/40 transition flex gap-5 hover:cursor-pointer"
								onClick={() => onClickedManga(entry)}
							>
								{/* COVER */}
								<div className="w-14 h-21 shrink-0">
									{entry.cover_url ? (
										<Image
											src={entry.cover_url}
											alt={entry.title || "Untitled"}
											width={248}
											height={372}
											unoptimized={!isResizable(
												entry.cover_url,
											)}
											className="w-full h-full object-cover rounded-sm"
										/>
									) : (
										<div className="w-full h-full bg-linear-to-br from-zinc-700 to-zinc-800 rounded-sm border border-zinc-600/30"></div>
									)}
								</div>
								{/* DETAILS */}
								<div className="flex flex-col flex-1 min-w-0">
									<span className="text-lg font-medium text-zinc-100 truncate">
										{entry.title || "Untitled"}
									</span>
									<span className="text-sm text-gray-400 truncate max-w-135">
										{entry.author_name &&
										entry.author_name.length > 0
											? entry.author_name.join(", ")
											: "Unknown Author"}
									</span>
									<span className="text-xs text-gray-500 truncate max-w-135">
										First published:{" "}
										{entry.first_publish_year ?? "Unknown"}
									</span>
								</div>
								{/* ALREADY IN LIBRARY */}
								{entry.isDuplicate && (
									<div className="self-center flex items-center gap-1 text-xs text-emerald-400/80 pr-2 shrink-0">
										<Check className="w-3.5 h-3.5" />
										In library
									</div>
								)}
							</button>
						))
					)}
				</div>
			</ModalPanel>
		</ModalBackdrop>
	);
}
