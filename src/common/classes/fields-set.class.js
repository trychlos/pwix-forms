/*
 * pwix:forms/src/common/classes/fields-set.class.js
 *
 * Gathers an ordered set of Fields.
 *
 * Note: it would have been rather logic to have here a 'toForm()' method. But we are here in common code, and we would have to test for 'Meteor.isClient'.
 * This is so the PanelSpec object which handles the form part of this FieldsSet.
 */

import _ from 'lodash';
const assert = require( 'assert' ).strict; // up to nodejs v16.x
import mix from '@vestergaard-company/js-mixin';

import SimpleSchema from 'meteor/aldeed:simple-schema';

import { Base } from './base.class.js';
import { Field } from './field.class.js';

import { IEnumerable } from '../interfaces/ienumerable.iface.js';
import { IInstanciationArgs } from '../interfaces/iinstanciation-args.iface.js';

export class FieldsSet extends mix( Base ).with( IEnumerable, IInstanciationArgs ){

    // static data

    // static methods

    // private data
    #set = null;

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
     *  which happens to be a list of plain javascript objects whom we do not know the count of arguments.
     * @returns {FieldsSet} this FieldsSet instance
     */
    constructor( list ){
        assert( list && _.isObject( list ), 'argument must be an ordered list of plain javascript Object\'s' );

        super( ...arguments );
        const self = this;

        // instanciate a Field object for each field description
        this.#set = [];
        const cb = function( it ){
            self.#set.push( new Field( it ));
            return true;
        };
        this.iEnumerate( cb );

        // setup the new enumeration reference
        this.iEnumerableBase( this.#set );

        //console.debug( this );
        return this;
    }

    /**
     * @locus Everywhere
     * @param {String} name the name of the searched field
     * @returns {Field} the found Field, or null
     *  Note that not all Field's have a 'field' key, so not all these Field's are foundable here
     */
    byName( name ){
        let found = null;
        const cb = function( it, name ){
            if( it.name() === name ){
                found = it;
            }
            return found === null;
        };
        this.iEnumerate( cb, name );
        return found;
    };

    /**
     * @locus Everywhere
     * @returns {SimpleSchema} a new instance to be attached to the collection
     */
    toSchema(){
        let res = {};
        const cb = function( it ){
            if( it.iSchemaParticipate()){
                res[it.iSchemaName()] = it.iSchemaDefinition();
            }
            return true;
        };
        this.iEnumerate( cb );
        return new SimpleSchema( res );
    };

    /**
     * @locus Everywhere
     * @returns {Array<Object>} the list of datatable column definitions
     */
    toTabular(){
        let res = [];
        const cb = function( it ){
            if( it.iTabularParticipate()){
                res.push( it.iTabularDefinition());
            }
            return true;
        };
        this.iEnumerate( cb );
        return res;
    };
}
