const Router = require("koa-router")

const userRouter = new Router({ prefix: "/user" })

const {
  verifyUser,
  passwordHandle,
  createUser,
  getAvatar,
  handleFollow,
  verifyLogin,
  login,
  changeInfo
} = require("./middleware")

const { verifyTokenVoid } = require("../../common/common-middleware")

userRouter.post("/", verifyUser, passwordHandle, createUser) // 注册
userRouter.post("/follow", verifyTokenVoid, handleFollow) // 关注/取关
userRouter.get("/:userId/avatar", getAvatar) // 查看头像
userRouter.post("/info", verifyTokenVoid, changeInfo) // 查看头像

userRouter.post("/login", verifyLogin, login) // 登录
userRouter.post("/token", verifyTokenVoid, login) // 刷新token

module.exports = userRouter
