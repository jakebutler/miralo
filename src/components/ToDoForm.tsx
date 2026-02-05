"use client";
import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { addTodo, Todo } from "../redux/todoSlice";
import { saveTodosToLocalStorage } from "../utils/localStorage";

export default function ToDoForm() {
  const [todoText, setTodoText] = useState("");
  const dispatch = useDispatch();

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTodoText(event.target.value);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (todoText.trim()) {
      const newTodo: Todo = {
        id: Date.now(),
        text: todoText,
        completed: false,
      };
      dispatch(addTodo(newTodo));
      setTodoText("");
    }
  };
  return (
    <form onSubmit={handleSubmit} className="flex mb-4" data-testid="todo-form">
      <input
        type="text"
        value={todoText}
        onChange={handleInputChange}
        data-testid="todo-input"
        aria-label="Todo input"
        placeholder="Add a task"
        className="flex-1 py-2 px-4 bg-slate-800 border border-white rounded-l-sm mr-2"
      />
      <button
        type="submit"
        data-testid="add-todo-button"
        className="bg-violet-500 hover:bg-violet-600 text-white px-4 rounded-r-md"
      >
        Add Todo
      </button>
    </form>
  );
}
