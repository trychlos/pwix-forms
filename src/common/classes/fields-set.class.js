/*
 * pwix:forms/src/common/classes/fields-set.class.js
 *
 * Gathers an ordered set of Fields.
 */

import _ from 'lodash';
const assert = require( 'assert' ).strict; // up to nodejs v16.x

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
     * @locus Everywhere
     * @param {String} field the name of the searched field
     * @returns {Field} the found Field, or null
     */
    byField( field ){
        let res = null;
        this.#set.every(( it ) => {
            if( it.field() === field ){
                res = it;
            }
            return res === null;
        });
        return res;
    };

    /**
     * @locus Everywhere
     * @param {Array<String>} fields an array of string field names to be extracted
     * @returns {Array<Field>} the array of Field definitions for the provided names
     */
    slice( fields ){
        let res = [];
        const self = this;
        fields.forEach(( it ) => {
            let field = self.byField( it );
            if( field ){
                res.push( field );
            } else {
                console.warn( it, 'field not known' );
            }
        });
        return res;
    };

    /**
     * @locus Everywhere
     * @param {Object} fields the objects defined to be edited in a form panel
     * @returns {Object} the same population completed with the Field's definitions, suitable for Checker use
     */
    toForm( fields ){
        let res = {};
        const self = this;
        Object.keys( fields ).forEach(( field ) => {
            const f = self.byField( field );
            if( f ){
                res[field] = f.ICheckableDefinition( fields[field] );
            } else {
                console.error( 'field not found in the FieldSet:', field );
            }
        });
        return res;
    };

    /**
     * @locus Everywhere
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
     * @locus Everywhere
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
