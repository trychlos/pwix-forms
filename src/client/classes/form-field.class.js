/*
 * /src/client/classes/form-field.class.js
 *
 * A companion class for FormField which addresses each individual field.
 * 
 * The field definition must be provided by the application. This is a named object where:
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

import { check } from 'meteor/check';
import { ReactiveVar } from 'meteor/reactive-var';

import { FormChecker } from './form-checker.class.js';

import { IFieldCheck } from '../interfaces/ifield-check.iface.js';
import { IFieldType } from '../interfaces/ifield-type.iface.js';

import { caBase } from '../../common/classes/base.class.js';

export class FormField extends mix( caBase ).with( IFieldCheck, IFieldType ){

    // static data

    // static methods

    // private data

    // instanciation parameters
    #form = null;
    #defn = null;
    #opts = null;

    // configuration
    #defaultConf = {
    };
    #conf = {};

    // runtime data

    // private methods

    // protected methods

    // public data

    /**
     * Constructor
     * @locus Client
     * @summary Instanciates a new FormField instance
     * @param {FormChecker} form
     * @param {Object} defn
     * @param {Object} opts
     * @returns {FormField} this FormField instance
     */
    constructor( form, defn, opts={} ){
        super( ...arguments );
        const self = this;

        assert( form && form instanceof FormChecker, 'form must be a FormChecker');
        assert( defn && _.isObject( defn ), 'definition must be a plain javascript Object' );
        assert( defn.js && _.isString( defn.js ) && defn.js.length, 'jQuery selector must be a non-empty strng' );
        assert( opts && _.isObject( opts ), 'when set, options must be a plain javascript Object' );

        // keep the provided params
        this.#form = form;
        this.#defn = defn;
        this.#opts = opts;

        // build the configuration
        this.#conf = _.merge( this.#conf, this.#defaultConf, opts );

        // initialize runtime data

        //console.debug( this );
        return this;
    }
}
