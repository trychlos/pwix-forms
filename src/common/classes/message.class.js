/*
 * pwix:forms/src/common/classes/message.class.js
 *
 * Forms wants to be able:
 * - to display the messages relative to the last checked fields
 * - in their level order.
 *
 * To do that, we need:
 * - to keep the order of the pushed messages
 * - to display them in their level order
 * - to remove from the stack the older messages of the to-be-checked field.
 *
 * While the two first sentences are rather common when managing an ordered array, the last one requires to be able to identify our emitter.
 * In Forms, messages emitters are ICheckable instances.
 *
 * Because field-defined check functions return TypedMessage's (or arrays of TypedMessage's), we cannot here derive from TypedMessage.
 * We so compose the Message with a TypedMessage and a ICheckable identifier.
 */

import _ from 'lodash';
const assert = require( 'assert' ).strict; // up to nodejs v16.x
import mix from '@vestergaard-company/js-mixin';

import { TM } from 'meteor/pwix:typed-message';

import { Base } from './base.class.js';

export class Message extends mix( Base ).with(){

    // static data

    // static methods

    // private data
    #tm = null;
    #id = null;
    #epoch = null;

    // runtime data

    // private methods

    // protected methods

    // public data

    /**
     * Constructor
     * @locus Everywhere
     * @param {TypedMessage} tm
     * @param {String} id the emitter ICheckable identifier
     * @returns {Message} this instance
     */
    constructor( tm, id ){
        _trace( 'Message.Message' );
        assert( tm instanceof TM.TypedMessage, 'tm must be a TypedMessage, got '+tm );
        assert( id && _.isString( id ), 'id must be a non-empty string identifier, got '+id );
        super( ...arguments );
        this.#tm = tm;
        this.#id = id;
        this.#epoch = Date.now();
        return this;
    }

    /**
     * Getter
     * @locus Everywhere
     * @returns {String} the ICheckable identifier
     */
    emitter(){
        _trace( 'Message.emitter' );
        return this.#id;
    }

    /**
     * Getter
     * @locus Everywhere
     * @returns {Integer} the epoch time at which the message has been pushed
     */
    epoch(){
        _trace( 'Message.emitter' );
        return this.#id;
    }

    /**
     * Getter
     * @locus Everywhere
     * @returns {TypedMessage} the TypedMessage
     */
    tm(){
        _trace( 'Message.tm' );
        return this.#tm;
    }
}
