import util from 'util'
import url from 'url'
import zlib from 'zlib'
import async_waterfall from 'async/waterfall'
import async_each from 'async/each'
import async_eachOf from 'async/eachOf'
import async_map from 'async/map'
import redis from 'redis'
import config from '../config'

// 2018-01-30: Because node-resque now uses promises/async await natively,
// we need to use a client that contains all Redis methods that supports
// promises out of the box.
// TODO update all methods below to no longer need npm module `redis`
import ioredis from 'ioredis'

const NOOP = () => {}

export default class RedisHelper {
  constructor(urlOrClient, compressData=false, options={}) {
    try {
      this._compress = compressData
      this._options = options

      const [ normalClient, ioClient ] = this.createClients(urlOrClient)
      this.client = normalClient
      this.ioclient = ioClient

    } catch(e) {
      this.client = null
      this.ioclient = null
    }
  }

  //http://redis.io/commands/INFO
  //memory information about redis instance
  info(param,cb=NOOP) {
    this.client.info(param,cb)
  }

  dbsize(cb=NOOP) {
    this.client.dbsize(cb)
  }

  size(cb=NOOP) {
    this.dbsize(cb)
  }

  number_of_keys(cb=NOOP) {
    this.dbsize(cb)
  }

  type(key,cb=NOOP) {
    this.client.type(key,cb)
  }

  scan(cursor, options=null) {
    return new Promise((resolve, reject) => {
      const callback = (err, result) => {
        if (err) return reject(err)
        resolve(result)
      }

      if (options instanceof Array) {
        return this.client.scan(cursor, ...options, callback)
      }
      this.client.scan(cursor, callback)
    })
  }

  async scanMatch(match, iterationCallback=NOOP, cursor=0, numMatches=0) {
    const [ newCursor, matches ] = await this.scan(cursor, [ 'match', match ])
    if (matches && matches.length > 0) {
      numMatches += matches.length
      await Promise.all(matches.map(async match => await iterationCallback(match)))
    }

    if (newCursor == '0')
      return numMatches

    return await this.scanMatch(match, iterationCallback, newCursor, numMatches)
  }

  expire(key, timeoutSeconds, callback=NOOP) {
    return new Promise((resolve, reject) => {
      this.client.expire(key, timeoutSeconds, this.promiseCallback(resolve, reject, callback))
    })
  }

  // Gets the keys that match a pattern
  // http://redis.io/commands/KEYS
  // wildcard is *
  keys(pattern, callback=NOOP) {
    return new Promise((resolve, reject) => {
      this.client.keys(pattern, (err, results) => {
        if (err) {
          callback(err)
          return reject(err)
        }
        callback(null, results)
        resolve(results)
      })
    })
  }

  // This method is safe for production, where this.keys is imperformant
  // wildcard is *
  async getKeysLike(pattern) {
    let allKeys = []
    await this.scanMatch(pattern, async match => allKeys.push(match))
    return allKeys
  }

  delete_keys_like(pattern, cb=NOOP) {
    return new Promise((resolve, reject) => {
      this.keys(pattern, (err, keysAry) => {
        if (err) {
          reject(err)
          return cb(err)
        }
        async_each(keysAry, (key, _callback) => this.del(key, _callback),
          err => {
            if (err)
              reject(err)
            else
              resolve()
            cb(err)
          }
        )
      })
    })
  }

  getAndDelete(key, callback=NOOP) {
    this.client
    .multi()
    .get(key)
    .del(key)
    .exec((err,results) => {
      if (err) return callback(err)
      this.parseData(results[0], false, callback)
    })
  }

  get(key, ...args) {
    return new Promise((resolve, reject) => {
      let options = null
      let callback = NOOP
      switch (args.length) {
        case 2:
          options = args[0]
          callback = args[1]
          break
        case 1:
          if (typeof args[0] === 'function')
            callback = args[0]
          else
            options = args[0]
      }

      async_waterfall([
        _callback => this.client.get(key, _callback),
        (compressedValue, _callback) => this.parseData(compressedValue, false, _callback)
      ], this.promiseCallback(resolve, reject, callback))
    })
  }

  set(key, value, ...args) {
    return new Promise((resolve, reject) => {
      let options = this._options
      let callback = NOOP
      switch (args.length) {
        case 2:
          options = (this._options) ? Object.assign(this._options, args[0]) : args[0]
          callback = args[1]
          break
        case 1:
          if (typeof args[0] === 'function')
            callback = args[0]
          else
            options = args[0]
      }

      async_waterfall([
        _callback => this.parseData(value, true, _callback),
        (compressedValue, _callback) => {
          if (options && options.ttl) {
            this.client.setex(key, options.ttl, compressedValue, _callback)
          } else {
            this.client.set(key, compressedValue, _callback)
          }
        }
      ], this.promiseCallback(resolve, reject, callback))
    })
  }

  setnx(key, value, callback=NOOP) {
    return new Promise((resolve, reject) => {
      async_waterfall([
        _callback => this.parseData(value, true, _callback),
        (compressedValue, _callback) => this.client.setnx(key, compressedValue, _callback)
      ], this.promiseCallback(resolve, reject, callback))
    })
  }

  setnxex(key, value, timeoutSeconds, callback=NOOP) {
    return new Promise((resolve, reject) => {
      async_waterfall([
        _callback => this.parseData(value, true, _callback),
        (compressedValue, _callback) => this.client.set(key, compressedValue, 'NX', 'EX', timeoutSeconds, _callback)
      ], this.promiseCallback(resolve, reject, callback))
    })
  }

  ttl(key, callback=NOOP) {
    return new Promise((resolve, reject) => {
      this.client.ttl(key, this.promiseCallback(resolve, reject, callback))
    })
  }

  del(key, callback=NOOP) {
    return new Promise((resolve, reject) => {
      this.client.del(key, this.promiseCallback(resolve, reject, callback))
    })
  }

  list(key, callback) {
    return this.lrange(key, callback)
  }

  async llen(key) {
    return await new Promise((resolve, reject) => {
      this.client.llen(key, (err, result) => {
        if (err)
          return reject(err)

        resolve(result)
      })
    })
  }

  async lrange(...args) {
    return new Promise((resolve, reject) => {
      const key = args[0]
      let startPosition = 0
      let endPosition = -1
      switch (args.length) {
        case 3:
          startPosition = args[1]
          endPosition = args[2]
          break
        case 2:
          startPosition = args[1]
          break
      }

      this.client.lrange(key, startPosition, endPosition, async (err, values) => {
        try {
          if (err) return reject(err)
          const returnValues = await Promise.all(
            values.map(async val => await this.parseData(val, false))
          )
          resolve(returnValues)

        } catch (e) {
          reject(e)
        }
      })
    })
  }

  async lrangeBatch(key, iterationCallback, batchSize=1000) {
    let iteration = 0
    let count = 0
    let data = await this.lrange(key, 0, batchSize - 1)
    while (data.length > 0) {
      await iterationCallback(data)

      count += data.length
      iteration++
      const newStarting = iteration * batchSize
      const newEnding = newStarting + batchSize - 1
      data = await this.lrange(key, newStarting, newEnding)
    }
    return count
  }

  async lpush(key, value, callback=()=>{}) {
    return await this.push('lpush', key, value, callback)
  }

  async rpush(key, value, callback=()=>{}) {
    return await this.push('rpush', key, value, callback)
  }

  push(method, key, value, callback=()=>{}) {
    return new Promise(async (resolve, reject) => {
      const compressedValue = await this.parseData(value)
      this.client[method](key, compressedValue, this.promiseCallback(resolve, reject, callback))
    })
  }

  rpop(key,callback) {
    this.pop('rpop',key,callback)
  }

  lpop(key,callback) {
    this.pop('lpop',key,callback)
  }

  pop(method,key,callback) {
    const self = this
    async_waterfall([
      function(_callback) {
        self.client[method](key,_callback)
      },
      function(compressedValue,_callback) {
        self.parseData(compressedValue, false, _callback)
      }
    ],callback)
  }

  lpopmultiple(key,count,callback) {
    const self = this
    this.client
    .multi()
    .lrange(key,0,count-1)
    .ltrim(key,count,-1)
    .exec(function(err,results) {
      if (err) return callback(err)
      const items = results[0]
      async_map(items,function(val,_callback) {
        self.parseData(val, false, _callback)
      },callback)
    })
  }

  ltrim(key, start, stop, callback) {
    return this.client.ltrim(key, start, stop, callback)
  }

  rtrim(key, start, stop, callback) {
    return this.client.rtrim(key, start, stop, callback)
  }

  hgetall(key, cb=NOOP) {
    this.client.hgetall(key, cb)
  }

  hashgetall(key, cb=NOOP) {
    this.hgetall(key, cb)
  }

  hset(...args) {
    const key = args[0]
    let obj = null
    let field
    let value
    let callback

    switch (args.length) {
      case 4:
        field = args[1]
        value = args[2]
        callback = args[3]
        break
      case 3:
        obj = args[1]
        callback = args[2]
        break
    }

    if (obj) {
      return async_eachOf(obj, (_value, _field, _callback) => {
        this.client.hset(key, _field, _value, _callback)
      },callback)
    } else {
      return this.client.hset(key, field, value, callback)
    }
  }

  setgetall(key, cb=NOOP) {
    this.client.smembers(key,cb)
  }

  async zall(key, cb=NOOP) {
    try {
      const oData = await this.zsetgetall(key)
      cb(null, oData)
      return oData
    } catch(err) {
      cb(err)
    }
  }

  zadd(key, value, score=new Date().valueOf(), callback=NOOP) {
    this.client.zadd(key, score, value, callback)
  }

  zsetadd(key, value, score=new Date().valueOf(), callback=NOOP) {
    return new Promise((resolve, reject) => {
      this.zadd(key, value, score, this.promiseCallback(resolve, reject, callback))
    })
  }

  async zsetoverridebyscore(key, score, value) {
    const exists = !!(await this.zrangebyscore(key, score))
    if (exists)
      await this.zrembyscore(key, score)

    return await this.zsetadd(key, value, score)
  }

  zsetgetall(key, cb=NOOP) {
    return new Promise((resolve, reject) => {
      this.client.zrange(key, 0, -1, 'WITHSCORES', (_err, values) => {
        if (_err) {
          cb(_err)
          return reject(_err)
        }

        let oSetValues = {}
        for (let _i = 0; _i < values.length; _i = _i + 2) {
          oSetValues[values[_i+1]] = values[_i]
        }

        cb(null, oSetValues)
        resolve(oSetValues)
      })
    })
  }

  async zrangebyscore(...args) {
    return await this.zsetgetbyscore(...args)
  }

  zsetgetbyscore(...args) {
    return new Promise((resolve, reject) => {
      let key
      let min = -Infinity
      let max = Infinity
      let callback = NOOP
      switch (args.length) {
        case 4:
          key = args[0]
          min = args[1]
          max = args[2]
          callback = args[3]
          break
        case 3:
          key = args[0]
          min = args[1]
          max = args[2]
          break
        case 2:
          key = args[0]
          min = args[1]
          max = args[1]
          break
      }

      this.client.zrangebyscore(key, min, max, 'WITHSCORES', function(_err,values) {
        if (_err) {
          callback(_err)
          return reject(_err)
        }

        let oSetValues = {}
        for (let _i = 0; _i < values.length; _i = _i + 2) {
          oSetValues[values[_i+1]] = values[_i]
        }

        callback(null, oSetValues)
        resolve(oSetValues)
      })
    })
  }

  zrembyscore(...args) {
    return new Promise((resolve, reject) => {
      let key
      let min = -Infinity
      let max = Infinity
      let callback = NOOP
      switch (args.length) {
        case 4:
          key = args[0]
          min = args[1]
          max = args[2]
          callback = args[3]
          break
        case 3:
          key = args[0]
          min = args[1]
          max = args[2]
          break
        case 2:
          key = args[0]
          min = args[1]
          max = args[1]
          break
      }

      this.client.zremrangebyscore(key, min, max, this.promiseCallback(resolve, reject, callback))
    })
  }

  end() {
    this.client.end(false)
  }

  close() {
    this.end()
  }

  quit() {
    this.end()
  }

  // Handles any gzip/deflating/inflating we might be doing to data
  // we're passing to and from Redis.
  // NOTE: if inflating, we will always return a raw Buffer. If deflating,
  // we return a base64 encoded string.
  async parseData(...args) {
    const value = args[0]
    let isRawData = true
    let callback = () => {}
    try {
      switch (args.length) {
        case 3:
          isRawData = args[1]
          callback = args[2]
          break
        case 2:
          isRawData = args[1]
          break
      }

      if (!value || !this._compress) {
        callback(null, value)
        return value
      }

      const inflate = util.promisify(zlib.inflate)
      const deflate = util.promisify(zlib.deflate)

      let returnValue
      switch (isRawData) {
        case false:
          returnValue = await inflate(new Buffer(value, 'base64'))
          break
        default:  //true
          const compressedValue = await deflate(value)
          returnValue = new Buffer(compressedValue).toString('base64')
      }
      callback(null, returnValue)
      return returnValue

    } catch(err) {
      callback(err)
      throw err
    }
  }

  promiseCallback(resolve=NOOP, reject=NOOP, callback=NOOP) {
    return (err, result) => {
      if (err) {
        callback(err)
        return reject(err)
      }
      callback(null, result)
      resolve(result)
    }
  }

  createClients(urlOrClient) {
    let normalClient, normalConfig, ioClient, ioConfig, connectionString, parsedConnString

    if (typeof urlOrClient === 'string') {
      connectionString = urlOrClient
    } else {
      if (urlOrClient) {
        normalClient = urlOrClient
        ioClient = urlOrClient
      } else {
        connectionString = config.redis.url
      }
    }

    if (!(normalClient && ioClient)) {
      parsedConnString  = url.parse(connectionString)
      normalConfig      = { url: connectionString }
      ioConfig          = { host: parsedConnString.hostname, port: parsedConnString.port || 6379 }

      if (parsedConnString.auth)
        ioConfig.password = parsedConnString.auth.split(':')[1]

      if (parsedConnString.protocol.toLowerCase() === 'rediss:')
        normalConfig.tls = ioConfig.tls = { checkServerIdentity: () => undefined }

      normalClient = redis.createClient(normalConfig)
      ioClient = new ioredis(ioConfig)
    }

    return [ normalClient, ioClient ]
  }
}
