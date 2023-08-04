"use client";
import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  selectTodos,
  toggleTodo,
  setTodos,
  deleteTodo,
} from "../redux/todoSlice";
import { saveTodosToLocalStorage } from "../utils/localStorage";

const TodoList: React.FC = () => {
  const todos = useSelector(selectTodos);

  const dispatch = useDispatch();

  const handleToggleTodo = (id: number) => {
    dispatch(toggleTodo(id));
  };

  const handleDeleteTodo = (id: number) => {
    dispatch(deleteTodo(id));
  };

  useEffect(() => {
    const data = localStorage.getItem("todos");
    const todos = data ? JSON.parse(data) : [];

    if (todos && todos.length > 0) {
      dispatch(setTodos(todos));
    }
  }, [dispatch]);

  return (
    <ul className="space-y-2">
      {todos === undefined || todos.length === 0 ? (
        <p className="text-gray-500 flex items-center">No todos, yay!</p>
      ) : (
        todos.map((todo) => (
          <li
            key={todo.id}
            className={`flex items-center justify-between px-4 py-2 ${
              todo.completed ? "bg-green-600" : "bg-slate-700"
            } rounded-md `}
          >
            <span
              className={`cursor-pointer ${
                todo.completed ? "line-through" : ""
              }`}
              onClick={() => handleToggleTodo(todo.id)}
            >
              {todo.text}
            </span>
            <button
              className="ml-2  text-red-600 hover:text-red-700 focus:outline-none"
              onClick={() => handleDeleteTodo(todo.id)}
            >
              Delete
            </button>
          </li>
        ))
      )}
    </ul>
  );
};

export default TodoList;
