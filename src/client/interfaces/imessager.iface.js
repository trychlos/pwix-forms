/*
 * pwix:forms/src/client/interfaces/imessager.iface.js
 *
 * Provide a simple interface to a stack of messages.
 *
 * Usage:
 * - derive a simple class from Base
 * - make it implements this interface
 * - provides it at Checker initialization as the target of error messages.
 *
 * Rationale: Checker doesn't depend of the TM.IStack interface which is a bit too complex for its needs.
 * 
 * Note: this interface is full SYNC (no x function here).
 */

import _ from 'lodash';
import { strict as assert } from 'node:assert';
import { DeclareMixin } from '@vestergaard-company/js-mixin';

import { Logger } from 'meteor/pwix:logger';
import { TM } from 'meteor/pwix:typed-message';

import '../../common/js/index.js';

import { Message } from '../classes/message.class.js';

import { ICheckable } from './icheckable.iface.js';

const logger = Logger.get();

export const IMessager = DeclareMixin(( superclass ) => class extends superclass {

    // private data

    // methods which MUST be overriden by the implementation class
    //  a stack getter / setter
    //  the immplementation class can choose the implementation its wants as long IMessager interface can get and an array of objects
    _imessager_stack_get(){
        logger.warning( 'IMessager._imessager_stack_get() this method must be overriden by the implementation class' );
        return [];
    }
    _imessager_stack_set( array ){
        logger.warning( 'IMessager._imessager_stack_set() this method must be overriden by the implementation class' );
    }

    // methods which can be overriden by the implementation class

    // clear the messages zone
    //  which actually means just empty the stack
    _imessager_clear(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'IMessager._imessager_clear()', opts );
        this._messager_empty_stack();
    }

    // dump the current state of the stack
    // @param {Object} an optional options object with following keys:
    //  - msg: a prefix message to be added, defaulting to none
    //  - set: the set to be dumped, defaulting to the immplementation stack
    _imessager_dump( opts={} ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'IMessager._imessager_dump()', opts );
        const stack = opts.set || this._imessager_stack_get() || [];
        let i = 0;
        for( const it of stack ){
            this._imessager_dump_it( it, i, stack.length, opts );
            i += 1;
        }
    }

    // dump the current state of the stack
    // @param {Object} it the current item to be dumped
    // @param {Integer} i the current index
    // @param {Object} an optional options object with following keys:
    //  - msg: a prefix message to be added, defaulting to none
    //  - set: the set to be dumped, defaulting to the immplementation stack
    _imessager_dump_it( it, i, size, opts ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'IMessager._imessager_dump_it()', opts );
        let msg = opts.msg || '';
        msg = msg ? '.'+msg : msg;
        logger.debug( 'dump() iSeq='+this.iSeq(), '['+i+'/'+size+']: tm'+msg, it.tm().iTypedMessageLevel(), it.tm(), 'emitter', it.emitter(), ICheckable.byId( it.emitter()));
    }

    // empty the stack
    _imessager_empty_stack(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'IMessager._imessager_empty_stack()', opts );
        this._imessager_stack_set( [] );
    }

    // @returns {TypedMessage} the first pushed TypedMessage in level order
    //  both the greater level (lesser severity) and the last pushed
    _imessager_first(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'IMessager._imessager_first()' );
        const stack = this._imessager_order( this._imessager_stack_get() || [] );
        const msg = stack.length ? stack[0].tm() : null;
        //logger.debug( '_imessager_first()', stack.length, msg );
        return msg;
    }

    // @returns {Array<TypedMessage>} the current list of registered typed messages
    _imessager_get_tms(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'IMessager._imessager_get_tms()' );
        const stack = this._imessager_stack_get() || [];
        let tms = [];
        for( const it of stack ){
            tms.push( it.tm());
        }
        return tms;
    }

    // @returns {TypedMessage} the last pushed TypedMessage in level order
    _imessager_last(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'IMessager._imessager_last()' );
        const stack = this._imessager_order( this._imessager_stack_get() || [] );
        const msg = stack.length ? stack[stack.length-1].tm() : null;
        //logger.debug( '_imessager_last()', stack.length, msg );
        return msg;
    }

    // @summary Order the set of message by decreasing level order (decreasing severity) and decreasing push time
    //  According to ITypedMessage interface: "we so have EMERG > ALERT > CRIT > ERR > WARNING > NOTICE > INFO > DEBUG"
    //  and for each level, order from the most recent to the oldest
    //  the last one being so both the less important to show and the oldest one.
    // @param {Array<Message>} set
    // @returns {Array<Message>} the ordered set
    _imessager_order( set ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'IMessager._imessager_order()', set );
        assert( _.isArray( set ), 'expects an array, got ', set );
        const cmpFn = function( a, b ){
            let res = -1 * a.tm().iTypedMessageCompare( b.tm());
            if( res === 0 ){
                const epoch_a = a.epoch();
                const epoch_b = b.epoch();
                res = epoch_a < epoch_b ? +1 : ( epoch_a > epoch_b ? -1 : 0 );
            }
            return res;
        };
        set = set.sort( cmpFn );
        //logger.debug( '_imessager_order()', set );
        return set;
    }

    // @summary Ask to display a message in the message zone
    //  the message is here just stacked after having made sure that other messages of the same origin have been removed
    // @param {TypedMessage|Array<TypedMessage>} tms
    // @param {String} id the ICheckable identifier
    _imessager_push( tms, id ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'IMessager._imessager_push()', tms, id );
        this._imessager_remove_by_ids( id );
        this._imessager_push_tms( tms, id );
    }

    // @summary Push a new TypedMessage
    // @param {TypedMessage|Array<TypedMessage>} tms
    // @param {String} id the ICheckable identifier
    _imessager_push_tms( tms, id ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'IMessager._imessager_push_tms()', id );
        const stack = this._imessager_stack_get() || [];
        if( tms ){
            if( tms instanceof TM.TypedMessage ){
                tms = [ tms ];
            }
            tms.forEach(( tm ) => {
                assert( tm instanceof TM.TypedMessage, 'expects an instance of TM.TypedMessage, got '+tm );
                //logger.debug( 'pushing', tm, id )
                stack.push( new Message( tm, id ));
            });
        }
        this._imessager_stack_set( stack );
    }

    // @summary Remove listed emitters from the stack
    // @param {String|Array} ids a list of ICheckable identifiers to be removed
    _imessager_remove_by_ids( ids ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'IMessager._imessager_remove_by_id()', ids );
        ids = _.isArray( ids ) ? ids : [ ids ];
        let newset = [];
        for( const it of ( this._imessager_stack_get() || [] )){
            if( ids.includes( it.emitter())){
                //logger.warning( 'removing', this, it, it.tm());
            } else {
                newset.push( it );
            }
        }
        this._imessager_stack_set( newset );
    }

    // returns the size of the stack
    _imessager_size(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'IMessager._imessager_size()' );
        return ( this._imessager_stack_get() || [] ).length;
    }

    /**
     * @constructor
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
        this._imessager_clear();
    }

    /**
     * @summary Ask to dump the stacked message(s)
     * @param {Object} an optional options object with following keys:
     *  - msg: a prefix message to be added, defaulting to none
     *  - set: the set to be dumped, defaulting to the immplementation stack
     */
    iMessagerDump( opts={} ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'IMessager.iMessagerDump()' );
        this._imessager_dump( opts );
    }

    /**
     * @returns {TypedMessage} the first pushed TypedMessage in level order
     *  both the greater level (lesser severity) and the last pushed
     */
    iMessagerFirst(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'IMessager.iMessagerFirst()' );
        return this._imessager_first();
    }

    /**
     * @returns {Array<TypedMessage>} the current list of registered typed messages
     */
    iMessagerGetTMs(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'IMessager.iMessagerGetTMs()' );
        return this._imessager_get_tms();
    }

    /**
     * @returns {TypedMessage} the last pushed TypedMessage in level order
     */
    iMessagerLast(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'IMessager.iMessagerLast()' );
        return this._imessager_last();
    }

    /**
     * @summary Ask to display a message in the message zone
     * @param {TypedMessage|Array<TypedMessage>} tms
     * @param {String} id the ICheckable identifier
     */
    iMessagerPush( tms, id ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'IMessager.iMessagerPush()', tms, id );
        this._imessager_push( tms, id );
    }

    /**
     * @summary Remove from the stack the messages published by the provided ICheckable's
     * @param {String|Array<String>} ids a list of identifiers
     */
    iMessagerRemove( ids ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'IMessager.iMessagerRemove()', ids );
        this._imessager_remove_by_ids( ids );
    }

    /**
     * @returns {Integer} the size of the Imessager stack
     */
    iMessagerSize(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'IMessager.iMessagerSize()' );
        return this._imessager_size();
    }
});
