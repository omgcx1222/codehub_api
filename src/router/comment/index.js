const Router = require('koa-router')

const { verifyTokenVoid, verifyPermission, verifyMoment, verifyToken } = require('../../common/common-middleware')
const { pubComment, deleteComment, goAgree, getCommentList } = require('./middleware')

const commentRouter = new Router({prefix: '/comment'})

commentRouter.get('/', verifyToken, getCommentList) // 获取动态的评论或评论的回复列表
commentRouter.post('/', verifyTokenVoid, verifyMoment, pubComment, getCommentList) // 发表评论或者回复
// commentRouter.post('/replyComment', verifyTokenVoid, verifyMomentAndComment, replyComment) // 对评论进行回复
commentRouter.delete('/:commentId', verifyTokenVoid, verifyPermission("comment"), deleteComment) // 删除评论
commentRouter.post('/:commentId/like', verifyTokenVoid, goAgree) // 点赞

module.exports = commentRouter