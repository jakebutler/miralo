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
    <div className="min-h-screen flex flex-col justify-center  items-center">
      <div className="max-w-md w-full bg-white bg-slate-800rounded-lg p-8 shadow-lg">
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
