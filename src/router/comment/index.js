const Router = require('koa-router')

const { verifyTokenVoid, verifyPermission, verifyMoment, verifyMomentAndComment } = require('../../common/common-middleware')
const { pubComment, replyComment, deleteComment, commentList, goAgree, commentDetailList } = require('./middleware')

const commentRouter = new Router({prefix: '/comment'})

commentRouter.post('/', verifyTokenVoid, verifyMoment, pubComment) // 对动态发表评论
commentRouter.post('/:commentId', verifyTokenVoid, verifyMomentAndComment, replyComment) // 对评论进行回复
commentRouter.delete('/:commentId', verifyTokenVoid, verifyPermission("comment"), deleteComment) // 删除评论
commentRouter.get('/', commentList) // 获取动态的评论列表
// commentRouter.get('/:commentId', commentDetailList) // 获取动态某个评论的回复列表
commentRouter.post('/:commentId/like', verifyTokenVoid, goAgree) // 点赞

module.exports = commentRouter