/*
 * /imports/client/interfaces/imessager.iface.js
 *
 * Provide to Checker a simple interface to IStack to manage messages.
 *
 * Usage:
 * - derive a simple class from TM.MessagesSet
 * - make it implements this interface
 * - provides it at Checker intanciation as the target of error messages.
 *
 * Rationale: Checker doesn't depend of the TM.IStack interface which is much too complex for its needs.
 */

import _ from 'lodash';
const assert = require( 'assert' ).strict;
import { DeclareMixin } from '@vestergaard-company/js-mixin';

export const IMessager = DeclareMixin(( superclass ) => class extends superclass {

    // private data

    /**
     * @summary Constructor
     * @returns {IMessager} the instance
     */
    constructor(){
        super( ...arguments );
        return this;
    }

    // public methods (the contract!)

    /**
     * @summary Ask to clear the message(s) displayed in the message zone
     */
    iMessagerClear(){
        console.debug( 'iMessagerClear' );
        this.iStackClear();
    }

    /**
     * @summary Ask to display a message in the message zone
     * @param {Any} message
     */
    iMessagerPush( message ){
        console.debug( message );
        this.iStackPush( message );
    }
});
