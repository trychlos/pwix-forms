/*
 * pwix:forms/src/client/classes/messager.class.js
 *
 * Manage a Message's ordered stack.
 */

import _ from 'lodash';
const assert = require( 'assert' ).strict; // up to nodejs v16.x
import mix from '@vestergaard-company/js-mixin';

import { ReactiveVar } from 'meteor/reactive-var';
import { TM } from 'meteor/pwix:typed-message';
import { Tracker } from 'meteor/tracker';

import { Base } from './base.class.js';
import { Message } from './message.class.js';

import { IMessager } from '../interfaces/imessager.iface.js';

export class Messager extends mix( Base ).with( IMessager ){

    // static data

    // static methods

    // private data

    // runtime data
    #set = new ReactiveVar( [] );
    #saved = [];

    // private methods

    // protected methods
    //  notably used by the IMessager interface

    /*
     * @summary dump the content
     * @param {Object} an optional options object with following keys:
     *  - msg: a prefix message to be added, defaulting to none
     *  - set: the set to be dumped, defaulting to this.#set
     */
    _dump( opts={} ){
        _trace( 'Messager._dump' );
        let i = 0;
        const set = opts.set || this.#set.get();
        let msg = opts.msg || '';
        msg = msg ? '.'+msg : msg;
        set.forEach(( it ) => {
            console.debug( 'dump['+i+'] tm'+msg, it.tm().iTypedMessageLevel(), it.tm(), 'emitter', it.emitter());
            i += 1;
        });
    }

    /*
     * @returns {TypedMessage} the first pushed message in the highest level order
     *  A reactive data source
     */
    _first(){
        _trace( 'Messager._first' );
        //this._dump({ msg: 'before' });
        const set = this._order( this.#set.get());
        const msg = set.length ? set[0].tm() : null;
        //this._dump({ msg: 'after', set: set });
        return msg;
    }

    /*
     * @returns {TypedMessage} the last pushed message in the highest level order
     *  A reactive data source
     */
    _last(){
        _trace( 'Messager._last' );
        const set = this._order( this.#set.get());
        return set.length ? set[set.length-1].tm() : null;
    }

    /*
     * @summary Order the set of message by increasing level order (decreasing severity) and increasing push time
     * @param {Array<Message>} set
     * @returns {Array<Message>} the ordered set
     */
    _order( set ){
        _trace( 'Messager._order', set );
        assert( _.isArray( set ), 'expects an array, got ', set );
        const cmpFn = function( a, b ){
            let res = -1 * a.tm().iTypedMessageCompare( b.tm());
            //console.debug( a.tm().iTypedMessageLevel(), b.tm().iTypedMessageLevel(), res );
            if( res === 0 ){
                const epoch_a = a.epoch();
                const epoch_b = b.epoch();
                res = epoch_a < epoch_b ? -1 : ( epoch_a > epoch_b ? +1 : 0 );
            }
            return res;
        };
        return set.sort( cmpFn );
    }

    /*
     * @summary Push a new TypedMessage
     * @param {TypedMessage|Array<TypedMessage>} tms
     * @param {String} id the ICheckable identifier
     */
    _push( tms, id ){
        _trace( 'Messager._push', id );
        let set = this.#set.get();
        if( tms ){
            if( tms instanceof TM.TypedMessage ){
                tms = [ tms ];
            }
            tms.forEach(( tm ) => {
                assert( tm instanceof TM.TypedMessage, 'expects an instance of TM.TypedMessage, got '+tm );
                //console.debug( '_push', this, tm, id );
                set.push( new Message( tm, id ));
            });
        }
        this.#set.set( set );
    }

    /*
     * @summary Remove listed identifiers from the stack
     * @param {String|Array} ids a list of ICheckable identifiers to be removed
     */
    _removeById( ids ){
        _trace( 'Messager._removeById', ids, this.#set.get());
        ids = _.isArray( ids ) ? ids : [ ids ];
        let newset = [];
        //console.debug( '_removeById before', this.#set.get(), ids );
        this.#set.get().forEach(( it ) => {
            //console.debug( 'examining', it.emitter());
            if( ids.includes( it.emitter())){
                //console.debug( 'removing', this, it );
            } else {
                newset.push( it );
            }
        });
        //console.debug( '_removeById after', newset );
        this.#set.set( newset );
    }

    /*
     * @summary Clears the set of messages
     */
    _reset(){
        _trace( 'Messager._reset' );
        //console.warn( 'reset', this );
        this.#set.set( [] );
    }

    /*
     * @summary Save the set of messages
     */
    _save(){
        _trace( 'Messager._save' );
        this.#saved = this.#set.get();
    }

    // public data

    /**
     * Constructor
     * @locus Client
     * @returns {Messager} this Messager instance
     */
    constructor(){
        _trace( 'Messager.Messager' );
        super( ...arguments );
        const self = this;

        // track the length
        if( false ){
            Tracker.autorun(() => {
                console.debug( 'set.length', self.#set.get().length );
            });
        }

        // track the content
        if( false ){
            Tracker.autorun(() => {
                console.debug( 'set.content' );
                self._dump();
            });
        }

        return this;
    }
}
