const connection = require('../../app/database')

class MomentService {
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
    const statement = "SELECT count(m.user_id) getAgreeCount FROM moment_agree mg LEFT JOIN moment m ON m.id = mg.moment_id WHERE m.user_id = ?"
    const [result] = await connection.execute(statement, [id])
    
    return result[0]
  }

}

module.exports = new MomentService()