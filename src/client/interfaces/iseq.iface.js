/*
 * pwix:forms/src/client/interfaces/iseq.iface.js
 *
 * ISeq provides each implementor class a way to have a sequential number on each instance.
 * This is a debugging tool.
 */

import _ from 'lodash';
import { strict as assert } from 'node:assert';
import { DeclareMixin } from '@vestergaard-company/js-mixin';

import { Logger } from 'meteor/pwix:logger';
import { Random } from 'meteor/random';
import { ReactiveVar } from 'meteor/reactive-var';
import { TM } from 'meteor/pwix:typed-message';

const logger = Logger.get();
const ISeqDict = {};

export const ISeq = DeclareMixin(( superclass ) => class extends superclass {

    // static data

    // private data
    // the sequential number of this instance
    #seq = 0;

    // arguments at instanciation time

    /**
     * @constructor
     * @returns {ISeq} the instance
     */
    constructor(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'ISeq.ISeq()' );
        super( ...arguments );
        return this;
    }

    /**
     * @summary allocate a new sequential number for this instance
     * @param {String} className the calling class
     * @returns {Number} the allocated sequential number
     */
    iSeqAllocate( className ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'ISeq.iSeqAllocate()' );
        ISeqDict[className] = ISeqDict[className] || 0;
        ISeqDict[className] += 1;
        this.#seq = ISeqDict[className];
        return this.iSeq();
    }

    /**
     * @returns {Number} the sequential number of this instance
     */
    iSeq(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'ISeq.iSeq()' );
        return this.#seq;
    }
});
