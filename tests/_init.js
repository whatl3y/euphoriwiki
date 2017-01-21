import {connect} from './factories.mongo.js'

describe('dropDatabase', function() {
  it(`should drop the database without error to clean test db`, function(done) {
    connect(function(e,db) {
      if (e) return done(e)
      db.dropDatabase(done)
    })
  })
})
