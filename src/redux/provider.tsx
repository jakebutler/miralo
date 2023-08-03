"use client";
import store from "./store";
import { Provider } from "react-redux";
import { saveTodosToLocalStorage } from "../utils/localStorage";

store.subscribe(() => {
  saveTodosToLocalStorage(store.getState().todos);
});

export default function ReduxProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Provider store={store}>{children}</Provider>;
}
