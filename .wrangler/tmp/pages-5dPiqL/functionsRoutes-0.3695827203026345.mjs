import { onRequest as __api___path___js_onRequest } from "C:\\Users\\LENOVO\\Documents\\ChatGPT\\trade boat\\functions\\api\\[[path]].js"

export const routes = [
    {
      routePath: "/api/:path*",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api___path___js_onRequest],
    },
  ]