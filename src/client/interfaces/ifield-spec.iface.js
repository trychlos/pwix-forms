/*
 * pwix:forms/src/common/interfaces/ifield-spec.iface.js
 *
 * IFieldSpec is the interface to let an application's panel defines a field management.
 *
 * Field specification is provided as a plain javascript object, with following keys:
 *  - js: a CSS selector; it is expected to let us address the field and its content
 *  - valFrom(): a function to get the value from the provided item, defaulting to just getting the field value as `value = item[name]`
 *  - valTo(): a function to set the value into the provided item, defaulting to just setting the field value as item[name] = value
 *  - type: the mandatory/optional field type
 *  - status: whether the field should be appended with an indicator to show valid|invalid state, defaulting to false
 */

import _ from 'lodash';
const assert = require( 'assert' ).strict;
import { DeclareMixin } from '@vestergaard-company/js-mixin';

import { check } from 'meteor/check';
import { UIU } from 'meteor/pwix:ui-utils';

import '../../common/js/index.js';

import '../components/FormsFieldTypeIndicator/FormsFieldTypeIndicator.js';

import { Checker } from '../classes/checker.class.js';

export const IFieldSpec = DeclareMixin(( superclass ) => class extends superclass {

    // private data

    // runtime data

    // the attached Checker
    #checker = null;

    // dynamically rendered Blaze views
    #views = [];

    // private methods

    /*
     * @summary Add a fieldtype indicator before the field if it is defined
     */
    _initPrefixType(){
        _trace( 'IFieldSpec._initPrefixType' );
        const type = this.iFieldType();
        if( type ){
            const data = {
                type: type
            };
            const $node = this._jqNode();
            const parentNode = $node.closest( '.'+this.rtChecker().confParentClass())[0];
            this.#views.push( Blaze.renderWithData( Template.FormsFieldTypeIndicator, data, parentNode, $node[0] ));
        }
    }

    /*
     * @summary Add a CheckStatus indicator after the field if it is defined
     */
    _initSuffixStatus(){
        _trace( 'IFieldSpec._initSuffixStatus' );
        const status = this.iFieldStatus();
        if( status ){
        }
    }

    /*
     * @summary Insert a parent in the DOM to prepare future potential indicator insertions
     * @returns {Promise} which will resolve when the parent is actually present in the DOM, or null
     */
    _initWrapParent(){
        _trace( 'IFieldSpec._initWrapParent' );
        const checker = this.rtChecker();
        const parentClass = checker.confParentClass();
        const $node = this._jqNode();
        let res = null;
        if( parentClass && $node && $node.length ){
            const $parent = $node.parent();
            assert( $parent && $parent.length, 'unexpected parent not found' );
            if( !$parent.hasClass( parentClass )){
                $node.wrap( '<div class="'+parentClass+'"></div>' );
                const waitedSelector = '.'+parentClass+' '+this.iFieldSelector();
                res = UIU.DOM.waitFor( waitedSelector ).then(() => {
                    console.debug( 'got waitedSelector', waitedSelector );
                });
            }
        }
        return res;
    }

    /*
     * @returns {jQuery} the jQuery object which represent this node in this Checker
     */
    _jqNode(){
        _trace( 'IFieldSpec.jqNode' );
        const checker = this.rtChecker();
        const instance = checker.argInstance();
        const selector = this.iFieldSelector();
        return instance.$( selector );
    }

    /**
     * @returns {IFieldSpec} the instance
     */
    constructor( name, args ){
        _trace( 'IFieldSpec.IFieldSpec' );
        super( ...arguments );
        return this;
    }

    /**
     * @returns {Promise} which eventually resolves to true|false validity status for this field
     */
    async checkerCheck(){
        _trace( 'ICheckField.iCkFieldCheck' );
        console.debug( 'IFieldSpec.checkerCheck', this.name());
        let res = false;

        // clear the visual indicators (bs classes and check status if any)
        //this.iCkFieldStatusClear( dataset, spec, $elt );

        // reset the status for this field (as we are async, sooner is better)
        // get the value from the form
        //const value = this.iCkFieldValueFrom( $elt );
        //dataset.keyed[spec.name()].value.set( value );

        // do not risk to trigger an autorun as that would be a false positive
        //dataset.keyed[spec.name()].result.set( null );

        // call the field-defined check function which returns a Promise which resolve to null or a TypedMessage or an array of TypedMessage
        // make sure we have only null or an array of TypedMessage's
        const self = this;
        /*
        return spec.iFieldCheck( value, this.confData(), { id: dataset.id }).then(( res ) => {
            if( res && res instanceof TM.TypedMessage ){
                res = [ res ];
            }
            dataset.keyed[spec.name()].result.set( res );
            return self.iCkFieldStatusUpdate( dataset, spec, $elt );
        });
        */
    }

    /**
     * @summary Initialize the runtime data at Checker instanciation
     * @param {Checker} checker
     */
    checkerInit( checker ){
        _trace( 'IFieldSpec.checkerInit' );
        check( checker, Checker );
        this.#checker = checker;
        const promise = this._initWrapParent();
        if( promise ){
            const self = this;
            promise.then(() => {
                self._initPrefixType();
                self._initSuffixStatus()
            });
        }
    }

    /**
     * @summary Input handler
     */
    checkerInputHandler(){
        _trace( 'IFieldSpec.checkerInputHandler' );
        this.checkerCheck();
    }

    /**
     * @summary calls the field-defined check function (if any)
     * @param {Any} value the value to be checked
     * @param {Any} data the optional data passed at Checker instanciation
     * @param {Any} opts some behaviour options
     * @returns {Promise} a TypedMessage or an array of TypedMessage's or null
     */
    async iFieldCheck( value, data, opts ){
        _trace( 'IFieldSpec.iFieldCheck' );
        const defn = this._defn();
        if( defn.check && _.isFunction( defn.check )){
            return await defn.check( value, data, opts );
        }
        return null;
    }

    /**
     * @summary Warns once in DEV environment
     * @returns {Boolean} whether we have a check function
     */
    iFieldHaveCheck(){
        _trace( 'IFieldSpec.iFieldHaveCheck' );
        const defn = this._defn();
        const have = defn.check && _.isFunction( defn.check );
        if( !have ){
            Meteor.isDevelopment && console.warn( '[DEV] no check function provided for \''+this.name()+'\'' );
        }
        return have;
    }

    /**
     * @returns {Boolean} whether this field spec is array-ed
     *  NB: the containing Checker must be instanciated with an 'id()' function when array-ed
     */
    iFieldIsArrayed(){
        _trace( 'IFieldSpec.iFieldIsArrayed' );
        const name = this.name();
        return name.match( /\.\$\./ ) !== null;
    }

    /**
     * @returns {String} the js css selector, or null
     */
    iFieldSelector(){
        _trace( 'IFieldSpec.iFieldSelector' );
        const defn = this._defn();
        return defn.js || null;
    }

    /**
     * @returns {Boolean} whether a CheckStatus indicator should be appended to the field input, defaulting to false
     */
    iFieldStatus(){
        _trace( 'IFieldSpec.iFieldStatus' );
        const defn = this._defn();
        let b = defn.status;
        if( b !== true && b !== false ){
            b = false;
        }
        return b;
    }

    /**
     * @returns {String} the type of the field (mandatory/optional/none), or null
     */
    iFieldType(){
        _trace( 'IFieldSpec.iFieldType' );
        const defn = this._defn();
        return defn.type || null;
    }

    // the attached checker
    rtChecker(){
        const checker = this.#checker;
        assert( !checker || checker instanceof Checker, 'when set, checker must be an instance of Checker' );
        return checker;
    }
});
