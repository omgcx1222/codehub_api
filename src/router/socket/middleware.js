const jwt = require("jsonwebtoken")

const { PUBLIC_KEY } = require("../../app/config")
const { createChatRecord, selectChatRecord } = require("./serviec")
const createUid = require("../../util/createUid")

// 验证身份
function verify(userInfo) {
  if (!userInfo.token) {
    // 任意一个为空，说明用户上传的userInfo有问题，返回新的info
    if (!userInfo.id || !userInfo.nickname || !userInfo.type) {
      return {
        id: createUid(),
        nickname: "游客_" + Date.now(),
        type: "tourist"
      }
    }
    return userInfo
  }

  try {
    const result = jwt.verify(userInfo.token, PUBLIC_KEY, {
      algorithms: ["RS256"]
    })
    return result
  } catch (err) {
    return {
      id: createUid(),
      nickname: "游客_" + Date.now(),
      type: "tourist"
    }
  }
}

// 给所有人发送
function allSend(data) {
  onLineUsers.forEach((user) => {
    user?.ctx?.websocket?.send(JSON.stringify(data))
  })
}

// 指定给某人发送
function assignSend(ctx, data) {
  ctx.websocket.send(JSON.stringify(data))
}

// 存储所有在线用户的ctx
const onLineUsers = new Map()

class SocketMiddleware {
  async connectSocket(ctx, next) {
    const uid = createUid()
    onLineUsers.set(uid)
    let currentUser = {}

    // 接收
    ctx.websocket.on("message", async (msg) => {
      const { type = "", data = {} } = JSON.parse(msg)
      const { userInfo = {} } = data
      currentUser = verify(userInfo)
      onLineUsers.set(uid, { ctx, userInfo: currentUser })

      switch (type) {
        case "login":
          allSend({ type: "online", data: { onLineCount: onLineUsers.size, onLineUser: currentUser } })
          break
        case "chatMessage":
          const { message = "" } = data
          // 登录用户
          if (!currentUser.type) {
            // 内容不能为空
            if (message) {
              const result = await createChatRecord(currentUser.id, message)
              const result2 = await selectChatRecord(result.insertId)
              allSend({ type: "userMessage", data: { onLineCount: onLineUsers.size, chatRecord: result2[0] } })
            }
          }
        default:
          break
      }
    })

    // 关闭
    ctx.websocket.on("close", async (state) => {
      onLineUsers.delete(uid)
      allSend({ type: "dropLine", data: { onLineCount: onLineUsers.size } })
    })
  }
}

module.exports = new SocketMiddleware()
