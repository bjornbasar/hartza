// components/Navbar.tsx
import Link from "next/link";

export default function Navbar() {
	return (
		<nav className="flex items-center gap-6 text-gray-700">
			<Link href="/beat" className="flex items-center gap-2 hover:text-blue-600 transition-colors">
				<span className="text-lg">🐻</span>
				<span className="font-medium">Beat</span>
			</Link>
			<Link href="/bits" className="flex items-center gap-2 hover:text-blue-600 transition-colors">
				<span className="text-lg">💰</span>
				<span className="font-medium">Bits</span>
			</Link>
			<Link href="/add" className="flex items-center gap-2 hover:text-blue-600 transition-colors">
				<span className="text-lg">➕</span>
				<span className="font-medium">Add</span>
			</Link>
			<Link href="/paws" className="flex items-center gap-2 hover:text-blue-600 transition-colors">
				<span className="text-lg">🐾</span>
				<span className="font-medium">Paws</span>
			</Link>
			<Link href="/den" className="flex items-center gap-2 hover:text-blue-600 transition-colors">
				<span className="text-lg">🏠</span>
				<span className="font-medium">Den</span>
			</Link>
			<Link href="/flow" className="flex items-center gap-2 hover:text-blue-600 transition-colors">
				<span className="text-lg">📋</span>
				<span className="font-medium">Flow</span>
			</Link>
		</nav>
	);
}
