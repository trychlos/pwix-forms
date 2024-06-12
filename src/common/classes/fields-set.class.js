/*
 * pwix:forms/src/common/classes/fields-set.class.js
 *
 * Gathers an ordered set of Fields.
 */

import _ from 'lodash';
const assert = require( 'assert' ).strict; // up to nodejs v16.x

//import { check } from 'meteor/check';
//import { ReactiveVar } from 'meteor/reactive-var';
//import { FormChecker } from './form-checker.class.js';
//import { IFieldCheck } from '../interfaces/ifield-check.iface.js';
//import { IFieldType } from '../interfaces/ifield-type.iface.js';

import SimpleSchema from 'meteor/aldeed:simple-schema';

import { Base } from './base.class.js';
import { Field } from './field.class.js';

export class FieldsSet extends Base {

    // static data

    // static methods

    // private data
    #set = null;

    // instanciation parameters
    #list = null;

    // runtime data

    // private methods

    // protected methods

    // public data

    /**
     * Constructor
     * @locus Everywhere
     * @summary Instanciates a new FieldsSet instance
     * @param {List<Object>} list a list of field definitions
     *  The constructor is expected to be called as `new FieldsSet( {def_1}, { def_2 }, { def_3 }, ... );`
     *  Here we so have an object as: { '0': { def_1 }, '1': { def_2 }, '2': { def_3 }, ... }
     *  We have to respect the order of provided definitions, so order on the numeric keys
     * @returns {FieldsSet} this FieldsSet instance
     */
    constructor( list ){
        assert( list && _.isObject( list ), 'argument must be an ordered list of plain javascript Object\'s' );

        super( ...arguments );
        const self = this;

        // keep the provided params
        this.#list = [ ...arguments ];

        // initialize runtime data
        this.#set = [];
        this.#list.forEach(( it ) => {
            this.#set.push( new Field( it ));
        });

        //console.debug( this );
        return this;
    }

    /**
     * @returns {SimpleSchema} a new instance to be attached to the collection
     */
    toSchema(){
        let res = {};
        this.#set.forEach(( field ) => {
            if( field.ISchemaParticipate()){
                res[field.ISchemaName()] = field.ISchemaDefinition();
            }
        });
        return new SimpleSchema( res );
    };

    /**
     * @returns {Array<Object>} the list of datatable column definitions
     */
    toTabular(){
        let res = [];
        this.#set.forEach(( field ) => {
            if( field.ITabularParticipate()){
                res.push( field.ITabularDefinition());
            }
        });
        return res;
    };
}
