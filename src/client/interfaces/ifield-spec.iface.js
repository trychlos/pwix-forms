/*
 * pwix:forms/src/client/interfaces/ifield-spec.iface.js
 *
 * IFieldSpec is the interface to let an application's access the field specifications
 * - either specific to the current panel (say the selector for example)
 * - or inherited from the Field.Def definition
 *
 * FormField specification is provided as a plain javascript object, with following keys:
 *  - js: a CSS selector; it is expected to let us address the field and its content, primarily used to setup the UI indicators
 *    it must be either the INPUT/SELECT element itself, or a parent of this element
 *  - valFrom( <item> ): a function to get the value from the provided item, defaulting to just getting the field value as `value = item[name]`
 *  - valTo( <item>, <value> ): a function to set the value into the provided item, defaulting to just setting the field value as item[name] = value
 *  - formFrom( <$node> ): a function to read the value from the form, defaulting to the 'val()' function
 *  - formTo( <$node>, <item> ): a function to write the value into the form, defaulting to the 'val( <value> )' function
 *  - check: a check function, or false (warns if unset)
 *  - type: the mandatory/optional field type, defaulting to none
 *      ref. Forms.FieldType.C
 *  - status: whether the field should be appended with an indicator to show valid|invalid state, defaulting to Checker then configured values
 *      ref. Forms.C.ShowStatus
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
        } else if( defn.form_check !== false && Meteor.isDevelopment && !this.#warned ){
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
     * @summary This is the way the status should be displayed for this field.
     *  It is only considered if the package is configured for this way be overridable on a per-field basis.
     * @returns {String} a value from Forms.C.ShowStatus, or null
     */
    iSpecStatus(){
        _trace( 'IFieldSpec.iSpecStatus' );
        const defn = this._defn();
        const status = defn.form_status || null;
        if( status && !Object.values( Forms.C.ShowStatus ).includes( status )){
            console.warn( 'pwix:forms unexpected form_status', this.name(), status );
            status = null;
        }
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

    /* Maintainer note:
     *  iSpecValueFrom() get the value from the item
        It is only used if there is not specific formTo() function.
     *  Setting (whether reactively or not) the value into the item is the responsability of checkfFn functions
     *  see iRunValueFrom() (resp. iRunValueTo()) get (resp. set) the value from (resp. to) the form
     */

    /**
     * @param {Object} item
     * @returns {Any} the value got from the item
     */
    iSpecValueFrom( item ){
        _trace( 'IFieldSpec.iSpecValueFrom' );
        const defn = this._defn();
        let value = null;
        if( defn.form_itemFrom ){
            assert( typeof defn.form_itemFrom === 'function', 'expect form_itemFrom() be a function, found '+defn.form_itemFrom );
            value = defn.form_itemFrom( item );
        } else {
            value = item[this.name()];
        }
        //console.debug( 'iSpecValueFrom', this.name(), value );
        return value;
    }
});
