/*
 * pwix:forms/src/common/classes/field.class.js
 *
 * A class which addresses each individual field.
 *
 * The field definition must be provided by the application. This is a named object which is meant to be used both:
 * - to declare the collection schema
 * - to define the datatable tabular display
 * - to define the input fields and their respective checks.
 *
 * - the name is the name of the field in the 'checks' object, which means that we expect to have a check_<name> function
 * - the object has following keys:
 *    > children: a hash of sub-fields, for example if the schema is an array
 *   or:
 *    > js: a mandatory jQuery CSS selector for the INPUT/SELECT/TEXTAREA field in the DOM; it must let us address the field and its content
 *    > display: whether the field should be updated to show valid|invalid state, defaulting to true
 *    > valFrom(): a function to get the value from the provided item, defaulting to just getting the field value as `value = item[name]`
 *    > valTo(): a function to set the value into the provided item, defaulting to just setting the field value as item[name] = value
 *    > post: a function to be called after check with the ITypedMessage result of the corresponding 'checks.check_<field>()' function
 */

import _ from 'lodash';
const assert = require( 'assert' ).strict; // up to nodejs v16.x
import mix from '@vestergaard-company/js-mixin';

import { ISchema } from '../interfaces/ischema.iface.js';
import { ITabular } from '../interfaces/itabular.iface.js';

import { Base } from './base.class.js';

export class Field extends mix( Base ).with( ISchema, ITabular ){

    // static data

    // static methods

    // private data

    // instanciation parameters
    #def = null;

    // runtime data

    // private methods

    // protected methods

    // public data

    /**
     * Constructor
     * @locus Everywhere
     * @summary Instanciates a new Field instance
     * @param {Object} o the field definition provided by the application
     * @returns {Field} this Field instance
     */
    constructor( o ){
        assert( o && _.isObject( o ), 'definition must be a plain javascript Object' );

        super( ...arguments );
        const self = this;

        // keep the provided params
        this.#def = o;

        //console.debug( this );
        return this;
    }

    /**
     * @locus Everywhere
     * @returns {Object} the original definition object
     */
    def(){
        return this.#def;
    }

    /**
     * @locus Everywhere
     * @returns {String} the 'field' value, or null if it is not set
     */
    field(){
        return this.#def.field || null;
    }
}
