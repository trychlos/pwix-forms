/*
 * pwix:forms/src/client/classes/fn-array.class.js
 *
 * Manage named array of functions.
 * 
 * This let us mutualize some code when initializing with a function or an array of functions, and when updating later still with a function or an array of functions.
 * 
 */

import _ from 'lodash';
import mix from '@vestergaard-company/js-mixin';

import { Logger } from 'meteor/pwix:logger';

import { Base } from './base.class.js';

const logger = Logger.get();

export class FnArray extends mix( Base ).with(){

    // static data

    // static methods

    // private data
    #array = [];

    // runtime data

    // private methods

    // protected methods

    // public data

    /**
     * @constructor
     * @locus Client
     * @summary Instanciates a new FnArray instance
     * @returns {FnArray} this instance
     */
    constructor(){
        super( ...arguments );
        return this;
    }

    /**
     * Getter
     * @locus Client
     * @returns {Array<Function>} the array of functions to iterate on
     */
    get(){
        return this.#array;
    }

    /**
     * Setter
     * @locus Client
     * @summary Register new function(s) into the functions array
     * @param {Function|Array<Function>} arg either a function or an array of function
     * @returns {FnArray} this instance
     */
    register( arg ){
        if( !arg || ( !_.isFunction( arg ) && !_.isArray( arg ))){
            logger.error( 'set() expects \'arg\' be a function or an array of functions, got', arg, 'throwing...' );
            throw new Error( 'bad argument: arg' );
        }

        const arg_array = _.isArray( arg ) ? arg : [ arg ];
        this.#array = this.#array.concat( arg_array );

        return this;
    }
}
