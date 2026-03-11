/*
 * pwix:forms/src/client/classes/panel.class.js
 *
 * Gathers a keyed set of fields specifications for a form panel.
 */

import _ from 'lodash';
import { strict as assert } from 'node:assert'; // up to nodejs v16.x
import mix from '@vestergaard-company/js-mixin';

import { Field } from 'meteor/pwix:field';
import { Logger } from 'meteor/pwix:logger';

import { Base } from './base.class.js';
import { FormField } from './form-field.class.js';

const logger = Logger.get();

export class Panel extends mix( Base ).with(){

    // static data

    // static methods

    // private data

    // the FormField's set
    #set = {};

    // warn only once per field
    #warneds = {};

    // runtime data

    // private methods

    // protected methods

    // public data

    /**
     * @constructor
     * @locus Client
     * @summary Instanciates a new Panel instance
     * @param {Object} arg a panel specification as provided by the application
     *  This is a keyed object, where keys are the field names, and values the field specifications for this panel
     * @param {Field.Set} set an optional previously defined Field.Set object which is able to provide default values
     * @returns {Panel} this instance
     *  NB: we keep none of the provided instanciation args, relying on them to build the Forms.FormField set of data we need
     */
    constructor( arg, set ){
        if( !arg || !_.isObject( arg )){
            logger.error( 'Panel() expects \'arg\' be a plain Javascript Object, got', arg, 'throwing...' );
            throw new Error( 'bad argument: arg' );
        }
        if( set && !( set instanceof Field.Set )){
            logger.error( 'Panel() expects \'set\' be a Field.Set instance when set, got', set, 'throwing...' );
            throw new Error( 'bad argument: set' );
        }

        super( ...arguments );
        const self = this;

        // instanciate a FormField object for each field description
        for( const name of Object.keys( arg )){
            //const res = cb( it.name, it.spec );
            let defn = arg[name];
            if( set ){
                const spec = set.byName( name );
                if( spec ){
                    defn = _.merge( {}, spec.def(), defn );
                    // warn once
                } else if( !Object.keys( self.#warneds ).includes( name )){
                    logger.warn( 'Panel.Panel() unknown name \''+name+'\' ignored' );
                    self.#warneds[name] = true;
                }
            }
            self.#set[name] = new FormField( defn );
        }

        return this;
    }

    /**
     * @param {String} name the searched field name
     * @returns {FormField} the definition for this named field, or null
     */
    byName( name ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Panel.byName()', name );
        if( !name || !_.isString( name )){
            logger.error( 'byName() expects \'name`\' be a non-empty string, got', name, 'throwing...' );
            throw new Error( 'Bad argument: name' );
        }
        return this.#set[name] || null;
    }

    /**
     * @param {Object} arg the instanciation arg (a list of object keyed by field names)
     *  Only used at instanciation time when building the Forms.FormField set of data
     * 
     * @returns {Array} an array of { name: <String>, spec: <Forms.FormField> } sync iterable objects which are the fields specifications of this panel
     * 
     *  This method is first called at Panel instanciation time, when '#set' is still null. It so returns the 'args' field specification { key, value } pairs.
     *  As soon as the '#set' is set, then it is used as a new reference.
     *  As this method is sync, it can be called in for( ...  of ... ) loops (for await is not needed)
     */
    enumerable( arg ){
        const base = arg || this.#set;
        assert( base && _.isObject( base ), 'expect base be a plain javascript object' );
        let res = [];
        Object.keys( base ).forEach(( it ) => {
            res.push({ name: it, spec: base[it] });
        });
        return res;
    }

    /**
     * @returns {Object} with data from the form
     */
    async getForm(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Panel.getForm()' );
        let res = {};
        for( const it of this.enumerable()){
            res[it.name] = await it.spec.iRunValueFrom();
        }
        return res;
    }

    /**
     * @summary Initialize the panel when the Checker is initialized
     */
    async init( checker ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Panel.init()', checker );
        // initialize each field: UI, DOM, event handler
        for( const it of this.enumerable()){
            await it.spec.iFieldRunInit( checker );
        }
        const values = checker.confSetForm();
        if( values ){
            await this.setForm( values );
        }
    }

    /**
     * @returns {Object} an object indexed by field names with field values
     */
    async objectData( args=null ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Panel.objectData()', args );
        let res = {};
        for( const it of this.enumerable()){
            assert( it.spec instanceof FormField, 'expects an instance of FormField, got '+it.spec );
            res[it.name] = await it.spec.iRunValueFrom();
        }
        return res;
    }

    /**
     * @summary initialize the panel with the given data
     * @param {Object} item the values to be installed in the form
     * @param {Object} opts an optional options object
     */
    async setForm( item, opts={} ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Panel.setForm()', item, opts );
        for( const it of this.enumerable()){
            await it.spec.iRunValueTo( item, opts );
        }
    }
}
