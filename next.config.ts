import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	async rewrites() {
		return [
			{
				source: "/api/:path*",
				destination: "https://mouthful-server.tailffb772.ts.net/:path*",
			},
		];
	},
	async headers() {
		return [
			{
				source: "/:path*",
				headers: [
					{
						key: "Permissions-Policy",
						value: "camera=(), microphone=(), geolocation=()",
					},
				],
			},
		];
	},
	images: {
		// every image resolves to an upstream CDN variant -- image-loader.ts
		loader: "custom",
		loaderFile: "./utils/image-loader.ts",
		// aligned with TMDB's own tokens
		deviceSizes: [640, 780, 1080, 1280],
		imageSizes: [92, 154, 185, 300, 342, 500],
		remotePatterns: [
			// HARDCOVER
			{
				protocol: "https",
				hostname: "assets.hardcover.app",
				port: "",
				pathname: "/**",
			},
			{
				protocol: "https",
				hostname: "books.google.com",
				port: "",
				pathname: "/books/content**",
			},
			// TMDB
			{
				protocol: "https",
				hostname: "image.tmdb.org",
				port: "",
				pathname: "/t/p/**",
			},
			// IGDB
			{
				protocol: "https",
				hostname: "images.igdb.com",
				port: "",
				pathname: "/igdb/image/upload/**",
			},
			// ANILIST
			{
				protocol: "https",
				hostname: "s4.anilist.co",
				port: "",
				pathname: "/file/anilistcdn/**",
			},
			// STEAMGRIDDB
			{
				protocol: "https",
				hostname: "*.steamgriddb.com",
				port: "",
				pathname: "/**",
			},
		],
	},
};

export default nextConfig;
