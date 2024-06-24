/*
 * pwix:forms/src/common/interfaces/imessager.iface.js
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

import '../../common/js/index.js';

export const IMessager = DeclareMixin(( superclass ) => class extends superclass {

    // private data

    /**
     * @summary Constructor
     * @returns {IMessager} the instance
     */
    constructor(){
        _trace( 'IMessager.IMessager' );
        super( ...arguments );
        return this;
    }

    // public methods (the contract!)

    /**
     * @summary Ask to clear the message(s) displayed in the message zone
     */
    iMessagerClear(){
        _trace( 'IMessager.iMessagerClear' );
        this._save();
        this._reset();
    }

    /**
     * @summary Ask to clear the message(s) displayed in the message zone
     */
    iMessagerDump(){
        _trace( 'IMessager.iMessagerDump' );
        this._dump();
    }

    /**
     * @returns {TypedMessage} the last pushed TypedMessage in level order
     */
    iMessagerLast(){
        _trace( 'IMessager.iMessagerLast' );
        return this._last();
    }

    /**
     * @summary Ask to display a message in the message zone
     * @param {TypedMessage|Array<TypedMessage>} tms
     * @param {String} id the ICheckable identifier
     */
    iMessagerPush( tms, id ){
        _trace( 'IMessager.iMessagerPush', tms, id );
        this._restoreBut( id );
        this._push( tms, id );
    }

    /**
     * @summary Remove from the stack the messages published by the provided ICheckable's
     * @param {String|Array<String>} ids a list of identifiers
     */
    iMessagerRemove( ids ){
        _trace( 'IMessager.iMessagerRemove', ids );
        this._remove( ids )
    }
});
