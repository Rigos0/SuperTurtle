import ReactDOM from "react-dom";
import { ConvexReactClient } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { Provider } from "react-redux";
import store from "./store";
import App from "./App";
import "./style.css";

const convex = new ConvexReactClient(process.env.REACT_APP_CONVEX_URL);

ReactDOM.render(
  <ConvexAuthProvider client={convex}>
    <Provider store={store}>
      <App />
    </Provider>
  </ConvexAuthProvider>,
  document.getElementById("root")
);
