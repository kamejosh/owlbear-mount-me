import ReactDOM, { Container } from "react-dom/client";
import * as React from "react";
import "./main.css";
import { App } from "./App.tsx";

const root = ReactDOM.createRoot(document.querySelector("#root") as Container);
root.render(React.createElement(App));
