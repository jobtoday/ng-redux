import Connector from './connector';
import invariant from 'invariant';
import {createStore, applyMiddleware, compose, combineReducers} from 'redux';
import { addMiddleware } from 'redux-dynamic-middlewares';
import digestMiddleware from './digestMiddleware';

import curry from 'lodash.curry';
import isFunction from 'lodash.isfunction';
import map from 'lodash.map';

const isArray = Array.isArray;

const typeIs = curry((type, val) => typeof val === type);
const isObject = typeIs('object');
const isString = typeIs('string');
const assign  = Object.assign;

export default function ngReduxProvider() {
  let _reducer = undefined;
  let _middlewares = undefined;
  let _storeEnhancers = [];
  let _initialState = undefined;
  let _reducerIsObject = undefined;
  let _store = undefined;

  this.createStoreWith = (reducer, middlewares, storeEnhancers, initialState) => {
    invariant(
      isFunction(reducer) || isObject(reducer),
      'The reducer parameter passed to createStoreWith must be a Function or an Object. Instead received %s.',
      typeof reducer
    );

    invariant(
      !storeEnhancers || isArray(storeEnhancers),
      'The storeEnhancers parameter passed to createStoreWith must be an Array. Instead received %s.',
      typeof storeEnhancers
    );

    _reducer = reducer;
    _reducerIsObject = isObject(reducer);
    _storeEnhancers = storeEnhancers || [];
    _middlewares = middlewares || [];
    _initialState = initialState || {};
  };

  this.connectToStore = (store, middlewares) => {
    invariant(
      isObject(store),
      'The store parameter passed to connectToStore must be an Object. Instead received %s.',
      typeof store
    );

    invariant(
      !middlewares || isArray(middlewares),
      'The middlewares parameter passed to connectToStore must be an Array. Instead received %s.',
      typeof middlewares
    );

    _store = store;
    _middlewares = middlewares || [];
  };

  this.$get = ($injector) => {
    let store = {};

    const resolveMiddleware = middleware => isString(middleware)
      ? $injector.get(middleware)
      : middleware;

    const resolvedMiddleware = map(_middlewares, resolveMiddleware);

    const resolveStoreEnhancer = storeEnhancer => isString(storeEnhancer)
      ? $injector.get(storeEnhancer)
      : storeEnhancer;

    const resolvedStoreEnhancer = map(_storeEnhancers, resolveStoreEnhancer);

    if (_reducerIsObject) {
      const getReducerKey = key => isString(_reducer[key])
        ? $injector.get(_reducer[key])
        : _reducer[key];

      const resolveReducerKey = (result, key) => assign({}, result,
        { [key]: getReducerKey(key) }
      );

      const reducersObj = Object
        .keys(_reducer)
        .reduce(resolveReducerKey, {});

      _reducer = combineReducers(reducersObj);
    }

    // digestMiddleware needs to be the last one.
    resolvedMiddleware.push(digestMiddleware($injector.get('$rootScope')));

    if (_store) {
      store = _store;
      addMiddleware(resolvedMiddleware);
    } else {
      // combine middleware into a store enhancer.
      const middlewares = applyMiddleware(...resolvedMiddleware);

      // compose enhancers with middleware and create store.
      store = createStore(_reducer, _initialState, compose(...resolvedStoreEnhancer, middlewares));
    }

    return assign({}, store, { connect: Connector(store) });
  };

  this.$get.$inject = ['$injector'];
}
