/*
 * pwix:forms/src/client/classes/messager.class.js
 *
 * Manage a Message's ordered stack.
 * Most of the management is actually done by the IMessager interface that we implement here.
 */

import _ from 'lodash';
import { strict as assert } from 'node:assert';
import mix from '@vestergaard-company/js-mixin';

import { Logger } from 'meteor/pwix:logger';
import { ReactiveVar } from 'meteor/reactive-var';
import { Tracker } from 'meteor/tracker';

import { Base } from './base.class.js';

import { IMessager } from '../interfaces/imessager.iface.js';
import { ISeq } from '../interfaces/iseq.iface.js';

const logger = Logger.get();

export class Messager extends mix( Base ).with( IMessager, ISeq ){

    // static data

    // static methods

    // private data

    #stack = new ReactiveVar( [] );

    // runtime data

    // interfaces methods

    // methods which MUST be overriden by the implementation class
    //  a stack getter / setter
    //  the immplementation class can choose the implementation its wants as long the IMessager interface can get and set an array of objects
    _imessager_stack_get(){
        return this.#stack.get();
    }
    _imessager_stack_set( array ){
        this.#stack.set( array );
    }

    // private methods

    // protected data

    // protected methods

    // public data

    /**
     * @constructor
     * @locus Client
     * @returns {Messager} this Messager instance
     */
    constructor(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Messager.Messager()' );
        super( ...arguments );
        const self = this;

        this.iSeqAllocate( 'Messager' );

        // track the length
        if( false ){
            Tracker.autorun(() => {
                logger.debug( 'set.length', self.#stack.get().length );
            });
        }

        // track the content
        if( false ){
            Tracker.autorun(() => {
                logger.debug( 'stack content' );
                self.iMessagerDump();
            });
        }

        return this;
    }
}
