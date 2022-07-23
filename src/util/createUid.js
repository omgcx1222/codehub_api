const createUid = () => {
  let uid = ""
  for (const i in 8) {
    const id = String.fromCharCode(Math.random() * 26 + "a".charCodeAt())
    uid += id
  }
  uid += Date.now()
  return uid
}

module.exports = createUid
