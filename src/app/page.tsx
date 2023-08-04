import { options } from "./api/auth/[...nextauth]/options";
import { getServerSession } from "next-auth/next";
import Link from "next/link";
export default async function Home() {
  const session = await getServerSession(options);

  return (
    <div className="bg-gradient-to-r from-violet-800 to-pink-400 text-white min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md mx-auto p-6 rounded-lg bg-gray-900 bg-opacity-80 shadow-xl">
        {session ? (
          <>
            <div className="flex items-center mb-6">
              <img
                src={
                  session.user !== undefined && session.user.image !== null
                    ? session.user.image
                    : "https://static.vecteezy.com/system/resources/previews/021/548/095/original/default-profile-picture-avatar-user-avatar-icon-person-icon-head-icon-profile-picture-icons-default-anonymous-user-male-and-female-businessman-photo-placeholder-social-network-avatar-portrait-free-vector.jpg"
                }
                alt="user image"
                className="w-20 h-20 rounded-full border-4 border-indigo-200"
              />
              <div className="ml-4">
                <h1 className="text-3xl font-bold">{session?.user?.name}</h1>
                <h2 className="text-xl">{session?.user?.email}</h2>
              </div>
            </div>

            <div className="flex space-x-4">
              <Link href="/api/auth/signout?callbackUrl=/">
                <button className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-6 rounded">
                  Sign Out
                </button>
              </Link>
              <Link href="/todos">
                <button className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded">
                  Add Todos
                </button>
              </Link>
            </div>
          </>
        ) : (
          <div className="grid grid-cols-2 gap-4 p-6 rounded-lg shadow-md">
            <div className="col-span-1 flex justify-center items-center">
              <div className="w-80 h-48 flex justify-center items-center">
                <img
                  src="https://img.freepik.com/free-vector/sign-page-abstract-concept-illustration_335657-2242.jpg"
                  alt="Your Image"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div className="col-span-2 flex flex-col justify-between">
              <div>
                <h2 className="text-xl font-bold mb-2">Add Todos Now</h2>
                <p className="text-lg">
                  Login now and keep track of daily tasks. Made with next js and
                  redux toolkit
                </p>
              </div>
              <div className="mt-4">
                <Link href="/api/auth/signin">
                  <button className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded">
                    Sign In
                  </button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
