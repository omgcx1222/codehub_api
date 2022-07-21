const jwt = require("jsonwebtoken")

const { PUBLIC_KEY } = require("../../app/config")
const { createChatRecord, selectChatRecord } = require("./serviec")

// 存储所有在线用户的ctx
let list = []

// 鉴权
function verify(token) {
  let result = {}
  try {
    result = jwt.verify(token, PUBLIC_KEY, {
      algorithms: ["RS256"]
    })
  } catch (err) {
    const id = String.fromCharCode(Math.random() * 26 + "a".charCodeAt()) + "_" + Date.now()
    result = {
      id,
      nickname: "游客" + id
    }
  }
  return result
}

// 给所有人发送
function allSend(data) {
  for (let user of list) {
    user.ctx.websocket.send(JSON.stringify(data))
  }
}

// 指定给某人发送
function assignSend(ctx, data) {
  ctx.websocket.send(JSON.stringify(data))
}

class SocketMiddleware {
  async connectSocket(ctx, next) {
    let currentUser
    // 接收
    ctx.websocket.on("message", async (msg) => {
      const { type = "", data = {} } = JSON.parse(msg)
      const token = data?.token
      currentUser = verify(token)

      switch (type) {
        case "login":
          // 登录用户(游客没有token的exp)
          if (currentUser.exp) {
            const exist = list.find((item) => item.userInfo.id == currentUser.id)
            if (!exist) {
              list.push({ ctx, userInfo: currentUser })
              // const result = await selectChatRecord()
              // assignSend(ctx, list.length, result)
              allSend({ type: "online", data: { onLineCount: list.length, onLineUser: currentUser } })
            }
          }
          // 游客
          else {
            list.push({ ctx, userInfo: currentUser })
            allSend({ type: "online", data: { onLineCount: list.length, onLineUser: currentUser } })
          }
          break
        case "chatMessage":
          const { message = "" } = data
          // 登录用户
          if (currentUser.exp) {
            if (!message) {
              assignSend(ctx, { type: "messageNull" })
            } else {
              const result = await createChatRecord(currentUser.id, message)
              const result2 = await selectChatRecord(result.insertId)
              allSend({ type: "userMessage", data: { onLineCount: list.length, chatRecord: result2[0] } })
            }
          } else {
            // 未登录
            assignSend(ctx, { type: "notLogin" })
          }
        // case "dropLine":

        //   break
        default:
          break
      }
    })

    // 关闭
    ctx.websocket.on("close", async (state) => {
      if (!currentUser?.id) return
      const index = list.findIndex((item) => item.userInfo.id == currentUser.id)
      if (index >= 0) {
        list.splice(index, 1)
        allSend({ type: "dropLine", data: { onLineCount: list.length } })
      }
    })
  }
}

module.exports = new SocketMiddleware()
