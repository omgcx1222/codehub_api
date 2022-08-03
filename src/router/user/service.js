const connection = require("../../app/database")
const { APP_URL, APP_PORT } = require("../../app/config")

class UserService {
  // 注册
  async create(user) {
    const { username, password, nickname } = user
    const statement = "INSERT INTO users (username, password, nickname) VALUES (?, ?, ?)"
    try {
      const [result] = await connection.execute(statement, [username, password, nickname])
      return result
    } catch (error) {
      ctx.body = error
    }
  }

  // 加入默认聊天室
  async joinChat(id) {
    const statement = "INSERT INTO chats_users (chat_id, user_id) VALUES (?, ?)"
    try {
      const [result] = await connection.execute(statement, [1, id])
      return result
    } catch (error) {
      ctx.body = error
    }
  }

  // 获取用户头像信息
  async avatar(id) {
    const statement = "SELECT * FROM avatar WHERE user_id = ?"
    const [result] = await connection.execute(statement, [id])
    return result
  }

  // 判断是否已经存在关注关系
  async fansExist(followId, id) {
    const statement = "SELECT * FROM users_fans WHERE user_id = ? AND fans_id = ?"
    try {
      const [result] = await connection.execute(statement, [followId, id])
      return result
    } catch (error) {
      ctx.body = error
    }
  }

  // 关注
  async follow(followId, id) {
    const statement = `INSERT INTO users_fans (user_id, fans_id) VALUES (?, ?);`
    const [result] = await connection.execute(statement, [followId, id])
    return result
  }

  // 取关
  async unfollow(followId, id) {
    const statement = `DELETE FROM users_fans WHERE user_id = ? AND fans_id = ?;`
    const [result] = await connection.execute(statement, [followId, id])
    return result
  }

  // 获取关注个数
  async followCount(id) {
    const statement = "SELECT COUNT(*) followCount FROM users_fans WHERE fans_id = ?"
    const [result] = await connection.execute(statement, [id])

    return result[0]
  }

  // 获取粉丝个数
  async fansCount(id) {
    const statement = "SELECT COUNT(*) fansCount FROM users_fans WHERE user_id = ?"
    const [result] = await connection.execute(statement, [id])

    return result[0]
  }

  // 获取点赞个数
  async getAgreeCount(id) {
    const statement =
      "SELECT count(m.user_id) getAgreeCount FROM moment_agree mg LEFT JOIN moment m ON m.id = mg.moment_id WHERE m.user_id = ?"
    const [result] = await connection.execute(statement, [id])

    return result[0]
  }
}

module.exports = new UserService()
