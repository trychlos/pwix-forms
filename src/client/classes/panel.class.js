/*
 * pwix:forms/src/client/classes/panel-spec.class.js
 *
 * Gathers a keyed set of fields specifications for a form panel.
 */

import _ from 'lodash';
const assert = require( 'assert' ).strict; // up to nodejs v16.x
import mix from '@vestergaard-company/js-mixin';

import { Field } from 'meteor/pwix:field';

import { Base } from './base.class.js';
import { FormField } from './form-field.class.js';

import { IEnumerable } from '../interfaces/ienumerable.iface.js';
import { IInstanciationArgs } from '../interfaces/iinstanciation-args.iface.js';
import { IFieldRun } from '../interfaces/ifield-run.iface.js';
import { IFieldSpec } from '../interfaces/ifield-spec.iface.js';

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
     * @param {Object} arg a panel specification as provided by the application
     *  This is a keyed object, where keys are the field names, and values the field specifications for this panel
     * @param {Field.Set} set an optional previously defined Field.Set object which is able to provide default values
     * @returns {Panel} this instance
     */
    constructor( arg, set ){
        assert( arg && _.isObject( arg ), 'expect a plain javascript object' );
        assert( !set || set instanceof Field.Set, 'expect a Field.Set instance' );

        super( ...arguments );
        const self = this;

        // instanciate a FormField object for each field description
        this.#set = {};
        const cb = function( key, value ){
            let defn = value;
            if( set ){
                const spec = set.byName( key );
                if( spec ){
                    defn = _.merge( {}, spec.def(), value );
                    // warn once
                } else if( !Object.keys( self.#warneds ).includes( key )){
                    console.warn( 'unknown name', key, 'ignored' );
                    self.#warneds[key] = true;
                }
            }
            self.#set[key] = new FormField( defn );
            return true;
        };
        this.iEnumerateKeys( cb );

        // setup the new enumeration reference as a keyed object
        this.iEnumerableBase( this.#set );

        //console.debug( this );
        return this;
    }

    /**
     * @param {String} name the searched field name
     * @returns {FormField} the definition for this named field, or null
     */
    byName( name ){
        _trace( 'Panel.byName' );
        let spec = null;
        const cb = function( fieldName, fieldSpec, arg ){
            assert( fieldSpec instanceof IFieldSpec, 'expects an instance of IFieldSpec, got '+fieldSpec );
            assert( fieldSpec instanceof IFieldRun, 'expects an instance of IFieldRun, got '+fieldSpec );
            if( name === fieldName ){
                spec = fieldSpec;
            }
            return spec === null;
        };
        this.iEnumerateKeys( cb );
        return spec;
    }

    /**
     * @returns {Object} an object indexed by field names with field values
     */
    objectData( args=null ){
        _trace( 'Panel.objectData' );
        let result = {};
        const self = this;
        const _iterate = function( name, spec, arg ){
            assert( spec instanceof IFieldSpec, 'expects an instance of IFieldSpec, got '+spec );
            assert( spec instanceof IFieldRun, 'expects an instance of IFieldRun, got '+spec );
            result[name] = spec.iRunValueFrom();
            return true;
        };
        this.iEnumerateKeys( _iterate, args );
        return result;
    }
}
