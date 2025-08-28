import { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

import { LogoutButton } from "./components/LogoutButton";
import Navbar from "./components/Navbar";
import "./globals.css";

export const metadata = {
	title: "Hartza",
	description: "Little bits, in rhythm to savings",
	openGraph: {
		title: "Hartza",
		description: "Little bits, in rhythm to savings",
		images: ["/images/app_icon_1024x1024.png"],
	},
	icons: {
		icon: "/images/favicon.ico",
		shortcut: "/images/favicon.ico",
		apple: "/images/app_icon_128x128.png",
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
						<div className="max-w-5xl mx-auto flex items-center gap-3">
							<img
								src="/images/inline-logo.png"
								alt="Hartza"
								className="w-80"
							/>
							<div className="ml-auto flex items-center gap-4">
								<Navbar />
								<LogoutButton />
							</div>
						</div>
					</header>
				)}
				<main className="max-w-5xl mx-auto p-6">{children}</main>
			</body>
		</html>
	);
}
