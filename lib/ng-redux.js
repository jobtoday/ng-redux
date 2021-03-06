'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var _toConsumableArray = _interopDefault(require('babel-runtime/helpers/toConsumableArray'));
var _Object$keys = _interopDefault(require('babel-runtime/core-js/object/keys'));
var _defineProperty = _interopDefault(require('babel-runtime/helpers/defineProperty'));
var _Object$assign = _interopDefault(require('babel-runtime/core-js/object/assign'));
var _typeof = _interopDefault(require('babel-runtime/helpers/typeof'));
var redux = require('redux');
var invariant = _interopDefault(require('invariant'));
var isPlainObject = _interopDefault(require('lodash.isplainobject'));
var isFunction = _interopDefault(require('lodash.isfunction'));
var isObject = _interopDefault(require('lodash.isobject'));
var reduxDynamicMiddlewares = require('redux-dynamic-middlewares');
var curry = _interopDefault(require('lodash.curry'));
var map = _interopDefault(require('lodash.map'));

function shallowEqual(objA, objB) {
  if (objA === objB) {
    return true;
  }

  /* $$hashKey is added by angular when using ng-repeat, we ignore that*/
  var keysA = _Object$keys(objA).filter(function (k) {
    return k !== '$$hashKey';
  });
  var keysB = _Object$keys(objB).filter(function (k) {
    return k !== '$$hashKey';
  });

  if (keysA.length !== keysB.length) {
    return false;
  }

  // Test for A's keys different from B.
  var hasOwn = Object.prototype.hasOwnProperty;
  for (var i = 0; i < keysA.length; i++) {
    if (!hasOwn.call(objB, keysA[i]) || objA[keysA[i]] !== objB[keysA[i]]) {
      return false;
    }
  }

  return true;
}

function wrapActionCreators(actionCreators) {
  return function (dispatch) {
    return redux.bindActionCreators(actionCreators, dispatch);
  };
}

var assign$1 = _Object$assign;
var defaultMapStateToTarget = function defaultMapStateToTarget() {
  return {};
};
var defaultMapDispatchToTarget = function defaultMapDispatchToTarget(dispatch) {
  return { dispatch: dispatch };
};

// this make me cry ;(
var EMP_BRANCH_NAME = 'employer'

function Connector(store) {
  return function (mapStateToTarget, mapDispatchToTarget) {

    var finalMapStateToTarget = mapStateToTarget || defaultMapStateToTarget;

    var finalMapDispatchToTarget = isPlainObject(mapDispatchToTarget) ? wrapActionCreators(mapDispatchToTarget) : mapDispatchToTarget || defaultMapDispatchToTarget;

    invariant(isFunction(finalMapStateToTarget), 'mapStateToTarget must be a Function. Instead received %s.', finalMapStateToTarget);

    invariant(isPlainObject(finalMapDispatchToTarget) || isFunction(finalMapDispatchToTarget), 'mapDispatchToTarget must be a plain Object or a Function. Instead received %s.', finalMapDispatchToTarget);

    var slice = getStateSlice(store.getState()[EMP_BRANCH_NAME], finalMapStateToTarget, false);
    var isFactory = isFunction(slice);

    if (isFactory) {
      finalMapStateToTarget = slice;
      slice = getStateSlice(store.getState()[EMP_BRANCH_NAME], finalMapStateToTarget);
    }

    var boundActionCreators = finalMapDispatchToTarget(store.dispatch);

    return function (target) {

      invariant(isFunction(target) || isObject(target), 'The target parameter passed to connect must be a Function or a object.');

      //Initial update
      updateTarget(target, slice, boundActionCreators);

      var unsubscribe = store.subscribe(function () {
        var nextSlice = getStateSlice(store.getState()[EMP_BRANCH_NAME], finalMapStateToTarget);
        if (!shallowEqual(slice, nextSlice)) {
          slice = nextSlice;
          updateTarget(target, slice, boundActionCreators);
        }
      });
      return unsubscribe;
    };
  };
}

function updateTarget(target, StateSlice, dispatch) {
  if (isFunction(target)) {
    target(StateSlice, dispatch);
  } else {
    assign$1(target, StateSlice, dispatch);
  }
}

function getStateSlice(state, mapStateToScope) {
  var shouldReturnObject = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;

  var slice = mapStateToScope(state);

  if (shouldReturnObject) {
    invariant(isPlainObject(slice), '`mapStateToScope` must return an object. Instead received %s.', slice);
  } else {
    invariant(isPlainObject(slice) || isFunction(slice), '`mapStateToScope` must return an object or a function. Instead received %s.', slice);
  }

  return slice;
}

function digestMiddleware($rootScope) {
    return function (store) {
        return function (next) {
            return function (action) {
                var res = next(action);
                $rootScope.$evalAsync(res);
                return res;
            };
        };
    };
}

var isArray = Array.isArray;

var typeIs = curry(function (type, val) {
  return (typeof val === 'undefined' ? 'undefined' : _typeof(val)) === type;
});
var isObject$1 = typeIs('object');
var isString = typeIs('string');
var assign = _Object$assign;

function ngReduxProvider() {
  var _reducer = undefined;
  var _middlewares = undefined;
  var _storeEnhancers = [];
  var _initialState = undefined;
  var _reducerIsObject = undefined;
  var _store = undefined;

  this.createStoreWith = function (reducer, middlewares, storeEnhancers, initialState) {
    invariant(isFunction(reducer) || isObject$1(reducer), 'The reducer parameter passed to createStoreWith must be a Function or an Object. Instead received %s.', typeof reducer === 'undefined' ? 'undefined' : _typeof(reducer));

    invariant(!storeEnhancers || isArray(storeEnhancers), 'The storeEnhancers parameter passed to createStoreWith must be an Array. Instead received %s.', typeof storeEnhancers === 'undefined' ? 'undefined' : _typeof(storeEnhancers));

    _reducer = reducer;
    _reducerIsObject = isObject$1(reducer);
    _storeEnhancers = storeEnhancers || [];
    _middlewares = middlewares || [];
    _initialState = initialState || {};
  };

  this.connectToStore = function (store, middlewares) {
    invariant(isObject$1(store), 'The store parameter passed to connectToStore must be an Object. Instead received %s.', typeof store === 'undefined' ? 'undefined' : _typeof(store));

    invariant(!middlewares || isArray(middlewares), 'The middlewares parameter passed to connectToStore must be an Array. Instead received %s.', typeof middlewares === 'undefined' ? 'undefined' : _typeof(middlewares));

    _store = store;
    _middlewares = middlewares || [];
  };

  this.$get = function ($injector) {
    var store = {};

    var resolveMiddleware = function resolveMiddleware(middleware) {
      return isString(middleware) ? $injector.get(middleware) : middleware;
    };

    var resolvedMiddleware = map(_middlewares, resolveMiddleware);

    var resolveStoreEnhancer = function resolveStoreEnhancer(storeEnhancer) {
      return isString(storeEnhancer) ? $injector.get(storeEnhancer) : storeEnhancer;
    };

    var resolvedStoreEnhancer = map(_storeEnhancers, resolveStoreEnhancer);

    if (_reducerIsObject) {
      var getReducerKey = function getReducerKey(key) {
        return isString(_reducer[key]) ? $injector.get(_reducer[key]) : _reducer[key];
      };

      var resolveReducerKey = function resolveReducerKey(result, key) {
        return assign({}, result, _defineProperty({}, key, getReducerKey(key)));
      };

      var reducersObj = _Object$keys(_reducer).reduce(resolveReducerKey, {});

      _reducer = redux.combineReducers(reducersObj);
    }

    // digestMiddleware needs to be the last one.
    resolvedMiddleware.push(digestMiddleware($injector.get('$rootScope')));

    if (_store) {
      store = _store;
      reduxDynamicMiddlewares.addMiddleware(resolvedMiddleware);
    } else {
      // combine middleware into a store enhancer.
      var middlewares = redux.applyMiddleware.apply(undefined, _toConsumableArray(resolvedMiddleware));

      // compose enhancers with middleware and create store.
      store = redux.createStore(_reducer, _initialState, redux.compose.apply(undefined, _toConsumableArray(resolvedStoreEnhancer).concat([middlewares])));
    }

    return assign({}, store, { connect: Connector(store) });
  };

  this.$get.$inject = ['$injector'];
}

var index = angular.module('ngRedux', []).provider('$ngRedux', ngReduxProvider).name;

module.exports = index;
//# sourceMappingURL=ng-redux.js.map
