import { options } from "./api/auth/[...nextauth]/options";
import { getServerSession } from "next-auth/next";
import Link from "next/link";

export default async function Home() {
  const session = await getServerSession(options);

  return (
    <>
      {session ? (
        <>
          <h1 className="text-5xl">Welcome {session.user.name}</h1>
          <Link href="/api/auth/signout">Sign Out</Link>
        </>
      ) : (
        <>
          <h1 className="text-5xl">Login to add to-dos!</h1>

          <Link href="/api/auth/signin">Sign In</Link>
        </>
      )}
    </>
  );
}
