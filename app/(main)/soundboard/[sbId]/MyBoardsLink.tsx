"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

export default function MyBoardsLink({ ownerUid }: { ownerUid: string }) {
    const { data: session } = useSession();
    if (session?.user?.uid !== ownerUid) return null;

    return (
        <Link
            href="/my/soundboards"
            className="rounded-full border border-white/15 hover:border-white/30 px-4 py-2 text-sm text-white/60 hover:text-white transition-colors"
        >
            My Boards
        </Link>
    );
}
