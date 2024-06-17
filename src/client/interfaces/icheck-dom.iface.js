/*
 * pwix:forms/src/common/interfaces/icheck-dom.iface.js
 *
 * ICheckDom let us manage the tree of Checker's, from parent ot children (and vice-versa).
 */

import _ from 'lodash';
const assert = require( 'assert' ).strict;
import { DeclareMixin } from '@vestergaard-company/js-mixin';

import { check } from 'meteor/check';
import { ReactiveVar } from 'meteor/reactive-var';

import '../../common/js/index.js';

import { IFieldSpec } from './ifield-spec.iface.js';

export const ICheckDom = DeclareMixin(( superclass ) => class extends superclass {

    // private data

    // private methods

    // install a dataset on each defined dom element
    _initDataset(){
        _trace( 'ICheckDom._initDataset' );
        const self = this;
        const cb = function( name, spec ){
            const selector = spec.iFieldJsSelector();
            if( selector ){
                const $js = instance.$( selector );
                if( $js && $js.length ){
                    self.iDomSet( $js, spec );
                }
            }
            return true;
        }
        const instance = this._getInstance();
        if( instance ){
            this.fieldsIterate( cb );
        }
    }

    // insert a dom parent for each field to later maybe later add type and status indicators
    _initDomParent(){
        _trace( 'ICheckDom._initDomParent' );
        const self = this;
        const cb = function( name, spec ){
            const selector = spec.iFieldJsSelector();
            if( selector ){
                const $js = instance.$( selector );
                if( $js && $js.length ){
                    self.iDomInsertParent( $js, spec );
                }
            }
            return true;
        }
        const instance = this._getInstance();
        if( instance ){
            this.fieldsIterate( cb );
        }
    }

    /**
     * @returns {ICheckDom} the instance
     */
    constructor( name, args ){
        _trace( 'ICheckDom.ICheckDom' );
        super( ...arguments );
        return this;
    }

    /**
     * @param {Event} event the jQuery Event
     * @param {IFieldSpec} fieldSpec the field specification
     * @returns {Object} our DOM dataset, may be null
     */
    iDomFromEvent( event, fieldSpec ){
        _trace( 'ICheckDom.iDomFromEvent' );
        check( fieldSpec, IFieldSpec );
        const instance = this._getInstance();
        const dataset = this._getDatasetName();
        let data = null;
        if( instance && dataset ){
            const $target = instance.$( event.target );
            if( $target && $target.length === 1 ){
                data = $target.data( dataset );
                if( !data ){
                    this.iDomSet( $target, fieldSpec );
                    data = $target.data( dataset );
                }
            }
        }
        return data;
    }

    /**
     * @param {Object} $elt the jQuery object associated to the DOM element
     * @param {IFieldSpec} fieldSpec the field specification
     * @returns {Object} our DOM dataset, may be null
     */
    iDomFromFieldSpec( $elt, fieldSpec ){
        _trace( 'ICheckDom.iDomFromFieldSpec' );
        check( fieldSpec, IFieldSpec );
        const dataset = this._getDatasetName();
        let data = null;
        if( dataset && $elt && $elt.length === 1 ){
            data = $elt.data( dataset );
            if( !data ){
                this.iDomSet( $elt, fieldSpec );
                data = $target.data( dataset );
            }
        }
        return data;
    }

    /**
     * @summary ICheckDom initialization
     *  - install our dataset on each already defined element
     *  - install a parent element to maybe later host type and status indicators
     */
    iDomInit(){
        _trace( 'ICheckDom.iDomInit' );
        this._initDataset();
        this._initDomParent();
    }

    /**
     * @summary Insert a parent before each field
     * @param {Object} $elt the jQuery object associated to the DOM element
     * @param {IFieldSpec} fieldSpec the field specification
     */
    iDomInsertParent( $elt, fieldSpec ){
        _trace( 'ICheckDom.iDomInsertParent' );
        check( fieldSpec, IFieldSpec );
        const parentClass = this._getParentClass();
        if( parentClass ){
            const $parent = $elt.parent();
            assert( $parent && $parent.length, 'unexpected parent not found' );
            if( !$parent.hasClass( parentClass )){
                $elt.wrap( '<div class="'+parentClass+'"></div>' );
            }
        }
    }

    /**
     * @summary Set (once) our dataset on the DOM element
     * @param {Object} $elt the jQuery object associated to the DOM element
     * @param {IFieldSpec} fieldSpec the field specification
     */
    iDomSet( $elt, fieldSpec ){
        _trace( 'ICheckDom.iDomSet' );
        check( fieldSpec, IFieldSpec );
        const dataset = this._getDatasetName();
        if( dataset ){
            $elt.data( dataset, {
                spec: fieldSpec,
                //initial: null, // leave undefined
                value: new ReactiveVar( null ),
                valid: new ReactiveVar( null ),
                status: new ReactiveVar( null ),
                $js: $elt
            });
        }
    }

    /**
     * @summary Field initialization
     */
    iDomInitField( name, spec ){
        _trace( 'ICheckDom.iDomInitField', name );
    }
});
