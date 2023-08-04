import { Todo } from "../redux/todoSlice";
// Function to save todos to localStorage
export const saveTodosToLocalStorage = (todos: Todo[]) => {
  try {
    const serializedTodos = JSON.stringify(todos);
    localStorage.setItem("todos", serializedTodos);
  } catch (error) {
    console.error("Error saving todos to localStorage:", error);
  }
};
