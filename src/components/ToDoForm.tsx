"use client";
import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { addTodo } from "../redux/todoSlice";

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
    <form onSubmit={handleSubmit}>
      <input type="text" value={todoText} onChange={handleInputChange} />
      <button type="submit">Add Todo</button>
    </form>
  );
}
