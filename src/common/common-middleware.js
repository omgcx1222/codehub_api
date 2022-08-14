const jwt = require("jsonwebtoken")

const { PUBLIC_KEY } = require("../app/config")
const {
  TOKEN_NOT_OK,
  NOT_OPERATION_PERMISSION,
  MOMENT_EXIST,
  COMMENT_EXIST,
  PARAMS_ERROR
} = require("../util/error-type")

const { permissionExist, momentExist, macExist, userExist } = require("./common-service")

class CommonMiddleware {
  // 验证token(失败不执行)
  async verifyTokenVoid(ctx, next) {
    // 获取请求头中的token
    const authorization = ctx.request?.headers?.authorization ?? ""
    const token = authorization.replace("Bearer ", "")
    // 验证token
    try {
      const result = jwt.verify(token, PUBLIC_KEY, {
        algorithms: ["RS256"]
      })
      // 验证token通过，保存验证token的用户的信息
      ctx.user = result
    } catch (err) {
      const error = new Error(TOKEN_NOT_OK)
      return ctx.app.emit("error", error, ctx)
    }

    await next()
  }

  // 验证token(失败依旧执行next)
  async verifyToken(ctx, next) {
    // 获取请求头中的token
    const authorization = ctx.request?.headers?.authorization ?? ""
    if (typeof authorization !== "string") return
    const token = authorization.replace("Bearer ", "")
    // 验证token
    try {
      const result = jwt.verify(token, PUBLIC_KEY, {
        algorithms: ["RS256"]
      })
      // 验证token通过，保存验证token的用户的信息
      ctx.user = result
    } catch (err) {
      // const error = new Error(TOKEN_NOT_OK)
      // return ctx.app.emit('error', error, ctx)
    }
    await next()
  }

  // 验证操作权限
  verifyPermission(tableName) {
    return async (ctx, next) => {
      const typeId = ctx.params[tableName + "Id"]
      const { id } = ctx.user
      const result = await permissionExist(tableName, typeId, id)

      if (!result.length) {
        const error = new Error(NOT_OPERATION_PERMISSION)
        return ctx.app.emit("error", error, ctx)
      }

      await next()
    }
  }

  // 检查动态是否存在
  async verifyMoment(ctx, next) {
    const { momentId } = ctx.request.body
    if (!momentId) return ctx.app.emit("error", new Error(PARAMS_ERROR), ctx)

    const result = await momentExist(momentId)
    if (!result.length) {
      return ctx.app.emit("error", new Error(MOMENT_EXIST), ctx)
    }

    await next()
  }

  // 检查动态和评论是否同时存在
  async verifyMomentAndComment(ctx, next) {
    const { momentId, commentId } = ctx.request.body
    if (!commentId || !momentId) return ctx.app.emit("error", new Error(PARAMS_ERROR), ctx)

    const result = await macExist(commentId, momentId)
    if (!result.length) {
      return ctx.app.emit("error", new Error(COMMENT_EXIST), ctx)
    }

    await next()
  }

  // 更新用户信息
  async updateInfo(ctx, next) {
    const result = await userExist("id", ctx.user.id)
    if (!result.length) {
      const err = new Error(errorType.USERNAME_IS_NULL)
      return ctx.app.emit("error", err, ctx)
    }
    ctx.user = result[0]

    await next()
  }
}

module.exports = new CommonMiddleware()
