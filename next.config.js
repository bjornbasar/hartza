/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	watchOptions: {
		ignored: ['**/node_modules/**', '**/.git/**'],
	},
	// Optional: cache static assets aggressively in prod
	async headers() {
		return [
			{
				source: "/:all*(png|svg|jpg|jpeg|ico|webp)",
				headers: [
					{
						key: "Cache-Control",
						value: "public, max-age=31536000, immutable",
					},
				],
			},
		];
	},
};

module.exports = nextConfig;
