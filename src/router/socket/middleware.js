const jwt = require("jsonwebtoken")

const { PUBLIC_KEY } = require("../../app/config")
const {
  createChatRecord,
  createChatRoom,
  roomAddUser,
  selectRoomImg,
  selectRoomIds,
  selectRoomChat,
  changeOffLineTime,
  selectRoomTips,
  selectRoomCount,
  selectRoomExist
} = require("./serviec")
const createUid = require("../../util/createUid")

// 验证身份
async function verify(userInfo) {
  if (!userInfo?.token) {
    // 任意一个为空，说明用户上传的userInfo有问题，返回新的info
    if (!userInfo?.id || !userInfo?.nickname || !userInfo?.type) {
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
    onLine: c2
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
       * roomId   发送群聊消息时必传/获取聊天记录必传
       * userId   发送私聊消息时必传
       * isPrivate  第一次私聊时必传
       */
      const { userInfo = {}, message = "", roomId, userId, isPrivate } = data
      currentUser = await verify(userInfo)
      // 游客默认加入 id为1 的聊天群
      currentUser.chatRoomIds = onLineUsers[uid].userInfo?.chatRoomIds ?? [{ id: 1, name: "正能量聊天群" }]
      // 内存地址赋值
      onLineUsers[uid].userInfo = currentUser
      // console.log(currentUser === onLineUsers[uid].userInfo)

      switch (type) {
        case "login":
          // 所有聊天室的聊天记录
          let chatRooms = []
          // 登录用户
          if (!currentUser.type) {
            // 查询用户所在聊天室(并保存，用于发送消息和获取消息时，验证是否属于群聊成员)
            currentUser.chatRoomIds = await selectRoomIds(currentUser.id)
          }

          // 根据聊天室id获取聊天室消息
          for (const item of currentUser.chatRoomIds) {
            const list = await selectRoomChat(item.id, 0, 1000)
            // 查询聊天室人数
            let count = await selectRoomCount(item.id)
            // 消息通知
            let tips = 0
            if (!currentUser.type) {
              const res = await selectRoomTips(item.id, currentUser.id)
              tips = res[0].tips
            }

            if (item.name === "私聊") {
              count = 0
              const r = await selectRoomImg(item.id, currentUser.id)
              // console.log(r)
              item.name = r[0].nickname
              item.img = r[0].avatarUrl
              item.type = "私聊"
            }
            const roomInfo = { ...item, chats: list, tips, count }
            chatRooms.push(roomInfo)
          }
          assignSend(ctx, { type: "chatRooms", data: chatRooms })
          allSend({ type: "onLine", data: { onLineUsers: getOnLineInfo(), onLineUser: currentUser } })
          break
        // 获取聊天记录
        // case "getChatList":
        //   const room = currentUser.chatRoomIds.find((item) => item.id === roomId)
        //   if (room) {
        //     // 直接获取1000条吧，懒得再做分页了
        //     const chats = await selectRoomChat(roomId, currentUser.id, 0, 1000)
        //     let count = await selectRoomCount(roomId)
        //     if (room.type === "私聊") {
        //       count = 0
        //     }
        //     assignSend(ctx, { type: "getChatList", data: { ...room, chats, count } })
        //   }
        //   break
        // 发送群聊消息
        case "sendchatMessage":
          if (!currentUser.type) {
            // 内容和群聊id不能为空
            if (message && roomId) {
              // 保存消息到服务器
              const result = await createChatRecord(currentUser.id, roomId, message)
              // 给所有聊天室成员发送这条信息
              Object.keys(onLineUsers).forEach((uid) => {
                const u = onLineUsers[uid].userInfo.chatRoomIds?.find((item) => item.id == roomId)
                // console.log(onLineUsers[uid].userInfo, roomId)
                if (u) {
                  const { id, nickname, avatar_url = null } = currentUser
                  const chats = {
                    id: result.insertId,
                    message,
                    isRead: 0,
                    author: {
                      userId: id,
                      nickname,
                      avatarUrl: avatar_url
                    },
                    createTime: new Date()
                  }
                  assignSend(onLineUsers[uid].ctx, {
                    type: "publicChat",
                    data: { chats, id: roomId }
                  })
                }
              })
            }
          }
          break
        // 发送私聊消息
        case "createRoom":
          if (!currentUser.type) {
            // 内容和用户id不能为空
            if (userId) {
              // 判断两人是否存在私聊
              const roomExist = await selectRoomExist(currentUser.id, userId, "私聊")
              if (roomExist) {
                assignSend(ctx, {
                  type: "createRoom",
                  data: { roomId: roomExist }
                })
                return
              }
              // 创建聊天室
              const room = await createChatRoom("私聊")
              // 添加聊天室成员
              await roomAddUser(currentUser.id, room.insertId)
              await roomAddUser(userId, room.insertId)

              // 被私聊的用户如果在线，则变更chatRoomIds
              Object.keys(onLineUsers).forEach((uid) => {
                if (onLineUsers[uid].userInfo.id === userId) {
                  onLineUsers[uid].userInfo.chatRoomIds.push({ id: room.insertId, name: "私聊" })
                  return
                }
              })
              currentUser.chatRoomIds.push({ id: room.insertId, name: "私聊" })
              assignSend(ctx, {
                type: "createRoom",
                data: { roomId: room.insertId }
              })
              // 给私聊的对象（登录在线）发送消息
              // Object.keys(onLineUsers).some((user) => {
              //   const u = onLineUsers[user].userInfo.chatRoomIds.find((item) => item.id == roomId)
              //   if (u) {
              //     const { id, nickname, avatar_url } = currentUser
              //     assignSend(onLineUsers[user].ctx, {
              //       type: "privateChat",
              //       // data: { id: result.insertId, message, userId: id, nickname, avatarUrl }
              //       data: {
              //         id: room.insertId,
              //         name: "私聊",
              //         chats: [
              //           {
              //             id: result.insertId,
              //             message,
              //             userId: id,
              //             nickname,
              //             avatarUrl: avatar_url,
              //             createTime: new Date()
              //           }
              //         ]
              //       }
              //     })
              //   }
              // })
            }
          }
          break
        default:
          break
      }
    })

    // 关闭
    ctx.websocket.on("close", (state) => {
      if (!currentUser.type) {
        // 记录登录用户的下线时间（不用同步）
        // changeOffLineTime(currentUser.id)
      }
      delete onLineUsers[uid]
      allSend({ type: "offLine", data: { onLineUsers: getOnLineInfo() } })
    })
  }
}

module.exports = new SocketMiddleware()
