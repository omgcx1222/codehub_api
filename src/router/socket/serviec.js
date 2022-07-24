const connection = require("../../app/database")

class SocketService {
  // 创建记录
  async createChatRecord(id, chatId, message) {
    const statement = "INSERT INTO chat_list (user_id, chat_id, message) VALUES (?, ?, ?)"
    try {
      const [result] = await connection.execute(statement, [id, chatId, message])
      return result
    } catch (error) {
      return error.message
    }
  }

  // 查询记录
  async selectChatRecord(id) {
    try {
      // 登录用户
      if (id) {
        const statement = `
          SELECT cu.chat_id id, c.name,
            JSON_ARRAYAGG(JSON_OBJECT('id', cl.id, 'message', cl.message, 'userId', u.id, 'nickname', u.nickname, 'avatarUrl', u.avatar_url)) chats
          FROM chats_users cu
          RIGHT JOIN chats_list cl ON cl.chat_id = cu.chat_id
          LEFT JOIN chats c ON c.id = cu.chat_id
          LEFT JOIN users u ON u.id = cu.user_id 
          WHERE cu.user_id = ?
          GROUP BY cu.chat_id
        `
        const [result] = await connection.execute(statement, [id])
        return result
      } else {
        const statement = `
          SELECT cl.chat_id id, c.name,
            JSON_ARRAYAGG(JSON_OBJECT('id', cl.id, 'message', cl.message, 'userId', u.id, 'nickname', u.nickname, 'avatarUrl', u.avatar_url)) chats
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
}

module.exports = new SocketService()
