/*
 * pwix:forms/src/client/classes/messager.class.js
 *
 * Manage a Message's ordered stack.
 */

import _ from 'lodash';
const assert = require( 'assert' ).strict; // up to nodejs v16.x
import mix from '@vestergaard-company/js-mixin';

import { check } from 'meteor/check';
import { ReactiveVar } from 'meteor/reactive-var';
import { TM } from 'meteor/pwix:typed-message';
import { Tracker } from 'meteor/tracker';

import { Base } from '../../common/classes/base.class.js';
import { Message } from '../../common/classes/message.class.js';

import { IMessager } from '../../common/interfaces/imessager.iface.js';

import '../../common/js/index.js';

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
     */
    _dump(){
        _trace( 'Messager._dump' );
        let i = 0;
        this.#set.get().forEach(( it ) => {
            console.debug( 'dump['+i+'] tm', it.tm());
            console.debug( 'dump['+i+'] emitter', it.emitter());
            i += 1;
        });
    }

    /*
     * @returns {TypedMessage} the last pushed message in the highest level order
     */
    _last(){
        _trace( 'Messager._last' );
        const set = this.#set.get();
        return set.length ? set[set.length-1].tm() : null;
    }

    /*
     * @summary Push a new TypedMessage
     * @param {TypedMessage|Array<TypedMessage>} tms
     * @param {String} id the ICheckable identifier
     */
    _push( tms, id ){
        _trace( 'Messager._push' );
        let set = this.#set.get();
        if( tms ){
            if( tms instanceof TM.TypedMessage ){
                tms = [ tms ];
            }
            tms.forEach(( tm ) => {
                set.push( new Message( tm, id ));
            });
        }
        this.#set.set( set );
    }

    /*
     * @summary Remove listed identifiers from the stack
     * @param {Array} ids a list of ICheckable identifiers to be removed
     */
    _remove( ids ){
        console.debug( 'Messager._remove', ids, this.#set.get());
        let newset = [];
        this.#set.get().forEach(( it ) => {
            if( ids.includes( it.emitter())){
                console.debug( 'removing', it );
            } else {
                newset.push( it );
            }
        });
        this.#set.set( newset );
    }

    /*
     * @summary Clears the set of messages
     */
    _reset(){
        _trace( 'Messager._reset' );
        this.#set.set( [] );
    }

    /*
     * @param {String} id a ICheckable identifier to not restore
     * @summary Save the set of messages, and clears it
     */
    _restoreBut( id ){
        _trace( 'Messager._restoreBut', id );
        if( this.#saved.length ){
            let set = [];
            this.#saved.forEach(( it ) => {
                check( it, Message );
                if( it.emitter() === id ){
                    console.debug( 'ignoring', it );
                } else {
                    set.push( it );
                }
            });
            this.#set.set( set );
            this.#saved = [];
        }
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
                console.debug( 'set.content', self._dump());
            });
        }

        return this;
    }
}
