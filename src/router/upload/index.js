const Router = require('koa-router')

const { verifyTokenVoid, verifyPermission } = require('../../common/common-middleware')
const { saveImg, handleAvatar, handlePictures, resizeFile } = require('./middleware')

const uploadRouter = new Router({prefix: '/upload'})

uploadRouter.post('/avatar', verifyTokenVoid, saveImg('avatar'), resizeFile, handleAvatar)  // 上传头像
uploadRouter.post('/:momentId/picture', verifyTokenVoid, verifyPermission("moment"), saveImg('picture'), resizeFile, handlePictures)  // 上传动态配图

module.exports = uploadRouter