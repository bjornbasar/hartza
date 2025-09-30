"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export default function RegisterPage() {
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setError(null);
		setLoading(true);

		const form = e.currentTarget;
		const name =
			(form.elements.namedItem("name") as HTMLInputElement)?.value || null;
		const email = (form.elements.namedItem("email") as HTMLInputElement).value;
		const password = (form.elements.namedItem("password") as HTMLInputElement)
			.value;

		// 1) create user
		const r = await fetch("/api/register", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name, email, password }),
		});

		const data = await r.json().catch(() => ({}));
		if (!r.ok) {
			setLoading(false);
			setError(data.error ?? "Failed to register");
			return;
		}

		// 2) auto login with credentials
		const res = await signIn("credentials", {
			email,
			password,
			redirect: false,
		});

		setLoading(false);

		if (res?.error) {
			setError("Registered, but login failed. Try signing in.");
			return;
		}

		// success → go to dashboard/beat
		window.location.href = "/beat";
	}

	return (
		<div className="max-w-sm mx-auto p-6 space-y-4">
			<h1 className="text-xl font-semibold">Create account</h1>
			<form onSubmit={onSubmit} className="space-y-3">
				<input
					name="name"
					type="text"
					placeholder="Name (optional)"
					className="w-full border p-2 rounded"
				/>
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
					placeholder="Password (min 8)"
					className="w-full border p-2 rounded"
					required
				/>
				{error && <p className="text-red-600 text-sm">{error}</p>}
				<button
					type="submit"
					disabled={loading}
					className="w-full border rounded p-2 bg-blue-600 text-white"
				>
					{loading ? "Creating..." : "Sign up"}
				</button>
			</form>

			<p className="text-sm text-center">
				Already have an account?{" "}
				<a href="/login" className="underline">
					Log in
				</a>
			</p>
		</div>
	);
}
