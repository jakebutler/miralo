import { options } from "../api/auth/[...nextauth]/options";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import TodoList from "../../components/ToDoList";
import ToDoForm from "../../components/ToDoForm";

export default async function ToDos() {
  const session = await getServerSession(options);

  if (!session) {
    redirect("/api/auth/signin?callbackUrl=/todos");
  }

  return (
    <div className="bg-gradient-to-r from-violet-800 to-pink-400 text-white min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full  bg-slate-800 rounded-lg p-8 shadow-lg">
        <div className="flex justify-center items-center mb-4">
          <h1 className="text-2xl font-semibold mb-4">Todo List</h1>
        </div>
        <TodoList />
        <div className="mt-3">
          <ToDoForm />
        </div>
      </div>
    </div>
  );
}
