import "./style.css";
import { createGameStore } from "./gameStore.js";
import { renderApp } from "./ui.js";

const app = document.querySelector("#app");

if (!app) {
  throw new Error("App container not found");
}

const baseUrl = import.meta.env.BASE_URL;
const store = createGameStore(baseUrl);

const handleRender = (state) => {
  state.letterStates = store.computeLetterStates();
  renderApp({ app, state, store });
};

store.subscribe(handleRender);
store.init();

window.addEventListener("resize", () => {
  if (store.state.route === "game") {
    store.notify();
  }
});
