/*
 * /imports/common/interfaces/ityped-message.iface.js
 *
 * The ITypedMessage interface provides methods to have a typed message, suitable for example for logs and error messages in a UI.
 * 
 * Partially based on:
 * - https://datatracker.ietf.org/doc/html/rfc5424 Syslog protocol
 * - man 3 syslog
 */

import _ from 'lodash';
const assert = require( 'assert' ).strict;
import { DeclareMixin } from '@vestergaard-company/js-mixin';

import { MessageType } from '../definitions/message-type.def.js';

export const ITypedMessage = DeclareMixin(( superclass ) => class extends superclass {

    // private data

    #emitter = null;
    #type = null;
    #message = null;

    /**
     * @summary Constructor
     * @param {Object|String} args either a message string or an object with following keys:
     *  - emitter {String} the emitter, defaulting to null
     *  - type {String} a key from MessageType.C, defaulting to MessageType.C.LOG
     *  - message {String} the message itself (mandatory)
     * @returns {ITypedMessage}
     */
    constructor( args ){
        super( ...arguments );

        assert( args, 'arguments must be set' );
        if( _.isObject( args )){
            assert( !args.type || Object.keys( MessageType.C ).includes( args.type ), 'type is invalid' );
            assert( args.message && _.isString( args.message ) && args.message.length, 'message must be a non-empty string' );
        } else {
            assert( _.isString( args ) && args.length, 'if not an object, argument must be a non-empty string' );
        }

        this.#emitter = args.emitter || null;
        this.#type = args.type || MessageType.C.LOG;
        this.#message = _.isString( args ) ? args : args.message;

        return this;
    }

    /**
     * @returns {String} the emitter
     */
    ITypedMessageEmitter(){
        return this.#emitter;
    }

    /**
     * @returns {String} the message
     */
    ITypedMessageMessage(){
        return this.#message;
    }

    /**
     * @returns {String} the type
     */
    ITypedMessageType(){
        return this.#type;
    }
});
