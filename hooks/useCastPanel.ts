"use client";

import { useCallback, useMemo, useState } from "react";
import type { ActorWork, CastMember } from "@/utils/getActorInfo";

export type CastSort = "popularity" | "recent";

export function useCastPanel() {
	const [isOpen, setIsOpen] = useState(false);
	const [cast, setCast] = useState<CastMember[]>([]);
	const [castLoading, setCastLoading] = useState(false);
	const [actor, setActor] = useState<CastMember | null>(null);
	const [works, setWorks] = useState<ActorWork[]>([]);
	const [worksLoading, setWorksLoading] = useState(false);
	const [sort, setSort] = useState<CastSort>("popularity");

	// cleared on the way in
	const openCast = useCallback(async (load: () => Promise<CastMember[]>) => {
		setActor(null);
		setIsOpen(true);
		setCastLoading(true);
		try {
			setCast(await load());
		} catch {
			setCast([]);
		} finally {
			setCastLoading(false);
		}
	}, []);

	//
	const openWorks = useCallback(
		async (member: CastMember, load: () => Promise<ActorWork[]>) => {
			setActor(member);
			setWorks([]);
			setWorksLoading(true);
			try {
				setWorks(await load());
			} catch {
				setWorks([]);
			} finally {
				setWorksLoading(false);
			}
		},
		[],
	);

	//
	const openOnPerson = useCallback(
		async (
			load: () => Promise<{
				cast: CastMember[];
				member: CastMember | null;
				works: ActorWork[];
			}>,
		) => {
			setIsOpen(true);
			setActor(null);
			setWorks([]);
			setWorksLoading(true);
			try {
				const found = await load();
				setCast(found.cast);
				setActor(found.member);
				setWorks(found.works);
			} catch {
				setWorks([]);
			} finally {
				setWorksLoading(false);
			}
		},
		[],
	);

	const close = useCallback(() => setIsOpen(false), []);
	// back to the list
	const clearActor = useCallback(() => setActor(null), []);

	const sortedWorks = useMemo(
		() =>
			[...works].sort((a, b) =>
				sort === "recent"
					? b.date.localeCompare(a.date)
					: b.popularity - a.popularity,
			),
		[works, sort],
	);

	return {
		isOpen,
		cast,
		castLoading,
		actor,
		works,
		worksLoading,
		sort,
		setSort,
		sortedWorks,
		openCast,
		openWorks,
		openOnPerson,
		close,
		clearActor,
	};
}
