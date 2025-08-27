import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
	title: "Hartza",
	description: "Little bits, in rhythm to savings",
	openGraph: {
		title: "Hartza",
		description: "Little bits, in rhythm to savings",
		images: ["/images/og-image-light.png"],
	},
	icons: {
		icon: "/images/favicon.ico",
		shortcut: "/images/favicon.ico",
		apple: "/images/icon-192.png",
	},
	manifest: "/manifest.webmanifest",
	themeColor: "#2E4A3F",
};

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html lang="en">
			<body className="min-h-screen">
				<header className="px-6 py-4 bg-white border-b">
					<div className="max-w-5xl mx-auto flex items-center gap-3">
						<img src="/icon.svg" alt="Hartza" className="w-8 h-8" />
						<h1
							className="text-xl font-semibold"
							style={{ color: "var(--hartza-green)" }}
						>
							Hartza
						</h1>
					</div>
				</header>
				<main className="max-w-5xl mx-auto p-6">{children}</main>
			</body>
		</html>
	);
}
