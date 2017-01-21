import MDB from '../libs/MDB.js'

const mongo_url = process.env.TEST_DB || 'mongodb://localhost:27017/test'

export const AuditFactory = {
  insert1: function(callback) {
    connect(function(err,db) {
      if (err) return callback(err)
      db.collection('audit').insert([{
        type: 'MyType',
        user: 'lance19',
        date: new Date(),
        ip: '123.456.789',
        hostname: 'company.com',
        userAgent: null
      }],function(err) {
        return callback(err,db)
      })
    })
  }
}


export function connect(callback) {
  new MDB({url: mongo_url},function(err,obj) {
    if (err) return callback(err)
    return callback(null,obj.db)
  })
}
