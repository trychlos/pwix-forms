/*
 * pwix:forms/src/common/classes/field-spec.class.js
 *
 * The specifications to manage a field in a form panel.
 */

import _ from 'lodash';
const assert = require( 'assert' ).strict; // up to nodejs v16.x
import mix from '@vestergaard-company/js-mixin';

import { Base } from '../../common/classes/base.class.js';

import { ICheckable } from '../../common/interfaces/icheckable.iface.js';
import { IInstanciationArgs } from '../../common/interfaces/iinstanciation-args.iface.js';
import { IStatusable } from '../../common/interfaces/istatusable.iface.js';

import { IFieldSpec } from '../interfaces/ifield-spec.iface.js';

export class FieldSpec extends mix( Base ).with( ICheckable, IInstanciationArgs, IFieldSpec, IStatusable ){

    // static data

    // static methods

    // private data

    // runtime data

    // private methods

    /**
     * Getter/Setter
     * @locus Client
     * @param {Object} arg a new or to-be-merged field specification
     * @param {Boolean} merge whether to merge with the existant (if true) or to replace (if false)
     * @returns {Object} the new field specifications
     *  Note that, as a FieldSpec is initialized with ( name, spec ) arguments, the IInstanciationArgs interface provide these arguments as an array of two members.
     *  We want manage here only the second one (the first being the name)
     */
    _defn( arg, merge=true ){
        let args = this.iInstanciationArgs()[1];
        if( arg !== undefined ){
            if( merge ){
                _.merge( args, arg );
            } else {
                args = arg;
            }
            this.iInstanciationArgs( args, 1 );
        }
        return args;
    }

    // protected methods

    // public data

    /**
     * Constructor
     * @locus Client
     * @summary Instanciates a new FieldSpec instance
     * @param {String} name the field name, must match one of the 'name' key of the collection FieldsSet
     * @param {Object} arg this field specification provided by the application
     * @returns {FieldSpec} this instance
     */
    constructor( name, arg ){
        assert( name && _.isString( name ), 'expect a string' );
        assert( arg && _.isObject( arg ), 'expect a plain javascript Object' );

        super( ...arguments );

        return this;
    }

    /**
     * @returns {String} the field name
     *  Note that, as a FieldSpec is initialized with ( name, spec ) arguments, the IInstanciationArgs interface provide these arguments as an array of two members.
     *  We want manage here only the first one (the second being the specification)
     */
    name(){
        return this.iInstanciationArgs()[0];
    }
}
