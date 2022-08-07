const connection = require("../../app/database")

// 给有二级回复的评论添加3个点赞最多的回复或前3个回复
async function addReply(comments) {
  let newC = comments
  if (newC.length) {
    for (const i in newC) {
      newC[i].replyChild = []
      if (newC[i].childCount) {
        const statement = `
          SELECT c.id, c.content, c.createTime, c.moment_id momentId, c.comment_id commentId,
            JSON_OBJECT('id', u.id, 'nickname', u.nickname, 'avatarUrl', u.avatar_url) author,
            (SELECT c2.user_id FROM comment c2 WHERE c2.id = c.reply_id) replyUserId,
            (SELECT COUNT(*) FROM comment_agree cg WHERE cg.comment_id = c.id) agree
          FROM comment c LEFT JOIN users u ON c.user_id = u.id
          WHERE c.comment_id = ?
          ORDER BY agree DESC, c.createTime DESC
          LIMIT 0, 3
        `
        const [reply] = await connection.execute(statement, [newC[i].id])
        newC[i].replyChild = await addReplyAuthor(reply)
      }
    }
  }
  return newC
}

// 给三级回复添加回复的作者信息
async function addReplyAuthor(replyList) {
  let newR = replyList
  if (newR.length) {
    for (const i in newR) {
      newR[i].replyAuthor = null
      if (newR[i].replyUserId) {
        const statement = "SELECT users.id, users.nickname, users.avatar_url avatarUrl FROM users WHERE users.id = ?"
        const [author] = await connection.execute(statement, [newR[i].replyUserId])
        newR[i].replyAuthor = author[0]
      }
    }
  }
  return newR
}

class CommentService {
  // 发表评论
  async pub(id, content, momentId, commentId, replyId) {
    const statement1 = "INSERT INTO comment (user_id, content, moment_id) VALUES (?, ?, ?)"
    const statement2 = "INSERT INTO comment (user_id, content, moment_id, comment_id) VALUES (?, ?, ?, ?)"
    const statement3 = "INSERT INTO comment (user_id, content, moment_id, comment_id, reply_id) VALUES (?, ?, ?, ?, ?)"

    if (replyId) {
      // 建表时建立了外键约束 replyId存在时，momentId和commentId必须存在，否则会抛出异常
      try {
        // 回复评论的回复
        const [res] = await connection.execute(statement3, [id, content, momentId, commentId, replyId])
        return res.insertId
      } catch (error) {
        return error.message
      }
    } else if (commentId) {
      // 建表时建立了外键约束 commentId存在时，momentId必须存在，否则会抛出异常
      try {
        // 回复评论
        const [res] = await connection.execute(statement2, [id, content, momentId, commentId])
        return res.insertId
      } catch (error) {
        return error.message
      }
    } else {
      try {
        // 评论动态
        const [res] = await connection.execute(statement1, [id, content, momentId])
        return res.insertId
      } catch (error) {
        return error.message
      }
    }
  }

  // 回复评论
  async reply(uId, content, mId, cId) {
    const statement = "INSERT INTO comment (user_id, content, moment_id, comment_id) VALUES (?, ?, ?, ?)"
    const result = await connection.execute(statement, [uId, content, mId, cId])

    return result[0]
  }

  // 删除回复
  async remove(id) {
    const statement = "DELETE FROM comment WHERE id = ?"
    try {
      await connection.execute(statement, [id])
      return "删除成功"
    } catch (error) {
      return "删除失败" + error.message
    }
  }

  // 根据动态获取该动态的评论列表
  // async listInMoment(userId, momentId, order, offset, limit) {
  //   const statement = `
  //     SELECT c.id, c.content, c.createTime, c.moment_id momentId, c.comment_id commentId,
  //       JSON_OBJECT('id', u.id, 'nickname', u.nickname, 'avatarUrl', u.avatar_url) user,
  //       (SELECT COUNT(*) FROM comment_agree cg WHERE cg.comment_id = c.id) agree,
  //       (SELECT COUNT(*) FROM comment_agree cg WHERE cg.comment_id = c.id AND cg.user_id = ?) isAgree,
  //       (SELECT COUNT(*) FROM comment c2 WHERE c2.comment_id = c.id) child_count
  //     FROM comment c LEFT JOIN users u ON c.user_id = u.id
  //     WHERE c.moment_id = ? AND c.comment_id IS NULL
  //     ORDER BY ${order} DESC
  //     LIMIT ?, ?
  //   `
  //   try {
  //     const [result] = await connection.execute(statement, [userId, momentId, offset, limit])
  //     return result
  //   } catch (error) {
  //     return error.message
  //   }
  // }

  // 获取动态的评论跟评论的热门回复
  async commentList(userId, momentId, order, offset, limit, oneId) {
    const statement = `
      SELECT c.id, c.content, c.createTime, c.moment_id momentId, c.comment_id commentId,
        JSON_OBJECT('id', u.id, 'nickname', u.nickname, 'avatarUrl', u.avatar_url) author,
        (SELECT COUNT(*) FROM comment_agree cg WHERE cg.comment_id = c.id) agree,
        ${
          userId ? "(SELECT COUNT(*) FROM comment_agree cg WHERE cg.comment_id = c.id AND cg.user_id = ?) isAgree," : ""
        }
        (SELECT COUNT(*) FROM comment c2 WHERE c2.comment_id = c.id) childCount,
        (SELECT COUNT(*) FROM users_fans WHERE user_id = u.id) authorFans
      FROM comment c LEFT JOIN users u ON c.user_id = u.id
      WHERE c.moment_id = ? ${oneId ? "AND c.id = ?" : "AND c.comment_id IS NULL"}
      ORDER BY ${order == 0 ? "c.createTime" : "agree"} DESC
      LIMIT ?, ?
    `
    try {
      if (userId) {
        // oneId 用于 用户发表评论(必有userId) 后获取该评论信息
        if (oneId) {
          const [comments] = await connection.execute(statement, [userId, momentId, oneId, offset, limit])
          return addReply(comments)
        }
        const [comments] = await connection.execute(statement, [userId, momentId, offset, limit])
        return addReply(comments)
      } else {
        const [comments] = await connection.execute(statement, [momentId, offset, limit])
        return addReply(comments)
      }
    } catch (error) {
      return error.message
    }
  }

  // 获取动态某个评论的回复列表
  async commentAllReply(userId, commentId, offset, limit, oneId) {
    const statement = `
      SELECT c.id, c.content, c.createTime, c.moment_id momentId, c.comment_id commentId,
        JSON_OBJECT('id', u.id, 'nickname', u.nickname, 'avatarUrl', u.avatar_url) author,
        (SELECT c2.user_id FROM comment c2 WHERE c2.id = c.reply_id) replyUserId,
        ${
          userId ? "(SELECT COUNT(*) FROM comment_agree cg WHERE cg.comment_id = c.id AND cg.user_id = ?) isAgree," : ""
        }
        (SELECT COUNT(*) FROM comment_agree cg WHERE cg.comment_id = c.id) agree
      FROM comment c LEFT JOIN users u ON c.user_id = u.id
      WHERE c.comment_id = ? ${oneId ? "AND c.id = ?" : ""}
      ORDER BY c.createTime DESC
      LIMIT ?, ?
    `
    try {
      if (userId) {
        // oneId 用于 用户发表回复(必有userId)后 查询该评论信息
        if (oneId) {
          const [result] = await connection.execute(statement, [userId, commentId, oneId, offset, limit])
          return addReplyAuthor(result)
        }

        const [result] = await connection.execute(statement, [userId, commentId, offset, limit])
        return addReplyAuthor(result)
      } else {
        const [result] = await connection.execute(statement, [commentId, offset, limit])
        return addReplyAuthor(result)
      }
    } catch (error) {
      return error.message
    }
  }

  // 根据用户id获取评论列表
  // async listInUser(userId, offset, limit) {
  //   // SELECT c.id, c.content, c.createTime, c.moment_id momentId, c.comment_id commentId
  //   //   FROM comment c
  //   //   WHERE c.user_id = ?
  //   //   ORDER BY c.createTime DESC
  //   //   LIMIT ?, ?
  //   const statement = `
  //     SELECT c.id, c.content, c.createTime, c.moment_id momentId, c.comment_id commentId,
  //       JSON_OBJECT('id', u.id, 'nickname', u.nickname, 'avatarUrl', u.avatar_url) user,
  //       (SELECT COUNT(*) FROM comment_agree cg WHERE cg.comment_id = c.id) agree,
  //       (SELECT COUNT(*) FROM comment_agree cg WHERE cg.comment_id = c.id AND cg.user_id = ?) isAgree,
  //       (SELECT COUNT(*) FROM comment c2 WHERE c2.comment_id = c.id) child_count
  //     FROM comment c LEFT JOIN users u ON c.user_id = u.id
  //     WHERE c.user_id = ?
  //     ORDER BY c.createTime DESC
  //     LIMIT ?, ?
  //   `
  //   try {
  //     const [res] = await connection.execute(statement, [userId, userId, offset, limit])
  //     return res
  //   } catch (error) {
  //     return error.message
  //   }
  // }
}

module.exports = new CommentService()
