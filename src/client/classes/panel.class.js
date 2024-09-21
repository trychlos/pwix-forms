/*
 * pwix:forms/src/common/classes/panel-spec.class.js
 *
 * Gathers a keyed set of fields specifications for a form panel.
 */

import _ from 'lodash';
const assert = require( 'assert' ).strict; // up to nodejs v16.x
import mix from '@vestergaard-company/js-mixin';

import { Field } from 'meteor/pwix:field';

import { Base } from '../../common/classes/base.class.js';

import { IEnumerable } from '../../common/interfaces/ienumerable.iface.js';
import { IInstanciationArgs } from '../../common/interfaces/iinstanciation-args.iface.js';

import { FormField } from '../classes/form-field.class.js';

export class Panel extends mix( Base ).with( IEnumerable, IInstanciationArgs ){

    // static data

    // static methods

    // private data

    // the FormField's set
    #set = null
    #warneds = {};

    // runtime data

    // private methods

    /*
     * @locus Client
     * @summary Add to each field specification the informations provided in the FieldsSet
     * @param {FormField.Set} set the FormField.Set defined for this collection
     * @returns {Panel} this instance
     */
    _fromSet( set ){
        const self = this;
        const cb = function( name, spec ){
            const field = set.byName( name );
            if( field ){
                spec._defn( field.toForm());
            }
            return true;
        }
        this.iEnumerateKeys( cb );
        return this;
    }

    // protected methods

    // public data

    /**
     * Constructor
     * @locus Client
     * @summary Instanciates a new Panel instance
     * @param {Object} arg an optional panel specification as provided by the application
     *  This is a keyed object, where keys are the field names, and values the field specifications for this panel
     * @param {Field.Set} set a previously defined Field.Set object
     * @returns {Panel} this instance
     */
    constructor( arg, set ){
        assert( arg && _.isObject( arg ), 'expect a plain javascript object' );
        assert( set && set instanceof Field.Set, 'expect a Field.Set instance' );

        super( ...arguments );
        const self = this;

        // instanciate a FormField object for each field description
        this.#set = {};
        const cb = function( key, value ){
            const field = set.byName( key );
            if( field ){
                const defn = field._defn();
                _.merge( defn, value );
                self.#set[key] = new FormField( defn );

            // warn once
            } else if( !Object.keys( self.#warneds ).includes( key )){
                console.warn( 'unknown name', key, 'ignored' );
                self.#warneds[key] = true;
            }
            return true;
        };
        this.iEnumerateKeys( cb );

        // setup the new enumeration reference as a keyed object
        this.iEnumerableBase( this.#set );

        //console.debug( this );
        return this;
    }
}
