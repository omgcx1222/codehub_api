const fs = require("fs")

const jwt = require("jsonwebtoken")

const errorType = require("../../util/error-type")
const service = require("./service")
const common = require("../../common/common-service")
const md5password = require("../../util/md5password")
const { AVATAR_PATH } = require("../../util/file-path")
const { PRIVATE_KEY } = require("../../app/config")

class UserMiddleware {
  // 用户验证
  async verifyUser(ctx, next) {
    const { username, password, nickname } = ctx.request.body

    // 判断账号密码是否为空
    if (!username || !password || !nickname) {
      const err = new Error(errorType.USERNAME_PASSWORD_IS_NULL)
      return ctx.app.emit("error", err, ctx)
    }

    // 校验账号密码规则（4-16，数字或字母组成 -- 数字,英文,字符中的两种以上，长度4-16）
    const usernameRule = /^[a-zA-Z0-9]{4,16}$/
    const passwordRule = /^(?![0-9]+$)(?![a-z]+$)(?![A-Z]+$)(?!([^(0-9a-zA-Z)])+$).{4,16}$/
    if (!usernameRule.test(username) || !passwordRule.test(password)) {
      const err = new Error(errorType.USERNAME_PASSWORD_RULE)
      return ctx.app.emit("error", err, ctx)
    }

    // 判断账号是否存在
    const result1 = await common.userExist("username", username)
    if (result1.length) {
      const err = new Error(errorType.USERNAME_EXIST)
      return ctx.app.emit("error", err, ctx)
    }

    // 判断昵称是否存在
    const result2 = await common.userExist("nickname", nickname)
    if (result2.length) {
      const err = new Error(errorType.NICKNAME_EXIST)
      return ctx.app.emit("error", err, ctx)
    }

    await next()
  }

  // 密码加密
  async passwordHandle(ctx, next) {
    ctx.request.body.password = md5password(ctx.request.body.password)
    await next()
  }

  // 注册
  async createUser(ctx, next) {
    // 获取请求参数
    const user = ctx.request.body

    // 数据库操作
    const res = await service.create(user)
    // 加入默认聊天室
    await service.addRoom(res.insertId)

    // 返回结果
    ctx.body = "注册成功"
  }

  // 关注/取消关注
  async handleFollow(ctx, next) {
    const id = ctx.user.id
    const { followId } = ctx.request.body
    if (!followId) return ctx.app.emit("error", new Error(errorType.PARAMS_ERROR), ctx)
    if (id == followId) return ctx.app.emit("error", new Error(errorType.CAN_NOT_FOLLOW_ABOUT_YOURSELF), ctx)

    // 判断是否已关注
    const result = await service.fansExist(followId, id)
    if (result.length) {
      await service.unfollow(followId, id)
      ctx.body = "取消关注"
    } else {
      await service.follow(followId, id)
      ctx.body = "关注成功"
    }
  }

  // 读取头像
  async getAvatar(ctx, next) {
    const { userId } = ctx.params
    const result = await service.avatar(userId)

    ctx.response.set("Content-Type", result.mimetype)
    ctx.body = fs.createReadStream(`${AVATAR_PATH}/${result[0].filename}`)
  }

  // 验证登录账号密码
  async verifyLogin(ctx, next) {
    // 获取登录信息
    const { username, password } = ctx.request.body
    if (!username || !password) return ctx.app.emit("error", new Error(errorType.PARAMS_ERROR), ctx)

    // 判断账号密码是否为空
    if (!username || !password) {
      const err = new Error(errorType.USERNAME_PASSWORD_IS_NULL)
      return ctx.app.emit("error", err, ctx)
    }

    // 判断账号是否存在
    const result = await common.userExist("username", username)
    if (!result.length) {
      const err = new Error(errorType.USERNAME_IS_NULL)
      return ctx.app.emit("error", err, ctx)
    }

    // 判断密码是否正确
    if (result[0].password !== md5password(password)) {
      const err = new Error(errorType.USERNAME_PASSWORD_ERROR)
      return ctx.app.emit("error", err, ctx)
    }

    ctx.user = result[0]
    await next()
  }

  // 登录通过
  async login(ctx, next) {
    // 获取用户信息
    const { id, username, nickname, avatar_url, signature, ip } = ctx.user

    // 颁发token
    const token = jwt.sign({ id, username, nickname, avatar_url, signature }, PRIVATE_KEY, {
      expiresIn: 60 * 60 * 24 * 30, // 一个月
      // expiresIn: 10,
      algorithm: "RS256"
    })

    // 获取关注个数
    const { followCount } = await service.followCount(id)

    // 获取粉丝个数及排行
    const { fansCount } = await service.fansCount(id)

    // 获取粉丝排名
    const rank1000 = await common.fansRank(0, 1000)
    let userRank = rank1000.findIndex((item) => item.userId === id)
    if (userRank === -1) {
      userRank = "1000+"
    } else {
      userRank += 1
    }

    // 获取获赞个数
    const { getAgreeCount } = await service.getAgreeCount(id)
    // 返回登录结果
    ctx.body = {
      id,
      ip,
      username,
      nickname,
      avatarUrl: avatar_url,
      signature,
      followCount,
      fansCount,
      getAgreeCount,
      userRank,
      token
    }
  }

  // 修改用户信息
  async changeInfo(ctx, next) {
    const { id } = ctx.user
    const { nickname, signature } = ctx.request.body
    if (typeof nickname !== "string" || typeof signature !== "string") return

    let success = "修改成功"
    if (nickname && nickname.length <= 10) {
      const res = await service.changeInfoService(id, "nickname", nickname)
      if (res !== "成功") {
        success = "昵称修改失败"
      }
    }
    if (signature && signature.length <= 30) {
      const res = await service.changeInfoService(id, "signature", signature)
      if (res !== "成功") {
        success = "签名修改失败"
      }
    }
    ctx.body = success
  }
}

module.exports = new UserMiddleware()
