// components/Navbar.tsx
import Link from "next/link";

export default function Navbar() {
	return (
		<nav className="flex items-center gap-4 p-4 bg-forest-800">
			<Link href="/beat">
				<img src="/images/hartza_beat.png" alt="Hartza" className="h-10" />
			</Link>
			<Link href="/bits">
				<img src="/images/hartza_bits.png" alt="Hartza" className="h-10" />
			</Link>
			<Link href="/allocate" className="ml-4 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
				Allocate
			</Link>
		</nav>
	);
}
