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
 *  - dom: a CSS selector to address the value itself when 'js' is not enough or too high, or the element is special
 *    defaults to js css selector
 *  - form_valFrom( <item> ): a function to get the value from the provided item, defaulting to just getting the field value as `value = item[name]`
 *  - form_valTo( <item>, <value> ): a function to set the value into the provided item, defaulting to just setting the field value as item[name] = value
 *  - form_formFrom( <$node> ): a function to read the value from the form, defaulting to the 'val()' function
 *  - form_formTo( <$node>, <item> ): a function to write the value into the form, defaulting to the 'val( <value> )' function
 *  - form_check: a check function, or false (warns if unset)
 *  - form_type: the mandatory/optional field type, defaulting to none
 *      ref. Forms.FieldType.C
 *  - form_status: whether the field should be appended with an indicator to show valid|invalid state, defaulting to Checker then configured values
 *      ref. Forms.C.ShowStatus
 *  - form_trace: whether to be verbose for this field, defaulting to false
 */

import _ from 'lodash';
import { strict as assert } from 'node:assert';
import { DeclareMixin } from '@vestergaard-company/js-mixin';

import { Logger } from 'meteor/pwix:logger';

import '../../common/js/index.js';

const logger = Logger.get();

export const IFieldSpec = DeclareMixin(( superclass ) => class extends superclass {

    // private data

    // runtime data

    // whether we have already warned of the lack of a check function
    #warned = false;

    // private methods

    /**
     * @constructor
     * @returns {IFieldSpec} the instance
     */
    constructor( args ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'IFieldSpec.IFieldSpec()', args );
        super( ...arguments );

        if( args.form_trace ) logger.debug( 'IFieldSpec()', args );

        return this;
    }

    /**
     * @returns {Function|null} the check function, or null
     */
    iSpecCheck(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'IFieldSpec.iSpecCheck()' );
        let res = null;
        const defn = this._defn();
        if( defn.form_check && _.isFunction( defn.form_check )){
            res = defn.form_check;
        } else if( defn.form_check !== false && Meteor.isDevelopment && !this.#warned ){
            logger.warn( 'IFieldSpec.iSpecCheck() no check function provided for \''+this.name()+'\'' );
            this.#warned = true;
        }
        return res;
    }

    /**
     * @returns {Boolean} whether this field spec is array-ed
     *  NB: the containing Checker must be instanciated with an 'id()' function when array-ed
     */
    iSpecIsArrayed(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'IFieldSpec.iSpeIsArrayed()' );
        const name = this.name();
        return name.match( /\.\$\./ ) !== null;
    }

    /**
     * @summary This is the way the status should be displayed for this field.
     *  It is only considered if the package is configured for this status be overridable on a per-field basis.
     * @returns {String} a value from Forms.C.ShowStatus, or null
     */
    iSpecStatus(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'IFieldSpec.iSpecStatus()' );
        const defn = this._defn();
        let status = defn.form_status || null;
        if( status && !Object.values( Forms.C.ShowStatus ).includes( status )){
            logger.warn( 'IFieldSpec.iSpecStatus() unexpected form_status', this.name(), status );
            status = null;
        }
        return status;
    }

    /**
     * @returns {Boolean} whether to be verbose for this field, defaulting to false
     */
    iSpecTrace(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'IFieldSpec.iSpecTrace()' );
        const defn = this._defn();
        return defn.form_trace === true;
    }

    /**
     * @returns {String} the type of the field (mandatory/optional/none), or null
     */
    iSpecType(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'IFieldSpec.iSpecType()' );
        const defn = this._defn();
        return defn.form_type || null;
    }

    /**
     * @returns {String} the js css selector, or null
     *  This UI selector is notably used for all UI operations
     *  Notably, status and validity indicators will be set around this UISelector element
     */
    iSpecUISelector(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'IFieldSpec.iSpecUISelector()' );
        const defn = this._defn();
        return defn.js || null;
    }

    /* Maintainer note:
     *  iSpecValueFrom() get the value from the item
        It is used when there is not specific formTo() function (which should be the general case anyway).
     *  Setting (whether reactively or not) the value into the item is the responsability of checkfFn functions
     *  see iRunValueFrom() (resp. iRunValueTo()) get (resp. set) the value from (resp. to) the form
     * 
     *  If the name is an arrayed one ('emails.$.label'), then the provided 'item' is the row. So only consider the last part of the name
     */

    /**
     * @param {Object} item
     * @returns {Any} the value got from the item
     */
    iSpecValueFrom( item ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'IFieldSpec.iSpecValueFrom()' );
        if( this.iSpecTrace()) logger.debug( 'iSpecValueFrom()', this.name(), 'item', item );
        const defn = this._defn();
        let value = null;
        if( defn.form_itemFrom ){
            assert( typeof defn.form_itemFrom === 'function', 'expect form_itemFrom() be a function, found '+defn.form_itemFrom );
            value = defn.form_itemFrom( item );
            if( this.iSpecTrace()) logger.debug( 'iSpecValueFrom()', this.name(), 'defn.form_itemFrom() returns', value );
        } else {
            let name = this.name();
            if( name.match( /\.\$\./ )){
                const w = name.split( '.' );
                name = w[w.length-1];
            }
            value = item[name];
        }
        return value;
    }

    /**
     * @returns {String} the dom css selector, or null
     *  This DOM selector is used for getting from / setting into the value
     *  It defaults to UI selector.
     */
    iSpecDOMSelector(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'IFieldSpec.iSpecDOMSelector()' );
        const defn = this._defn();
        return defn.dom || this.iSpecUISelector();
    }
});
