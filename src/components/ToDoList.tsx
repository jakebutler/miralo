"use client";
import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  Todo,
  selectTodos,
  toggleTodo,
  setTodos,
  deleteTodo,
} from "../redux/todoSlice.ts";
import {
  saveTodosToLocalStorage,
  loadTodosFromLocalStorage,
} from "../utils/localStorage.ts";

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
    const todos = loadTodosFromLocalStorage();
    if (todos && todos.length > 0) {
      dispatch(setTodos(todos));
    }
  }, [dispatch]);

  // Store todos in localStorage whenever they change in the Redux store
  useEffect(() => {
    saveTodosToLocalStorage();
  }, [dispatch]);

  return (
    <ul>
      {todos === undefined || todos.length === 0 ? (
        <p>No todos, yay!</p>
      ) : (
        todos.map((todo) => (
          <li key={todo.id}>
            <span
              style={{
                textDecoration: todo.completed ? "line-through" : "none",
              }}
              onClick={() => handleToggleTodo(todo.id)}
            >
              {todo.text}
            </span>
            <button onClick={() => handleDeleteTodo(todo.id)}>Delete</button>
          </li>
        ))
      )}
    </ul>
  );
};

export default TodoList;
