"use client";
import { usePathname } from "next/navigation";
import {
	listingOf,
	ListingSkeleton,
} from "./views/mediaListing/ListingSkeleton";

export default function RouteLoading() {
	return <ListingSkeleton listing={listingOf(usePathname() ?? "")} />;
}
