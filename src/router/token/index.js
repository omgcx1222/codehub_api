const Router = require('koa-router')

const { verifyTokenVoid } = require('../../common/common-middleware')
const { refreshToken } = require('./middleware')

const tokenRouter = new Router({prefix: '/token'})
// 更新token
tokenRouter.post('/', verifyTokenVoid, refreshToken)

module.exports =  tokenRouter