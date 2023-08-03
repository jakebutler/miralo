// Function to save todos to localStorage
export const saveTodosToLocalStorage = (todos: Todo[]) => {
  try {
    const serializedTodos = JSON.stringify(todos);
    localStorage.setItem("todos", serializedTodos);
  } catch (error) {
    console.error("Error saving todos to localStorage:", error);
  }
};

// Function to load todos from localStorage
export const loadTodosFromLocalStorage = (): Todo[] => {
  try {
    const serializedTodos = localStorage.getItem("todos");
    return serializedTodos ? JSON.parse(serializedTodos.todos) : [];
  } catch (error) {
    console.error("Error loading todos from localStorage:", error);
    return [];
  }
};
