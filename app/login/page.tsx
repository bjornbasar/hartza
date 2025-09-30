"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";

export default function LoginPage() {
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setError(null);
		setLoading(true);

		const form = e.currentTarget;
		const email = (form.elements.namedItem("email") as HTMLInputElement).value;
		const password = (form.elements.namedItem("password") as HTMLInputElement)
			.value;

		// `redirect: false` → we handle redirect manually
		const res = await signIn("credentials", {
			email,
			password,
			redirect: false,
		});

		setLoading(false);

		if (res?.error) {
			setError("Invalid email or password");
			return;
		}

		// success → go to dashboard/beat
		window.location.href = "/beat";
	}

	return (
		<div className="max-w-sm mx-auto p-6 space-y-4">
			<h1 className="text-xl font-semibold">Log in</h1>
			<form onSubmit={onSubmit} className="space-y-3">
				<input
					name="email"
					type="email"
					placeholder="Email"
					className="w-full border p-2 rounded"
					required
				/>
				<input
					name="password"
					type="password"
					placeholder="Password"
					className="w-full border p-2 rounded"
					required
				/>
				{error && <p className="text-red-600 text-sm">{error}</p>}
				<button
					type="submit"
					disabled={loading}
					className="w-full border rounded p-2 bg-blue-600 text-white"
				>
					{loading ? "Logging in..." : "Log in"}
				</button>
			</form>
			<Link
				href="/register"
				className="block text-center w-full border rounded p-2 bg-gray-200 text-black hover:bg-gray-300"
			>
				Register
			</Link>
		</div>
	);
}
