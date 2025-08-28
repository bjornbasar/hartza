"use client";
import { signOut } from "next-auth/react";

export function LogoutButton() {
	return (
		<button
			onClick={() => signOut({ callbackUrl: "/login" })}
			className="border rounded px-3 py-2"
		>
			Log out
		</button>
	);
}
