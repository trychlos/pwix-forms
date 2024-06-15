/*
 * pwix:forms/src/common/interfaces/ifield-spec.iface.js
 *
 * IFieldSpec is the interface to let an application's panel defines a field management.
 *
 * This is provided as a plain javascript object, with following keys:
 *  - js: a CSS selector; it is expected to let us address the field and its content
 *  - fieldType: whether the field should be prefixed to show valid|invalid state, defaulting to true
 *  - checkResult: whether the field should be appended with an indicator to show valid|invalid state
 *  - valFrom(): a function to get the value from the provided item, defaulting to just getting the field value as `value = item[name]`
 *  - valTo(): a function to set the value into the provided item, defaulting to just setting the field value as item[name] = value
 *  - post: a function to be called after check with the ITypedMessage result of the corresponding 'checks.check_<field>()' function
 *  - parent: when the field is array-ed, the css selector of the DOM element which maintains the row identifier, defaulting to 'tr'
 */

import _ from 'lodash';
const assert = require( 'assert' ).strict;
import { DeclareMixin } from '@vestergaard-company/js-mixin';

export const IFieldSpec = DeclareMixin(( superclass ) => class extends superclass {

    // private data

    /**
     * @returns {IFieldSpec} the instance
     */
    constructor( name, args ){
        super( ...arguments );
        return this;
    }

    /**
     * @returns {String} the local check function name in the Checker
     */
    iFieldComputeLocalCheckFunctionName(){
        return this.name();
    }

    /**
     * @summary Warns once in DEV environment
     * @returns {Boolean} whether we have a check function
     */
    iFieldHaveCheck(){
        const defn = this._defn();
        const have = defn.check && _.isFunction( defn.check );
        if( !have ){
            Meteor.isDevelopment && console.warn( '[DEV] no check function provided for \''+this.name()+'\'' );
        }
        return have;
    }

    /**
     * @returns {Boolean} whether this field spec is array-ed
     */
    iFieldIsArrayed(){
        const name = this.name();
        return name.match( /\.\$\./ ) !== null;
    }

    /**
     * @returns {String} the js css selector, or null
     */
    iFieldJsSelector(){
        const defn = this._defn();
        return defn.js || null;
    }
});
