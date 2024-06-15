/*
 * pwix:forms/src/common/interfaces/iinstanciation-args.iface.js
 *
 * IInstanciationArgs let a class provides its instanciation arguments to the caller.
 */

import _ from 'lodash';
const assert = require( 'assert' ).strict;
import { DeclareMixin } from '@vestergaard-company/js-mixin';

export const IInstanciationArgs = DeclareMixin(( superclass ) => class extends superclass {

    // private data

    // instanciation arguments
    #args = null;

    /**
     * @returns {IInstanciationArgs} the instance
     */
    constructor(){
        super( ...arguments );
        this.#args = [ ...arguments ];
        return this;
    }

    /**
     * Getter/Setter
     * @param {Any} arg the new value of the argument to be set
     * @param {Integer} idx the index in the array
     * @returns {Array} the instanciation arguments
     */
    iInstanciationArgs( arg, idx=0 ){
        if( arg !== undefined ){
            this.#args[idx] = arg;
        }
        return this.#args;
    }
});
