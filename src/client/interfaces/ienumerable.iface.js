/*
 * pwix:forms/src/client/interfaces/ienumerate.iface.js
 *
 * IEnumerate let a class be enumerated.
 */

import _ from 'lodash';
const assert = require( 'assert' ).strict;
import { DeclareMixin } from '@vestergaard-company/js-mixin';

import { IInstanciationArgs } from '../interfaces/iinstanciation-args.iface.js';

export const IEnumerable = DeclareMixin(( superclass ) => class extends superclass {

    // private data
    #base = null;

    /**
     * @returns {IEnumerable} the instance
     */
    constructor(){
        super( ...arguments );
        return this;
    }

    /**
     * @param {Function} cb the callback function, with prototype "cb( item<Any>, arg<Any> ): Boolean"
     *  must return a falsy value to stop the enumeration
     * @param {Any} arg an argument to be passed to the callback function
     * @returns {Boolean} the return code of the last callback execution
     */
    iEnumerate( cb, arg ){
        let reference = this.#base;
        if( !reference ){
            assert( this instanceof IInstanciationArgs, 'the class is expected to implement IInstanciationArgs' );
            reference = this.iInstanciationArgs();
        }
        let res = null;
        reference.every(( it ) => {
            res = cb( it, arg );
            return res;
        });
        return res;
    }

    /**
     * @param {Function} cb the callback function, with prototype "cb( key<String>, value<Object>, arg<Any> ): Boolean"
     *  must return a falsy value to stop the enumeration
     * @param {Any} arg an argument to be passed to the callback function
     * @returns {Boolean} the return code of the last callback execution
     */
    iEnumerateKeys( cb, arg ){
        let reference = this.#base;
        if( !reference ){
            assert( this instanceof IInstanciationArgs, 'the class is expected to implement IInstanciationArgs' );
            reference = this.iInstanciationArgs()[0];
        }
        assert( reference && _.isObject( reference ), 'expect reference as a plain javascript object' );
        let res = null;
        Object.keys( reference ).every(( it ) => {
            res = cb( it, reference[it], arg );
            return res;
        });
        return res;
    }

    /**
     * @summary while the iEnumerate() above method defaults to iterate on the instanciation args, this method let us change the iteration reference
     * @param {Array|Object} base new iteration reference
     */
    iEnumerableBase( base ){
        this.#base = base;
    }
});
