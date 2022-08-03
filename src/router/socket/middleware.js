const jwt = require("jsonwebtoken")

const { PUBLIC_KEY } = require("../../app/config")
const { createChatRecord, selectChatRecord, createChatRoom, roomAddUser } = require("./serviec")
const createUid = require("../../util/createUid")

// 验证身份
function verify(userInfo) {
  if (!userInfo.token) {
    // 任意一个为空，说明用户上传的userInfo有问题，返回新的info
    if (!userInfo.id || !userInfo.nickname || !userInfo.type) {
      return {
        id: createUid(),
        nickname: "游客_" + Date.now(),
        type: "tourist",
        time: new Date()
      }
    }
    return userInfo
  }

  try {
    const result = jwt.verify(userInfo.token, PUBLIC_KEY, {
      algorithms: ["RS256"]
    })
    return {
      ...result,
      time: new Date()
    }
  } catch (err) {
    return {
      id: createUid(),
      nickname: "游客_" + Date.now(),
      type: "tourist",
      time: new Date()
    }
  }
}

// 给所有人发送
function allSend(data) {
  Object.keys(onLineUsers).forEach((user) => {
    // console.log(data)
    onLineUsers[user]?.ctx?.websocket?.send(JSON.stringify(data))
  })
}

/**
 * 指定给某人发送
 * @param {*} ctx 指定发送的那个人
 * @param {*} data
 */
function assignSend(ctx, data) {
  ctx?.websocket?.send(JSON.stringify(data))
}

// 获取用户信息
function getOnLineInfo() {
  // let c1 = 0 // 游客在线人数
  // let c2 = 0 // 登录用户在线个数
  let c1 = []
  let c2 = []
  Object.keys(onLineUsers).forEach((item) => {
    const u = onLineUsers[item]?.userInfo
    u?.type ? c1.push(u) : c2.push(u)
  })

  return {
    tourist: c1,
    onLineUsers: c2
  }
}

// 存储所有在线用户
// const onLineUsers = new Map()
const onLineUsers = {}

class SocketMiddleware {
  async connectSocket(ctx, next) {
    const uid = createUid()
    let currentUser = {}
    onLineUsers[uid] = { ctx, userInfo: currentUser }
    // 接收
    ctx.websocket.on("message", async (msg) => {
      const { type = "", data = {} } = JSON.parse(msg)
      /**
       * userInfo 必传（token）
       * message  发送信息时必传
       * chatId   群聊时必传
       * userId   私聊时必传
       */
      const { userInfo = {}, message = "", chatId, userId } = data

      currentUser = verify(userInfo)
      // 游客默认加入 id为1 的聊天群
      currentUser.chatRoomIds = onLineUsers[uid].userInfo?.chatRoomIds ?? [1]
      // 内存地址赋值
      onLineUsers[uid].userInfo = currentUser
      // console.log(currentUser === onLineUsers[uid].userInfo)

      switch (type) {
        case "login":
          let chatRooms = []
          // 登录用户
          if (!currentUser.type) {
            chatRooms = await selectChatRecord(currentUser.id)
            currentUser.chatRoomIds = chatRooms.map((item) => item.id)
            // onLineUsers保存着currentUser的地址，所以这一步可以注释掉
            // onLineUsers[uid].userInfo = currentUser
          } else {
            chatRooms = await selectChatRecord()
          }
          assignSend(ctx, { type: "chatRecord", data: { chatRooms } })
          allSend({ type: "onLine", data: { onLineUsers: getOnLineInfo(), onLineUser: currentUser } })
          break
        case "sendPublicChat":
          if (!currentUser.type) {
            // 内容和群聊id不能为空
            if (message && chatId) {
              const result = await createChatRecord(currentUser.id, chatId, message)
              // 给所有聊天室成员发送这条信息
              Object.keys(onLineUsers).forEach((uid) => {
                const u = onLineUsers[uid].userInfo.chatRoomIds?.find((id) => id == chatId)
                // console.log(onLineUsers[uid].userInfo, chatId)
                if (u) {
                  const { id, nickname, avatarUrl = null } = currentUser
                  assignSend(onLineUsers[uid].ctx, {
                    type: "sendChat",
                    data: {
                      chatMessage: { id: result.insertId, message, userId: id, nickname, avatarUrl: avatarUrl }
                    }
                  })
                }
              })
            }
          }
          break
        // 私聊
        case "sendPrivateChat":
          if (!currentUser.type) {
            // 内容和用户id不能为空
            if (message && userId) {
              // 创建聊天室
              const room = await createChatRoom("私聊")
              // 添加聊天室成员
              await roomAddUser(currentUser.id, room.insertId)
              await roomAddUser(userId, room.insertId)
              // 保存消息记录
              const result = await createChatRecord(currentUser.id, room.insertId, message)

              // 给私聊的对象（登录在线）发送消息
              Object.keys(onLineUsers).some((user) => {
                const u = onLineUsers[user].userInfo.chatRoomIds.find((id) => id == chatId)
                if (u) {
                  const { id, nickname, avatarUrl } = currentUser
                  assignSend(onLineUsers[user].ctx, {
                    type: "sendChat",
                    data: { chatMessage: { id: result.insertId, message, userId: id, nickname, avatarUrl } }
                  })
                }
              })
            }
          }
        default:
          break
      }
    })

    // 关闭
    ctx.websocket.on("close", async (state) => {
      delete onLineUsers[uid]
      allSend({ type: "offLine", data: { onLineUsers: getOnLineInfo() } })
    })
  }
}

module.exports = new SocketMiddleware()
