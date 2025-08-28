// components/Navbar.tsx
import Link from "next/link";

export default function Navbar() {
	return (
		<nav className="flex gap-4 p-4 bg-forest-800">
			<Link href="/beat">🏠 Beat</Link>
			<Link href="/bits">➕ Bits</Link>
		</nav>
	);
}
