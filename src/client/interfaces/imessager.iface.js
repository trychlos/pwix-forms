/*
 * pwix:forms/src/client/interfaces/imessager.iface.js
 *
 * Provide a simple interface to a stack of messages.
 *
 * Usage:
 * - derive a simple class from TM.MessagesSet
 * - make it implements this interface
 * - provides it at Checker intanciation as the target of error messages.
 *
 * Rationale: Checker doesn't depend of the TM.IStack interface which is a bit too complex for its needs.
 */

import _ from 'lodash';
const assert = require( 'assert' ).strict;
import { DeclareMixin } from '@vestergaard-company/js-mixin';

import { Logger } from 'meteor/pwix:logger';

import '../../common/js/index.js';

const logger = Logger.get();

export const IMessager = DeclareMixin(( superclass ) => class extends superclass {

    // private data

    /**
     * @summary Constructor
     * @returns {IMessager} the instance
     */
    constructor(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'IMessager.IMessager()' );
        super( ...arguments );
        return this;
    }

    // public methods (the contract!)

    /**
     * @summary Ask to clear the message(s) displayed in the message zone
     */
    iMessagerClear(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'IMessager.iMessagerClear()' );
        this._save();
        this._reset();
    }

    /**
     * @summary Ask to clear the message(s) displayed in the message zone
     */
    iMessagerDump(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'IMessager.iMessagerDump()' );
        this._dump();
    }

    /**
     * @returns {TypedMessage} the first pushed TypedMessage in level order
     */
    iMessagerFirst(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'IMessager.iMessagerFirst()' );
        return this._first();
    }

    /**
     * @returns {TypedMessage} the last pushed TypedMessage in level order
     */
    iMessagerLast(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'IMessager.iMessagerLast()' );
        return this._last();
    }

    /**
     * @summary Ask to display a message in the message zone
     * @param {TypedMessage|Array<TypedMessage>} tms
     * @param {String} id the ICheckable identifier
     */
    iMessagerPush( tms, id ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'IMessager.iMessagerPush()', tms, id );
        this._removeById( id );
        this._push( tms, id );
    }

    /**
     * @summary Remove from the stack the messages published by the provided ICheckable's
     * @param {String|Array<String>} ids a list of identifiers
     */
    iMessagerRemove( ids ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'IMessager.iMessagerRemove()', ids );
        this._removeById( ids )
    }
});
