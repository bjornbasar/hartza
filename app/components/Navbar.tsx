// components/Navbar.tsx
import Link from "next/link";

export default function Navbar() {
	return (
		<nav className="flex gap-4 p-4 bg-forest-800">
			<Link href="/beat">
				<img src="/images/hartza_beat.png" alt="Hartza" className="h-10" />
			</Link>
			<Link href="/bits">
				<img src="/images/hartza_bits.png" alt="Hartza" className="h-10" />
			</Link>
		</nav>
	);
}
