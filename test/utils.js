'use strict';

var test = require('tape');
var utils = require('../lib/utils');

test('merge()', function (t) {
    t.deepEqual(utils.merge({ a: 'b' }, { a: 'c' }), { a: ['b', 'c'] }, 'merges two objects with the same key');

    var oneMerged = utils.merge({ foo: 'bar' }, { foo: { first: '123' } });
    t.deepEqual(oneMerged, { foo: ['bar', { first: '123' }] }, 'merges a standalone and an object into an array');

    var twoMerged = utils.merge({ foo: ['bar', { first: '123' }] }, { foo: { second: '456' } });
    t.deepEqual(twoMerged, { foo: { 0: 'bar', 1: { first: '123' }, second: '456' } }, 'merges a standalone and two objects into an array');

    var sandwiched = utils.merge({ foo: ['bar', { first: '123', second: '456' }] }, { foo: 'baz' });
    t.deepEqual(sandwiched, { foo: ['bar', { first: '123', second: '456' }, 'baz'] }, 'merges an object sandwiched by two standalones into an array');

    var nestedArrays = utils.merge({ foo: ['baz'] }, { foo: ['bar', 'xyzzy'] });
    t.deepEqual(nestedArrays, { foo: ['baz', 'bar', 'xyzzy'] });

    t.test('with overflow objects (from arrayLimit)', function (st) {
        st.test('merges primitive into overflow object at next index', function (s2t) {
            // Create an overflow object via combine
            var overflow = utils.combine(['a'], 'b', 1, false);
            s2t.ok(utils.isOverflow(overflow), 'overflow object is marked');
            var merged = utils.merge(overflow, 'c');
            s2t.deepEqual(merged, { 0: 'a', 1: 'b', 2: 'c' }, 'adds primitive at next numeric index');
            s2t.end();
        });

        st.test('merges primitive into regular object with numeric keys normally', function (s2t) {
            var obj = { 0: 'a', 1: 'b' };
            s2t.notOk(utils.isOverflow(obj), 'plain object is not marked as overflow');
            var merged = utils.merge(obj, 'c');
            s2t.deepEqual(merged, { 0: 'a', 1: 'b', c: true }, 'adds primitive as key (not at next index)');
            s2t.end();
        });

        st.test('merges primitive into object with non-numeric keys normally', function (s2t) {
            var obj = { foo: 'bar' };
            var merged = utils.merge(obj, 'baz');
            s2t.deepEqual(merged, { foo: 'bar', baz: true }, 'adds primitive as key with value true');
            s2t.end();
        });

        st.test('merges overflow object into primitive', function (s2t) {
            // Create an overflow object via combine
            var overflow = utils.combine([], 'b', 0, false);
            s2t.ok(utils.isOverflow(overflow), 'overflow object is marked');
            var merged = utils.merge('a', overflow);
            s2t.ok(utils.isOverflow(merged), 'result is also marked as overflow');
            s2t.deepEqual(merged, { 0: 'a', 1: 'b' }, 'creates object with primitive at 0, source values shifted');
            s2t.end();
        });

        st.test('merges overflow object with multiple values into primitive', function (s2t) {
            // Create an overflow object via combine
            var overflow = utils.combine(['b'], 'c', 1, false);
            s2t.ok(utils.isOverflow(overflow), 'overflow object is marked');
            var merged = utils.merge('a', overflow);
            s2t.deepEqual(merged, { 0: 'a', 1: 'b', 2: 'c' }, 'shifts all source indices by 1');
            s2t.end();
        });

        st.test('merges regular object into primitive as array', function (s2t) {
            var obj = { foo: 'bar' };
            var merged = utils.merge('a', obj);
            s2t.deepEqual(merged, ['a', { foo: 'bar' }], 'creates array with primitive and object');
            s2t.end();
        });

        st.end();
    });

    t.end();
});

test('assign()', function (t) {
    var target = { a: 1, b: 2 };
    var source = { b: 3, c: 4 };
    var result = utils.assign(target, source);

    t.equal(result, target, 'returns the target');
    t.deepEqual(target, { a: 1, b: 3, c: 4 }, 'target and source are merged');
    t.deepEqual(source, { b: 3, c: 4 }, 'source is untouched');

    t.end();
});

test('combine()', function (t) {
    t.test('basic combination', function (st) {
        st.deepEqual(utils.combine('a', 'b', 10, false), ['a', 'b'], 'combines primitives into array');
        st.deepEqual(utils.combine(['a'], 'b', 10, false), ['a', 'b'], 'appends to array');
        st.end();
    });

    t.test('with arrayLimit', function (st) {
        st.test('under the limit', function (s2t) {
            var combined = utils.combine(['a', 'b'], 'c', 10, false);
            s2t.deepEqual(combined, ['a', 'b', 'c'], 'returns array when under limit');
            s2t.ok(Array.isArray(combined), 'result is an array');
            s2t.end();
        });

        st.test('exactly at the limit stays as array', function (s2t) {
            var combined = utils.combine(['a', 'b'], 'c', 3, false);
            s2t.deepEqual(combined, ['a', 'b', 'c'], 'stays as array when exactly at limit');
            s2t.ok(Array.isArray(combined), 'result is an array');
            s2t.end();
        });

        st.test('over the limit', function (s2t) {
            var combined = utils.combine(['a', 'b', 'c'], 'd', 3, false);
            s2t.deepEqual(combined, { 0: 'a', 1: 'b', 2: 'c', 3: 'd' }, 'converts to object when over limit');
            s2t.notOk(Array.isArray(combined), 'result is not an array');
            s2t.end();
        });

        st.test('with arrayLimit 0', function (s2t) {
            var combined = utils.combine([], 'a', 0, false);
            s2t.deepEqual(combined, { 0: 'a' }, 'converts single element to object with arrayLimit 0');
            s2t.notOk(Array.isArray(combined), 'result is not an array');
            s2t.end();
        });

        st.test('with plainObjects option', function (s2t) {
            var combined = utils.combine(['a'], 'b', 1, true);
            var expected = { __proto__: null, 0: 'a', 1: 'b' };
            s2t.deepEqual(combined, expected, 'converts to object with null prototype');
            s2t.equal(Object.getPrototypeOf(combined), null, 'result has null prototype when plainObjects is true');
            s2t.end();
        });

        st.end();
    });

    t.test('with existing overflow object', function (st) {
        st.test('adds to existing overflow object at next index', function (s2t) {
            // Create overflow object first via combine
            var overflow = utils.combine(['a'], 'b', 1, false);
            s2t.ok(utils.isOverflow(overflow), 'initial object is marked as overflow');

            var combined = utils.combine(overflow, 'c', 10, false);
            s2t.equal(combined, overflow, 'returns the same object (mutated)');
            s2t.deepEqual(combined, { 0: 'a', 1: 'b', 2: 'c' }, 'adds value at next numeric index');
            s2t.end();
        });

        st.test('does not treat plain object with numeric keys as overflow', function (s2t) {
            var plainObj = { 0: 'a', 1: 'b' };
            s2t.notOk(utils.isOverflow(plainObj), 'plain object is not marked as overflow');

            // combine treats this as a regular value, not an overflow object to append to
            var combined = utils.combine(plainObj, 'c', 10, false);
            s2t.deepEqual(combined, [{ 0: 'a', 1: 'b' }, 'c'], 'concatenates as regular values');
            s2t.end();
        });

        st.end();
    });

    t.end();
});
