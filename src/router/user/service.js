const connection = require('../../app/database')
const { APP_URL, APP_PORT } = require('../../app/config')

class UserService {
  // 注册
  async create(user) {
    const { username, password, nickname } = user
    const statement = 'INSERT INTO users (username, password, nickname) VALUES (?, ?, ?)'
    try {
      const [result] = await connection.execute(statement, [username, password, nickname])
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
  async fansExist(userId, fansId) {
    const statement = "SELECT * FROM users_fans WHERE user_id = ? AND fans_id = ?"
    try {
      const [result] = await connection.execute(statement, [userId, fansId])
      return result
    } catch (error) {
      ctx.body = error
    }
  }

  async follow(userId, fansId) {
    const statement = `INSERT INTO users_fans (user_id, fans_id) VALUES (?, ?);`
    const [result] = await connection.execute(statement, [userId, fansId])
    return result
  }

  async unfollow(userId, fansId) {
    const statement = `DELETE FROM users_fans WHERE user_id = ? AND fans_id = ?;`
    const [result] = await connection.execute(statement, [userId, fansId])
    return result
  }

}

module.exports = new UserService()