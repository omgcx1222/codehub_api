const jwt = require('jsonwebtoken')

const common = require('../../common/common-service')
const service = require('./service')
const errorType = require('../../util/error-type')
const md5password = require('../../util/md5password')
const { PRIVATE_KEY } = require('../../app/config')

class LoginMiddleware {
  // 验证登录账号密码
  async verifyLogin(ctx, next) {
    // 获取登录信息
    const { username, password } = ctx.request.body
    if(!username || !password) return ctx.app.emit('error', new Error(errorType.PARAMS_ERROR), ctx)
    
    // 判断账号密码是否为空
    if(!username || !password) {
      const err = new Error(errorType.USERNAME_PASSWORD_IS_NULL)
      return ctx.app.emit('error', err, ctx)
    }

    // 判断账号是否存在
    const result = await common.userExist("username", username)
    if(!result.length) {
      const err = new Error(errorType.USERNAME_IS_NULL)
      return ctx.app.emit('error', err, ctx)
    }

    // 判断密码是否正确
    if(result[0].password !== md5password(password)) {
      const err = new Error(errorType.USERNAME_PASSWORD_ERROR)
      return ctx.app.emit('error', err, ctx)
    }

    ctx.user = result[0]
    await next()
  }

  // 登录通过
  async login(ctx, next) {
    // 获取用户信息
    const { id, username, nickname, avatar_url, signature } = ctx.user
    
    // 颁发token
    const token = jwt.sign({ id, username }, PRIVATE_KEY, {
      expiresIn: 60 * 60 * 24,
      // expiresIn: 10,
      algorithm: "RS256"
    })

    // 获取关注个数
    const { followCount } = await service.followCount(id)

    // 获取粉丝个数及排行
    const { fansCount } = await service.fansCount(id)

    // 获取粉丝排名
    const rank1000 = await common.fansRank(0, 1000)
    let userRank = rank1000.findIndex(item => item.userId === id)
    if(userRank === -1) {
      userRank = '1000+'
    }else {
      userRank += 1
    }
    
    // 获取获赞个数
    const { getAgreeCount } = await service.getAgreeCount(id)
    // 返回登录结果
    ctx.body = { id, username, nickname, avatarUrl: avatar_url, signature, followCount, fansCount, getAgreeCount, userRank, token }
  }
}

module.exports = new LoginMiddleware()