/**
 * Module dependencies.
 */
var InsertCommand = require('./commands/insert_command').InsertCommand
  , QueryCommand = require('./commands/query_command').QueryCommand
  , DeleteCommand = require('./commands/delete_command').DeleteCommand
  , UpdateCommand = require('./commands/update_command').UpdateCommand
  , DbCommand = require('./commands/db_command').DbCommand
  , BinaryParser = require('./bson/binary_parser').BinaryParser
  , ObjectID = require('./bson/objectid').ObjectID
  , Code = require('./bson/code').Code
  , Cursor = require('./cursor').Cursor
  , debug = require('util').debug
  , inspect = require('util').inspect
  , utils = require('./utils');

/**
 * Precompiled regexes
**/
const eErrorMessages = /No matching object found/;

/**
 * toString helper.
 */

var toString = Object.prototype.toString;

/**
 * Collection constructor.
 *
 * @param {Database} db
 * @param {String} collectionName
 * @param {Function} pkFactory
 */

function Collection (db, collectionName, pkFactory, options) {
  this.checkCollectionName(collectionName);

  this.db = db;
  this.collectionName = collectionName;
  this.internalHint;
  this.opts = options != null && ('object' === typeof options) ? options : {};
  this.slaveOk = options == null || options.slaveOk == null ? db.slaveOk : options.slaveOk;
  this.serializeFunctions = options == null || options.serializeFunctions == null ? db.serializeFunctions : options.serializeFunctions;
  this.raw = options == null || options.raw == null ? db.raw : options.raw;

  this.pkFactory = pkFactory == null
    ? ObjectID
    : pkFactory;

  Object.defineProperty(this, "hint", {
      enumerable: true
    , get: function () {
        return this.internalHint;
      }
    , set: function (v) {
        this.internalHint = this.normalizeHintField(v);
      }
  });
};

/**
 * Inserts `docs` into the db.
 *
 * @param {Array|Object} docs
 * @param {Object} options (optional)
 * @param {Function} callback (optional)
 * @return {Collection}
 */

Collection.prototype.insert = function insert (docs, options, callback) {
  if ('function' === typeof options) callback = options, options = {};
  if(options == null) options = {};
  if(!('function' === typeof callback)) callback = null;

  this.insertAll(Array.isArray(docs) ? docs : [docs], options, callback);
  return this;
};

/**
 * Checks if `collectionName` is valid.
 *
 * @param {String} collectionName
 */

Collection.prototype.checkCollectionName = function checkCollectionName (collectionName) {
  if ('string' !== typeof collectionName) {
    throw Error("collection name must be a String");
  }

  if (!collectionName || collectionName.indexOf('..') != -1) {
    throw Error("collection names cannot be empty");
  }

  if (collectionName.indexOf('$') != -1 &&
      collectionName.match(/((^\$cmd)|(oplog\.\$main))/) == null) {
    throw Error("collection names must not contain '$'");
  }

  if (collectionName.match(/^\.|\.$/) != null) {
    throw Error("collection names must not start or end with '.'");
  }
};

/**
 * Removes documents specified by `selector` from the db.
 * @param {Object} selector (optional)
 * @param {Object} options (optional)
 * @param {Function} callback (optional)
 */

Collection.prototype.remove = function remove (selector, options, callback) {
  if ('function' === typeof selector) {
    callback = selector;
    selector = options = {};
  } else if ('function' === typeof options) {
    callback = options;
    options = {};
  }
  
  // Ensure options
  if(options == null) options = {};
  if(!('function' === typeof callback)) callback = null;  

  var deleteCommand = new DeleteCommand(
      this.db
    , this.db.databaseName + "." + this.collectionName
    , selector);

  var self = this;
  var errorOptions = options.safe != null ? options.safe : null;
  errorOptions = errorOptions == null && this.opts.safe != null ? this.opts.safe : errorOptions;
  errorOptions = errorOptions == null && this.db.strict != null ? this.db.strict : errorOptions;

  // Execute the command, do not add a callback as it's async
  if (options && options.safe || this.opts.safe != null || this.db.strict) {
    // Insert options
    var commandOptions = {read:false};
    // If we have safe set set async to false
    if(errorOptions == null) commandOptions['async'] = true;
    // Set safe option
    commandOptions['safe'] = true;
    // If we have an error option
    if(typeof errorOptions == 'object') {
      var keys = Object.keys(errorOptions);
      for(var i = 0; i < keys.length; i++) {
        commandOptions[keys[i]] = errorOptions[keys[i]];
      }
    }

    // Execute command with safe options (rolls up both command and safe command into one and executes them on the same connection)
    this.db._executeRemoveCommand(deleteCommand, commandOptions, function (err, error) {
      error = error && error.documents;
      if(!callback) return;      

      if (err) {
        callback(err);
      } else if (error[0].err) {
        callback(self.db.wrap(error[0]));
      } else {
        callback(null, error[0].n);
      }      
    });    
  } else {
    var result = this.db._executeRemoveCommand(deleteCommand);    
    // If no callback just return
    if (!callback) return;
    // If error return error
    if (result instanceof Error) {
      return callback(result);
    }
    // Otherwise just return
    return callback();
  }
};

/**
 * Renames the collection.
 *
 * @param {String} newName
 * @param {Function} callback
 */

Collection.prototype.rename = function rename (newName, callback) {
  var self = this;

  this.checkCollectionName(newName);
  this.db.renameCollection(this.collectionName, newName, function (err, result) {    
    if (err) {
      callback(err);
    } else if (result.documents[0].ok == 0) {
      callback(new Error(result.documents[0].errmsg));
    } else {
      self.db.collection(newName, callback);
    }
  });
};

/**
 * Insert many docs into the db.
 *
 * @param {Array} docs
 * @param {Object} options (optional)
 * @param {Function} callback (optional)
 */

Collection.prototype.insertAll = function insertAll (docs, options, callback) {
  if('function' === typeof options) callback = options, options = {};  
  if(options == null) options = {};
  if(!('function' === typeof callback)) callback = null;

  // Insert options (flags for insert)
  var insertFlags = {};
  // If we have a mongodb version >= 1.9.1 support keepGoing attribute
  if(options['keepGoing'] != null) {
    insertFlags['keepGoing'] = options['keepGoing'];
  }
  
  // Either use override on the function, or go back to default on either the collection
  // level or db
  if(options['serializeFunctions'] != null) {
    insertFlags['serializeFunctions'] = options['serializeFunctions'];
  } else {
    insertFlags['serializeFunctions'] = this.serializeFunctions;
  }
    
  // Pass in options
  var insertCommand = new InsertCommand(
      this.db
    , this.db.databaseName + "." + this.collectionName, true, insertFlags);

  // Add the documents and decorate them with id's if they have none
  for (var index = 0, len = docs.length; index < len; ++index) {
    var doc = docs[index];
    
    // Add id to each document if it's not already defined
    if (!(doc instanceof Buffer) && !doc['_id'] && this.db.forceServerObjectId != true) {
      doc['_id'] = this.pkFactory.createPk();
    }

    insertCommand.add(doc);
  }
  
  var self = this;
  // Collect errorOptions
  var errorOptions = options.safe != null ? options.safe : null;
  errorOptions = errorOptions == null && this.opts.safe != null ? this.opts.safe : errorOptions;
  errorOptions = errorOptions == null && this.db.strict != null ? this.db.strict : errorOptions;
  
  // Default command options
  var commandOptions = {};    
  // If safe is defined check for error message
  // if(options != null && (options.safe == true || this.db.strict == true || this.opts.safe == true)) {
  if(errorOptions && errorOptions != false) {
    // Insert options
    commandOptions['read'] = false;
    // If we have safe set set async to false
    if(errorOptions == null) commandOptions['async'] = true;
    
    // Set safe option
    commandOptions['safe'] = errorOptions;
    // If we have an error option
    if(typeof errorOptions == 'object') {
      var keys = Object.keys(errorOptions);
      for(var i = 0; i < keys.length; i++) {
        commandOptions[keys[i]] = errorOptions[keys[i]];
      }
    }
    
    // Execute command with safe options (rolls up both command and safe command into one and executes them on the same connection)
    this.db._executeInsertCommand(insertCommand, commandOptions, function (err, error) {
      error = error && error.documents;
      if(!callback) return;      

      if (err) {
        callback(err);
      } else if (error[0].err) {
        callback(self.db.wrap(error[0]));
      } else {
        callback(null, docs);
      }      
    });    
  } else {    
    var result = this.db._executeInsertCommand(insertCommand, commandOptions);    
    // If no callback just return
    if(!callback) return;
    // If error return error
    if(result instanceof Error) {
      return callback(result);
    }
    // Otherwise just return
    return callback(null, docs);
  }
};

/**
 * Save a document.
 *
 * @param {Object} doc
 * @param {Object} options (optional)
 * @param {Function} callback (optional)
 */

Collection.prototype.save = function save (doc, options, callback) {
  if('function' === typeof options) callback = options, options = null;
  if(options == null) options = {};
  if(!('function' === typeof callback)) callback = null;

  var errorOptions = options.safe != null ? options.safe : false;    
  errorOptions = errorOptions == null && this.opts.safe != null ? this.opts.safe : errorOptions;
  
  var id = doc['_id'];

  if (id) {
    this.update({ _id: id }, doc, { upsert: true, safe: errorOptions }, callback);
  } else {
    this.insert(doc, { safe: errorOptions }, callback && function (err, docs) {
      if (err) return callback(err, null);

      if (Array.isArray(docs)) {
        callback(err, docs[0]);
      } else {
        callback(err, docs);
      }
    });
  }
};

/**
 * Updates documents.
 *
 * By default updates only the first found doc. To update all matching
 * docs in the db, set options.multi to true.
 *
 * @param {Object} selector
 * @param {Object} document - the fields/vals to be updated, or in the case of
 *                            an upsert operation, inserted.
 * @param {Object} options (optional)
 *    upsert - {bool} perform an upsert operation
 *    multi  - {bool} update all documents matching the selector
 *    safe   - {bool} check if the update failed (requires extra call to db)
 * @param {Function} callback (optional)
 */

Collection.prototype.update = function update (selector, document, options, callback) {
  if('function' === typeof options) callback = options, options = null;
  if(options == null) options = {};
  if(!('function' === typeof callback)) callback = null;

  // Either use override on the function, or go back to default on either the collection
  // level or db
  if(options['serializeFunctions'] != null) {
    options['serializeFunctions'] = options['serializeFunctions'];
  } else {
    options['serializeFunctions'] = this.serializeFunctions;
  }  

  var updateCommand = new UpdateCommand(
      this.db
    , this.db.databaseName + "." + this.collectionName
    , selector
    , document
    , options);

  var self = this;
  // Unpack the error options if any
  var errorOptions = (options && options.safe != null) ? options.safe : null;    
  errorOptions = errorOptions == null && this.opts.safe != null ? this.opts.safe : errorOptions;
  errorOptions = errorOptions == null && this.db.strict != null ? this.db.strict : errorOptions;
  
  // If we are executing in strict mode or safe both the update and the safe command must happen on the same line
  if(errorOptions && errorOptions != false) {    
    // Insert options
    var commandOptions = {read:false};
    // If we have safe set set async to false
    if(errorOptions == null) commandOptions['async'] = true;
    // Set safe option
    commandOptions['safe'] = true;
    // If we have an error option
    if(typeof errorOptions == 'object') {
      var keys = Object.keys(errorOptions);
      for(var i = 0; i < keys.length; i++) {
        commandOptions[keys[i]] = errorOptions[keys[i]];
      }
    }

    // Execute command with safe options (rolls up both command and safe command into one and executes them on the same connection)
    this.db._executeUpdateCommand(updateCommand, commandOptions, function (err, error) {
      error = error && error.documents;
      if(!callback) return;      
      
      if (err) {
        callback(err);
      } else if (error[0].err) {
        callback(self.db.wrap(error[0]));
      } else {
        callback(null, error[0].n);
      }      
    });    
  } else {
    // Execute update
    var result = this.db._executeUpdateCommand(updateCommand);    
    // If no callback just return
    if (!callback) return;
    // If error return error
    if (result instanceof Error) {
      return callback(result);
    }
    // Otherwise just return
    return callback();
  }
};

/**
 * Fetch a distinct collection
 * @param {String} key
 * @param {Object} query (optional)
 * @param {Function} callback (optional)
 */

Collection.prototype.distinct = function distinct (key, query, callback) {
  if ('function' === typeof query) callback = query, query = {};

  var mapCommandHash = {
      distinct: this.collectionName
    , query: query
    , key: key
  };

  var cmd = DbCommand.createDbCommand(this.db, mapCommandHash);

  this.db._executeQueryCommand(cmd, {read:true}, function (err, result) {
    if (err) {
      return callback(err);
    }

    if (result.documents[0].ok != 1) {
      return callback(new Error(result.documents[0].errmsg));
    }

    callback(null, result.documents[0].values);
  });
};

/**
 * Count number of matching documents in the db.
 *
 * @param {Object} query
 * @param {Function} callback
 */

Collection.prototype.count = function count (query, callback) {
  if ('function' === typeof query) callback = query, query = {};

  var final_query = {
      count: this.collectionName
    , query: query
    , fields: null
  };

  var queryOptions = QueryCommand.OPTS_NO_CURSOR_TIMEOUT;
  if (this.slaveOk || this.db.slaveOk) {
    queryOptions |= QueryCommand.OPTS_SLAVE;
  }

  var queryCommand = new QueryCommand(
      this.db
    , this.db.databaseName + ".$cmd"
    , queryOptions
    , 0
    , -1
    , final_query
    , null
  );

  var self = this;
  this.db._executeQueryCommand(queryCommand, {read:true}, function (err, result) {
    result = result && result.documents;
    if(!callback) return;      

    if (err) {
      callback(err);
    } else if (result[0].ok != 1) {
      callback(self.db.wrap(result[0]));
    } else {
      callback(null, result[0].n);
    }
  });
};

/**
 * Drop this collection.
 *
 * @param {Function} callback
 */

Collection.prototype.drop = function drop (callback) {
  this.db.dropCollection(this.collectionName, callback);
};

/**
 * Find and update a document.
 *
 * @param {Object} query
 * @param {Array}  sort - if multiple docs match, choose the first one
 *                        in the specified sort order as the object to manipulate
 * @param {Object} doc - the fields/vals to be updated
 * @param {Object} options -
 *        remove: {Bool} set to true to remove the object before returning
 *        upsert: {Bool} perform an upsert operation
 *        new:    {Bool} set to true if you want to return the modified object
 *                       rather than the original. Ignored for remove.
 * @param {Function} callback
 */
Collection.prototype.findAndModify = function findAndModify (query, sort, doc, options, callback) {
  var args = Array.prototype.slice.call(arguments, 1);
  callback = args.pop();
  sort = args.length ? args.shift() : [];
  doc = args.length ? args.shift() : null;
  options = args.length ? args.shift() : {};
  var self = this;

  var queryObject = {
      'findandmodify': this.collectionName
    , 'query': query
    , 'sort': utils.formattedOrderClause(sort)
  };

  queryObject.new = options.new ? 1 : 0;
  queryObject.remove = options.remove ? 1 : 0;
  queryObject.upsert = options.upsert ? 1 : 0;

  if (options.fields) {
    queryObject.fields = options.fields;
  }

  if (doc && !options.remove) {
    queryObject.update = doc;
  }

  // Either use override on the function, or go back to default on either the collection
  // level or db
  if(options['serializeFunctions'] != null) {
    options['serializeFunctions'] = options['serializeFunctions'];
  } else {
    options['serializeFunctions'] = this.serializeFunctions;
  }
  
  // Unpack the error options if any
  var errorOptions = (options && options.safe != null) ? options.safe : null;    
  errorOptions = errorOptions == null && this.opts.safe != null ? this.opts.safe : errorOptions;
  errorOptions = errorOptions == null && this.db.strict != null ? this.db.strict : errorOptions;

  // Commands to send
  var commands = [];
  // Add the find and modify command
  commands.push(DbCommand.createDbCommand(this.db, queryObject, options));
  // If we have safe defined we need to return both call results
  var chainedCommands = errorOptions != null ? true : false;
  // Add error command if we have one
  if(chainedCommands) {
    commands.push(DbCommand.createGetLastErrorCommand(errorOptions, this.db));
  }
  
  // Fire commands and 
  this.db._executeQueryCommand(commands, function(err, result) {
    result = result && result.documents;

    if(err != null) {
      callback(err);
    } else if(result[0].err != null) {
      callback(self.db.wrap(result[0]), null);
    } else if(result[0].errmsg != null && !result[0].errmsg.match(eErrorMessages)) {
      // Workaround due to 1.8.X returning an error on no matching object
      // while 2.0.X does not not, making 2.0.X behaviour standard
      callback(self.db.wrap(result[0]), null);
    } else {
      return callback(null, result[0].value);
    }        
  });
}

/**
 * Various argument possibilities
 * TODO : combine/reduce # of possibilities
 * 1 callback?
 * 2 selector, callback?,
 * 2 callback?, options  // really?!
 * 3 selector, fields, callback?
 * 3 selector, options, callback?
 * 4,selector, fields, options, callback?
 * 5 selector, fields, skip, limit, callback?
 * 6 selector, fields, skip, limit, timeout, callback?
 *
 * Available options:
 * limit, sort, fields, skip, hint, explain, snapshot, timeout, tailable, batchSize
 */

Collection.prototype.find = function find () {
  var options
    , args = Array.prototype.slice.call(arguments, 0)
    , has_callback = typeof args[args.length - 1] === 'function'
    , has_weird_callback = typeof args[0] === 'function'
    , callback = has_callback ? args.pop() : (has_weird_callback ? args.shift() : null)
    , len = args.length
    , selector = len >= 1 ? args[0] : {}
    , fields = len >= 2 ? args[1] : undefined;

  if (len === 1 && has_weird_callback) {
    // backwards compat for callback?, options case
    selector = {};
    options = args[0];
  }

  if (len === 2) {
    // backwards compat for options object
    var test = ['limit','sort','fields','skip','hint','explain','snapshot','timeout','tailable', 'batchSize', 'raw', 'read']
      , is_option = false;

    for (var idx = 0, l = test.length; idx < l; ++idx) {
      if (test[idx] in fields) {
        is_option = true;
        break;
      }
    }

    if (is_option) {
      options = fields;
      fields = undefined;
    } else {
      options = {};
    }
  }

  if (3 === len) {
    options = args[2];
  }

  // Ensure selector is not null
  selector = selector == null ? {} : selector;
  // Validate correctness off the selector
  var object = selector;
  if(object instanceof Buffer) {
    var object_size = object[0] | object[1] << 8 | object[2] << 16 | object[3] << 24;    
    if(object_size != object.length)  {
      var error = new Error("query selector raw message size does not match message header size [" + object.length + "] != [" + object_size + "]");
      error.name = 'MongoError';
      throw error;
    }
  }
  
  // Validate correctness of the field selector
  var object = fields;
  if(object instanceof Buffer) {
    var object_size = object[0] | object[1] << 8 | object[2] << 16 | object[3] << 24;    
    if(object_size != object.length)  {
      var error = new Error("query fields raw message size does not match message header size [" + object.length + "] != [" + object_size + "]");
      error.name = 'MongoError';
      throw error;
    }
  }    
  
  // Check special case where we are using an objectId
  if(selector instanceof ObjectID) {
    selector = {_id:selector};
  }

  // If it's a serialized fields field we need to just let it through
  // user be warned it better be good
  if (options && options.fields && !(options.fields instanceof Buffer)) {
    fields = {};
    if (Array.isArray(options.fields)) {
      if (!options.fields.length) {
        fields['_id'] = 1;
      } else {
        for (var i = 0, l = options.fields.length; i < l; i++) {
          fields[options.fields[i]] = 1;
        }
      }
    } else {
      fields = options.fields;
    }
  }

  if (!options) options = {};
  options.skip = len > 3 ? args[2] : options.skip ? options.skip : 0;
  options.limit = len > 3 ? args[3] : options.limit ? options.limit : 0;
  options.raw = options.raw != null && typeof options.raw === 'boolean' ? options.raw : this.raw;
  options.hint = options.hint != null ? this.normalizeHintField(options.hint) : this.internalHint;
  options.timeout = len == 5 ? args[4] : typeof options.timeout === 'undefined' ? undefined : options.timeout;
  // If we have overridden slaveOk otherwise use the default db setting
  options.slaveOk = options.slaveOk != null ? options.slaveOk : this.db.slaveOk;
  var o = options;

  // callback for backward compatibility
  if (callback) {
    // TODO refactor Cursor args
    callback(null, new Cursor(this.db, this, selector, fields, o.skip, o.limit, o.sort, o.hint, o.explain, o.snapshot, o.timeout, o.tailable, o.batchSize, o.slaveOk, o.raw, o.read));
  } else {
    return new Cursor(this.db, this, selector, fields, o.skip, o.limit, o.sort, o.hint, o.explain, o.snapshot, o.timeout, o.tailable, o.batchSize, o.slaveOk, o.raw, o.read);
  }
};

/**
 * Normalizes a `hint` argument.
 *
 * @param {String|Object|Array} hint
 * @return {Object}
 */

Collection.prototype.normalizeHintField = function normalizeHintField (hint) {
  var finalHint = null;

  if (null != hint) {
    switch (hint.constructor) {
      case String:
        finalHint = {};
        finalHint[hint] = 1;
        break;
      case Object:
        finalHint = {};
        for (var name in hint) {
          finalHint[name] = hint[name];
        }
        break;
      case Array:
        finalHint = {};
        hint.forEach(function(param) {
          finalHint[param] = 1;
        });
        break;
    }
  }

  return finalHint;
};

/**
 * Finds one document.
 *
 * @param {Object} queryObject
 * @param {Object} options
 * @param {Function} callback
 */
 /**
  * Various argument possibilities
  * TODO : combine/reduce # of possibilities
  * 1 callback?
  * 2 selector, callback?,
  * 2 callback?, options  // really?!
  * 3 selector, fields, callback?
  * 3 selector, options, callback?
  * 4,selector, fields, options, callback?
  * 5 selector, fields, skip, limit, callback?
  * 6 selector, fields, skip, limit, timeout, callback?
  *
  * Available options:
  * limit, sort, fields, skip, hint, explain, snapshot, timeout, tailable, batchSize
  */

Collection.prototype.findOne = function findOne () {
  var self = this;
  var options
    , args = Array.prototype.slice.call(arguments, 0)
    , has_callback = typeof args[args.length - 1] === 'function'
    , has_weird_callback = typeof args[0] === 'function'
    , callback = has_callback ? args.pop() : (has_weird_callback ? args.shift() : null)
    , len = args.length
    , selector = len >= 1 ? args[0] : {}
    , fields = len >= 2 ? args[1] : undefined;

  if (len === 1 && has_weird_callback) {
    // backwards compat for callback?, options case
    selector = {};
    options = args[0];
  }

  if (len === 2) {
    // backwards compat for options object
    var test = ['limit','sort','fields','skip','hint','explain','snapshot','timeout','tailable', 'batchSize', 'raw']
      , is_option = false;

    for (var idx = 0, l = test.length; idx < l; ++idx) {
      if (test[idx] in fields) {
        is_option = true;
        break;
      }
    }

    if (is_option) {
      options = fields;
      fields = undefined;
    } else {
      options = {};
    }
  }

  if (3 === len) {
    options = args[2];
  }

  // Ensure selector is not null
  selector = selector == null ? {} : selector;
  // Validate correctness off the selector
  var object = selector;
  if(object instanceof Buffer) {
    var object_size = object[0] | object[1] << 8 | object[2] << 16 | object[3] << 24;    
    if(object_size != object.length)  {
      var error = new Error("query selector raw message size does not match message header size [" + object.length + "] != [" + object_size + "]");
      error.name = 'MongoError';
      throw error;
    }
  }
  
  // Validate correctness of the field selector
  var object = fields;
  if(object instanceof Buffer) {
    var object_size = object[0] | object[1] << 8 | object[2] << 16 | object[3] << 24;    
    if(object_size != object.length)  {
      var error = new Error("query fields raw message size does not match message header size [" + object.length + "] != [" + object_size + "]");
      error.name = 'MongoError';
      throw error;
    }
  }    
  
  // Check special case where we are using an objectId
  if(selector instanceof ObjectID) {
    selector = {_id:selector};
  }

  // If it's a serialized fields field we need to just let it through
  // user be warned it better be good
  if (options && options.fields && !(options.fields instanceof Buffer)) {
    fields = {};
    if (Array.isArray(options.fields)) {
      if (!options.fields.length) {
        fields['_id'] = 1;
      } else {
        for (var i = 0, l = options.fields.length; i < l; i++) {
          fields[options.fields[i]] = 1;
        }
      }
    } else {
      fields = options.fields;
    }
  }

  if (!options) options = {};
  options.skip = len > 3 ? args[2] : options.skip ? options.skip : 0;
  options.limit = len > 3 ? args[3] : options.limit ? options.limit : 0;
  options.raw = options.raw != null && typeof options.raw === 'boolean' ? options.raw : this.raw;
  options.hint = options.hint != null ? this.normalizeHintField(options.hint) : this.internalHint;
  options.timeout = len == 5 ? args[4] : typeof options.timeout === 'undefined' ? undefined : options.timeout;
  // If we have overridden slaveOk otherwise use the default db setting
  options.slaveOk = options.slaveOk != null ? options.slaveOk : this.db.slaveOk;
  // Create cursor instance
  var o = options;
  var cursor = new Cursor(this.db, this, selector, fields, o.skip, 1, o.sort, o.hint, o.explain, o.snapshot, o.timeout, o.tailable, o.batchSize, o.slaveOk, o.raw);
  cursor.toArray(function(err, items) {
    if(err != null) return callback(err instanceof Error ? err : self.db.wrap(new Error(err)), null);
    if(items.length == 1) return callback(null, items[0]);    
    callback(null, null);    
  });
};

/**
 * Creates an index on this collection.
 *
 * @param {Object} fieldOrSpec
 * @param {Object} options
 * @param {Function} callback
 */

Collection.prototype.createIndex = function createIndex (fieldOrSpec, options, callback) {
  this.db.createIndex(this.collectionName, fieldOrSpec, options, callback);
};

/**
 * Ensures the index exists on this collection.
 *
 * @param {Object} fieldOrSpec
 * @param {Object} options
 * @param {Function} callback
 */

Collection.prototype.ensureIndex = function ensureIndex (fieldOrSpec, options, callback) {
  this.db.ensureIndex(this.collectionName, fieldOrSpec, options, callback);
};

/**
 * Retrieves this collections index info.
 *
 * @param {Object} options -
 *        full: {Bool} set to true to remove raw index information
 * @param {Function} callback
 */
Collection.prototype.indexInformation = function indexInformation (options, callback) {
  // Unpack calls
  var args = Array.prototype.slice.call(arguments, 0);
  callback = args.pop();
  options = args.length ? args.shift() : {};
  // Call the index information
  this.db.indexInformation(this.collectionName, options, callback);
};

/**
 * Drops an index from this collection.
 *
 * @param {String} name
 * @param {Function} callback
 */

Collection.prototype.dropIndex = function dropIndex (name, callback) {
  this.db.dropIndex(this.collectionName, name, callback);
};

/**
 * Drops all indexes from this collection.
 *
 * @param {Function} callback
 */

Collection.prototype.dropIndexes = function dropIndexes (callback) {
  this.db.dropIndex(this.collectionName, '*', function (err, result) {
    if (err) {
      callback(err);
    } else if (1 == result.documents[0].ok) {
      callback(null, true);
    } else {
      callback(new Error("map-reduce failed: " + result.documents[0].errmsg), false);
    }
  });
};

/**
 * Map reduce.
 *
 * @param {Function|String} map
 * @param {Function|String} reduce
 * @param {Objects} options
 * @param {Function} callback
 */

Collection.prototype.mapReduce = function mapReduce (map, reduce, options, callback) {
  if ('function' === typeof options) callback = options, options = {};

  // Set default to inline
  if (null == options.out) options.out = 'inline';

  if ('function' === typeof map) {
    map = map.toString();
  }

  if ('function' === typeof reduce) {
    reduce = reduce.toString();
  }

  if ('function' === typeof options.finalize) {
    options.finalize = options.finalize.toString();
  }

  var mapCommandHash = {
      mapreduce: this.collectionName
    , map: map
    , reduce: reduce
  };

  // Add any other options passed in
  for (var name in options) {
    mapCommandHash[name] = options[name];
  }

  var self = this;
  var cmd = DbCommand.createDbCommand(this.db, mapCommandHash);

  this.db._executeQueryCommand(cmd, {read:true}, function (err, result) {
    if (err) {
      return callback(err);
    }

    if (1 != result.documents[0].ok) {
      return callback(result.documents[0]);
    }

    // invoked with inline?
    if (result.documents[0].results) {
      return callback(null, result.documents[0].results);
    }

    // Create a collection object that wraps the result collection
    self.db.collection(result.documents[0].result, function (err, collection) {
      if (!options.include_statistics) {
        return callback(err, collection);
      }

      var stats = {
          processtime: result.documents[0].timeMillis
        , counts: result.documents[0].counts
      };
      
      callback(err, collection, stats);
    });
  });
};

/**
 * Group function helper
 */

var groupFunction = function () {
  var c = db[ns].find(condition);
  var map = new Map();
  var reduce_function = reduce;

  while (c.hasNext()) {
    var obj = c.next();
    var key = {};

    for (var i = 0, len = keys.length; i < len; ++i) {
      var k = keys[i];
      key[k] = obj[k];
    }

    var aggObj = map.get(key);

    if (aggObj == null) {
      var newObj = Object.extend({}, key);
      aggObj = Object.extend(newObj, initial);
      map.put(key, aggObj);
    }

    reduce_function(obj, aggObj);
  }

  return { "result": map.values() };
}.toString();

/**
 * Group.
 *
 * @param {Object|Array|Function|Code} keys
 * @param {TODO} condition
 * @param {TODO} initial
 * @param {Function|Code} reduce
 * @param {Function|Code} finalize
 * @param {Boolean} command
 * @param {Function} callback
 */

Collection.prototype.group = function group (keys, condition, initial, reduce, finalize, command, callback) {
  var args = Array.prototype.slice.call(arguments, 3);
  callback = args.pop();
  // Fetch all commands
  reduce = args.length ? args.shift() : null;
  finalize = args.length ? args.shift() : null;
  command = args.length ? args.shift() : null;

  // Make sure we are backward compatible
  if(!(typeof finalize == 'function')) {
    command = finalize;
    finalize = null;
  }

  // Fetch the Code class to avoid circular dependencies
  // var Code = require('./bson/code').Code
  
  if (!Array.isArray(keys) && keys instanceof Object && typeof(keys) !== 'function') {
    keys = Object.keys(keys);
  }
  
  if(reduce instanceof Function) {
    reduce = reduce.toString();
  }
  
  if(finalize instanceof Function) {
    finalize = finalize.toString();
  }
  
  // Set up the command as default
  command = command == null ? true : command;
  
  // Execute using the command
  if(command) {
    var reduceFunction = reduce instanceof Code
        ? reduce
        : new Code(reduce);

    var selector = {
      group: {
          'ns': this.collectionName
        , '$reduce': reduceFunction
        , 'cond': condition
        , 'initial': initial
      }      
    };
    
    // if finalize is defined
    if(finalize != null) selector.group['finalize'] = finalize;
    // Set up group selector
    if ('function' === typeof keys) {
      selector.group.$keyf = keys instanceof Code
        ? keys
        : new Code(keys);
    } else {
      var hash = {};
      keys.forEach(function (key) {
        hash[key] = 1;
      });
      selector.group.key = hash;
    }

    var cmd = DbCommand.createDbCommand(this.db, selector);
    
    this.db._executeQueryCommand(cmd, {read:true}, function (err, result) {
      if (err) return callback(err);
      
      var document = result.documents[0];
      if (null == document.retval) {
        return callback(new Error("group command failed: " + document.errmsg));
      }

      callback(null, document.retval);
    });

  } else {
    // Create execution scope
    var scope = reduce != null && reduce instanceof Code
      ? reduce.scope
      : {};

    scope.ns = this.collectionName;
    scope.keys = keys;
    scope.condition = condition;
    scope.initial = initial;
    
    // Pass in the function text to execute within mongodb.
    var groupfn = groupFunction.replace(/ reduce;/, reduce.toString() + ';');

    this.db.eval(new Code(groupfn, scope), function (err, results) {      
      if (err) return callback(err, null);
      callback(null, results.result || results);
    });
  }
};

/**
 * Options.
 *
 * @param {Function} callback
 */

Collection.prototype.options = function options (callback) {
  this.db.collectionsInfo(this.collectionName, function (err, cursor) {
    if (err) return callback(err);
    cursor.nextObject(function (err, document) {
      callback(err, document && document.options || null);
    });
  });
};

/**
 * Expose.
 */

exports.Collection = Collection;