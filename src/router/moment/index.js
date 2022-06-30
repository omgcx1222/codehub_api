const Router = require('koa-router')

const { verifyTokenVoid, verifyToken, verifyPermission } = require('../../common/common-middleware')
const { 
  createMoment, 
  momentDetail, 
  momentList, 
  updateMoment,
  removeMoment,
  getPicture,
  goAgree
} = require('./middleware')

const commentRouter = new Router({prefix: '/moment'})

commentRouter.post('/', verifyTokenVoid, createMoment) // 发表动态
commentRouter.get('/:momentId', verifyToken, momentDetail) // 动态详情
commentRouter.get('/', verifyToken, momentList) // 动态列表
commentRouter.patch('/:momentId', verifyTokenVoid, verifyPermission("moment"), updateMoment) // 修改动态
commentRouter.delete('/:momentId', verifyTokenVoid, verifyPermission("moment"), removeMoment) // 删除动态
commentRouter.get('/picture/:filename', getPicture)  // 读取图片
commentRouter.post('/:momentId/like', verifyTokenVoid, goAgree)  // 点赞

module.exports = commentRouter