import { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

import { LogoutButton } from "./components/LogoutButton";
import Navbar from "./components/Navbar";
import "./globals.css";

export const metadata = {
	title: "Hartza",
	description: "Little bits, in rhythm to savings",
	openGraph: {
		title: "Hartza",
		description: "Little bits, in rhythm to savings",
		images: ["images/app_icon_1024x1024.png"],
	},
	icons: {
		icon: "images/favicon.ico",
		shortcut: "images/favicon.ico",
		apple: "images/hartza-logo.png",
	},
	manifest: "/manifest.webmanifest",
};

export default async function RootLayout({
	children,
}: {
	children: ReactNode;
}) {
	// check session server-side
	const session = await getServerSession(authOptions);

	return (
		<html lang="en">
			<body className="min-h-screen">
				{session && (
					<header className="px-6 py-4 bg-white border-b">
						<div className="max-w-6xl mx-auto flex items-center gap-3 bg-white rounded-lg p-6 text-black shadow">
							<img
								src="/images/inline-logo.png"
								alt="Hartza"
								className="w-80 cursor-pointer"
							/>
							<div className="ml-auto flex items-center gap-4">
								<Navbar />
								<LogoutButton />
							</div>
						</div>
					</header>
				)}
				<main className="max-w-6xl mx-auto p-6 bg-gray-100/60 m-2 rounded-lg">
					{children}
				</main>
			</body>
		</html>
	);
}
