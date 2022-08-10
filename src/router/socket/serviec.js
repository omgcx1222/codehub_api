const connection = require("../../app/database")

class SocketService {
  // 创建记录
  async createChatRecord(id, chatId, message) {
    const statement = "INSERT INTO chats_list (user_id, chat_id, message) VALUES (?, ?, ?)"
    try {
      const [result] = await connection.execute(statement, [id, chatId, message])
      return result
    } catch (error) {
      return error.message
    }
  }

  // 查询用户所在的全部聊天室
  async selectRoomIds(id) {
    const statement =
      "SELECT cu.chat_id id, c.name FROM chats_users cu LEFT JOIN chats c ON c.id = cu.chat_id WHERE user_id = ?"
    try {
      const [result] = await connection.execute(statement, [id])
      return result
    } catch (error) {
      return error.message
    }
  }

  // 根据聊天室id查询聊天记录
  async selectRoomChat(id, offset = 0, limit = 1) {
    offset = String(offset)
    limit = String(limit)
    const statement = `
      SELECT cl.id, cl.message, cl.createTime, 
        JSON_OBJECT('userId', u.id, 'nickname', u.nickname, 'avatarUrl', u.avatar_url) author
      FROM chats_list cl
      LEFT JOIN users u ON u.id = cl.user_id
      WHERE chat_id = ?
      ORDER BY cl.createTime ${limit == 1 ? "DESC" : ""}
      LIMIT ?, ?
    `
    try {
      const [result] = await connection.execute(statement, [id, offset, limit])
      return result
    } catch (error) {
      console.log(error.message)
      return error.message
    }
  }

  // 查询聊天记录
  async selectChatRecord(id) {
    try {
      // 登录用户
      if (id) {
        const statement = `
          SELECT cl.chat_id id, c.name,
            JSON_ARRAYAGG(
              JSON_OBJECT('id', cl.id, 'message', cl.message, 'userId', u.id, 'nickname', u.nickname, 'avatarUrl', u.avatar_url, 'createTime', cl.createTime)
            ) chats
          FROM chats_list cl
          LEFT JOIN chats c ON c.id = cl.chat_id
          LEFT JOIN users u ON u.id = cl.user_id
          LEFT JOIN chats_users cu on cu.chat_id = cl.chat_id
          WHERE cu.user_id = ?
          GROUP BY cl.chat_id
        `
        const [result] = await connection.execute(statement, [id])
        return result
      } else {
        const statement = `
          SELECT cl.chat_id id, c.name,
            JSON_ARRAYAGG(
              JSON_OBJECT('id', cl.id, 'message', cl.message, 'userId', u.id, 'nickname', u.nickname, 'avatarUrl', u.avatar_url, 'createTime', cl.createTime)
            ) chats
          FROM chats_list cl
          LEFT JOIN chats c ON c.id = cl.chat_id
          LEFT JOIN users u ON u.id = cl.user_id
          WHERE c.name = '正能量聊天群'
          GROUP BY cl.chat_id
        `
        const [result] = await connection.execute(statement)
        return result
      }
    } catch (error) {
      return error.message
    }
  }

  // 创建聊天室
  async createChatRoom(name) {
    const statement = "INSERT INTO chats (name) VALUES (?)"
    try {
      const [result] = await connection.execute(statement, [name])
      return result
    } catch (error) {
      return error.message
    }
  }

  // 添加聊天室成员
  async roomAddUser(userId, roomId) {
    const statement = "INSERT INTO chats_users (user_id, chat_id) VALUES (?, ?)"
    try {
      const [result] = await connection.execute(statement, [userId, roomId])
      return result
    } catch (error) {
      return error.message
    }
  }

  // 查询私聊的（对方）头像
  async selectRoomImg(roomId, userId) {
    const statement =
      "SELECT nickname, avatar_url avatarUrl FROM chats_users RIGHT JOIN users ON users.id = user_id WHERE chat_id = ? AND user_id != ?"
    try {
      const [result] = await connection.execute(statement, [roomId, userId])
      return result
    } catch (error) {
      return error.message
    }
  }
}

module.exports = new SocketService()
