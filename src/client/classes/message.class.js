/*
 * pwix:forms/src/client/classes/message.class.js
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
import { strict as assert } from 'node:assert';
import mix from '@vestergaard-company/js-mixin';

import { Logger } from 'meteor/pwix:logger';
import { TM } from 'meteor/pwix:typed-message';

import { Base } from './base.class.js';

const logger = Logger.get();

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
     * @constructor
     * @locus Everywhere
     * @param {TypedMessage} tm
     * @param {String} id the emitter ICheckable identifier
     * @returns {Message} this instance
     */
    constructor( tm, id ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Message.Message()', tm, id );
        assert( tm instanceof TM.TypedMessage, 'tm must be a TypedMessage, got '+tm );
        assert( id && _.isString( id ), 'id must be a non-empty string identifier, got '+id );
        super( ...arguments );
        this.#tm = tm;
        this.#id = id;
        this.#epoch = Date.now();
        //logger.debug( this, tm.iTypedMessageLevel(), tm.iTypedMessageMessage());
        return this;
    }

    /**
     * Getter
     * @locus Everywhere
     * @returns {String} the ICheckable identifier
     */
    emitter(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Message.emitter()' );
        return this.#id;
    }

    /**
     * Getter
     * @locus Everywhere
     * @returns {Integer} the epoch time at which the message has been pushed
     */
    epoch(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Message.epoch()' );
        return this.#epoch;
    }

    /**
     * Getter
     * @locus Everywhere
     * @returns {TypedMessage} the TypedMessage
     */
    tm(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Message.tm()' );
        return this.#tm;
    }
}
