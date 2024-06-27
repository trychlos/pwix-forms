/*
 * pwix:forms/src/common/interfaces/ifield-spec.iface.js
 *
 * IFieldSpec is the interface to let an application's access the field specifications
 * - either specific to the current panel (say the selector for example)
 * - or inherited from the Field.Def definition
 *
 * FormField specification is provided as a plain javascript object, with following keys:
 *  - js: a CSS selector; it is expected to let us address the field and its content
 *  - valFrom(): a function to get the value from the provided item, defaulting to just getting the field value as `value = item[name]`
 *  - valTo(): a function to set the value into the provided item, defaulting to just setting the field value as item[name] = value
 *  - type: the mandatory/optional field type
 *  - status: whether the field should be appended with an indicator to show valid|invalid state, defaulting to false
 */

import _ from 'lodash';
const assert = require( 'assert' ).strict;
import { DeclareMixin } from '@vestergaard-company/js-mixin';

import '../../common/js/index.js';

export const IFieldSpec = DeclareMixin(( superclass ) => class extends superclass {

    // private data

    // runtime data

    // whether we have already warned of the lack of a check function
    #warned = false;

    // private methods

    /**
     * @returns {IFieldSpec} the instance
     */
    constructor( name, args ){
        _trace( 'IFieldSpec.IFieldSpec' );
        super( ...arguments );
        return this;
    }

    /**
     * @returns {Function|null} the check function, or null
     */
    iSpecCheck(){
        _trace( 'IFieldSpec.iSpecCheck', this.name());
        let res = null;
        const defn = this._defn();
        if( defn.form_check && _.isFunction( defn.form_check )){
            res = defn.form_check;
        } else if( Meteor.isDevelopment && !this.#warned ){
            console.warn( '[DEV] no check function provided for \''+this.name()+'\'' );
            this.#warned = true;
        }
        return res;
    }

    /**
     * @returns {Boolean} whether this field spec is array-ed
     *  NB: the containing Checker must be instanciated with an 'id()' function when array-ed
     */
    iSpecIsArrayed(){
        _trace( 'IFieldSpec.iSpecIsArrayed' );
        const name = this.name();
        return name.match( /\.\$\./ ) !== null;
    }

    /**
     * @returns {String} the js css selector, or null
     */
    iSpecSelector(){
        _trace( 'IFieldSpec.iSpecSelector' );
        const defn = this._defn();
        return defn.js || null;
    }

    /**
     * @returns {String} whether and how the status should be displayed for this field
     *  No default is provided: without any specification, the checker configuration will apply for all fields
     */
    iSpecStatus(){
        _trace( 'IFieldSpec.iSpecStatus' );
        const defn = this._defn();
        let status = defn.form_status;
        return status;
    }

    /**
     * @returns {String} the type of the field (mandatory/optional/none), or null
     */
    iSpecType(){
        _trace( 'IFieldSpec.iSpecType' );
        const defn = this._defn();
        return defn.form_type || null;
    }

    /**
     * @param {Object} item
     * @returns {Any} the value got from the item
     */
    iSpecValFrom( item ){
        _trace( 'IFieldSpec.iSpecValFrom' );
        const defn = this._defn();
        if( defn.form)
        return defn.form_type || null;
    }
});
