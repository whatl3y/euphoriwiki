import * as assert from 'assert'
import Audit from '../libs/Audit.js'
import {connect,AuditFactory} from './factories.mongo.js'

describe('Audit', function() {
  describe('#log()', function() {
    it(`should insert record without error`, function(done) {
      connect(function(e,db) {
        if (e) return done(e)
        new Audit({db:db}).log({type:'Sample Audit'},done)
      })
    })
  })
})

describe('Audit', function() {
  describe('#find()', function() {
    it (`should return 1 audit record after inserting record from factory`, function(done) {
      AuditFactory.insert1(function(err,db) {
        if (err) return done(err)
        new Audit({db:db}).find({user:'lance19'},function(_err,records) {
          if (_err) return done(_err)
          done(assert.equal(1, records.length))
        })
      })
    })
  })
})
