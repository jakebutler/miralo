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
    <>
      <h1>My Todos</h1>
      <ToDoForm />
      <TodoList />
    </>
  );
}
