import { defineConfig } from "vite";

export default defineConfig(() => {
  return {
    base: process.env.BASE_PATH || "/",
  };
});
