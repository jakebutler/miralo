"use client";
import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../redux/store.ts";
import {
  Todo,
  selectTodos,
  toggleTodo,
  deleteTodo,
} from "../redux/todoSlice.ts";

const TodoList: React.FC = () => {
  const todos: Todo[] = useSelector(selectTodos);
  const dispatch = useDispatch();

  const handleToggleTodo = (id: number) => {
    dispatch(toggleTodo(id));
  };

  const handleDeleteTodo = (id: number) => {
    dispatch(deleteTodo(id));
  };

  return (
    <ul>
      {todos.map((todo) => (
        <li key={todo.id}>
          <span
            style={{ textDecoration: todo.completed ? "line-through" : "none" }}
            onClick={() => handleToggleTodo(todo.id)}
          >
            {todo.text}
          </span>
          <button onClick={() => handleDeleteTodo(todo.id)}>Delete</button>
        </li>
      ))}
    </ul>
  );
};

export default TodoList;
