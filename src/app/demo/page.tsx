import TodoList from "../../components/ToDoList";
import ToDoForm from "../../components/ToDoForm";

export default function DemoTodoPage() {
  return (
    <div className="bg-gradient-to-r from-[#1f6f78] via-[#2b2f36] to-[#0d1117] text-white min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-slate-900/90 rounded-2xl p-8 shadow-2xl">
        <div className="flex justify-center items-center mb-4">
          <h1 className="text-2xl font-semibold">Todo List</h1>
        </div>
        <TodoList />
        <div className="mt-3">
          <ToDoForm />
        </div>
      </div>
    </div>
  );
}
