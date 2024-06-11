/*
 * pwix:forms/src/common/js/functions.js
 */

import _ from 'lodash';

import SimpleSchema from 'meteor/aldeed:simple-schema';

/**
 * @param {Array} fields the fields definitions
 *  - field: the name of the field in the schema, required
 *  - dt_: keys dedicated to Datatable tabular display
 *  - form_: keys dedicated to Forms
 *  Each field definition defaults to be defined in the returned schema, as soon a 'field' name is defined, and unless a 'schema' key is set to false.
 * @returns {SimpleSchema} a new instance to be attached to the collection
 */
Forms.toSchema = function( fields ){
    let o = {};
    fields.every(( it ) => {
        if( it.field && _.isString( it.field ) && it.schema !== false ){
            o[it.field] = {};
            Object.keys( it ).every(( key ) => {
                if( key !== 'field' && !key.startsWith( 'dt_' ) && !key.startsWith( 'form_' )){
                    o[it.field][key] = it[key];
                }
                return true;
            });
        }
        return true;
    });
    return new SimpleSchema( o );
};
