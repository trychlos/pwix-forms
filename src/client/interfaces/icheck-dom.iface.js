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

import { IFieldSpec } from './ifield-spec.iface.js';

export const ICheckDom = DeclareMixin(( superclass ) => class extends superclass {

    // private data

    /**
     * @returns {ICheckDom} the instance
     */
    constructor( name, args ){
        super( ...arguments );
        return this;
    }

    /**
     * @param {Event} event the jQuery Event
     * @param {IFieldSpec} fieldSpec the field specification
     * @returns {Object} our DOM dataset, may be null
     */
    iDomFromEvent( event, fieldSpec ){
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
     * @summary Set (once) our dataset on the DOM element
     * @param {Object} $elt the jQuery object associated to the DOM element
     * @param {IFieldSpec} fieldSpec the field specification
     */
    iDomSet( $elt, fieldSpec ){
        check( fieldSpec, IFieldSpec );
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
});
