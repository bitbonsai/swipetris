import { onRequestGet as __api_leaderboard_js_onRequestGet } from "/Users/mwolff/bit/swipetris/functions/api/leaderboard.js"
import { onRequestPost as __api_score_js_onRequestPost } from "/Users/mwolff/bit/swipetris/functions/api/score.js"

export const routes = [
    {
      routePath: "/api/leaderboard",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_leaderboard_js_onRequestGet],
    },
  {
      routePath: "/api/score",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_score_js_onRequestPost],
    },
  ]