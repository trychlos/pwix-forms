/*
 * pwix:forms/src/client/interfaces/icheck-field.iface.js
 *
 * ICheckField interfaces the Checker with the FieldSpec's.
 */

import _ from 'lodash';
const assert = require( 'assert' ).strict;
import { DeclareMixin } from '@vestergaard-company/js-mixin';

import { check } from 'meteor/check';
import { ReactiveVar } from 'meteor/reactive-var';

import '../../common/js/index.js';

import { IFieldSpec } from './ifield-spec.iface.js';

export const ICheckField = DeclareMixin(( superclass ) => class extends superclass {

    // private data

    // private methods

    /**
     * @returns {ICheckField} the instance
     */
    constructor( name, args ){
        _trace( 'ICheckField.ICheckField' );
        super( ...arguments );
        return this;
    }

    /**
     * Getter/Setter
     * @param {IFieldSpec} spec
     * @param {jQuery} $elt
     * @return {Object} the dataset against the given DOM element
     */
    iCkFieldDataset( spec, $elt ){
        _trace( 'ICheckField.iCkFieldDataset', spec );
        check( spec, IFieldSpec );
        let res = null;
        const name = this._getDatasetName();
        if( name ){
            res = $elt.data( name );
            if( !res ){
                $elt.data( name, {
                    spec: spec,
                    //initial: null, // leave undefined
                    value: new ReactiveVar( null ),
                    valid: new ReactiveVar( null ),
                    status: new ReactiveVar( null ),
                    $js: $elt
                });
                res = $elt.data( name );
            }
        }
        return res;
    }

    /**
     * @summary Insert a parent in the DOM to prepare future potential indicator insertions
     * @param {IFieldSpec} spec
     * @param {jQuery} $elt
     */
    iCkFieldInsertParent( spec, $elt ){
        _trace( 'ICheckField.iCkFieldInsertParent', spec );
        check( spec, IFieldSpec );
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
     * @param {IFieldSpec} spec
     * @returns {jQuery} a jQuery object which contains all related elements
     */
    iCkFieldElements( spec ){
        _trace( 'ICheckField.iCkFieldElements', spec );
        check( spec, IFieldSpec );
        let $res = null;
        const selector = spec.iFieldJsSelector();
        if( selector ){
            const $res = this._getInstance().$( selector );
        }
        return $res;
    }

    /**
     * @summary ICheckField initialization
     *  - define an autorun which will enable/disable the OK button depending of the entity validity status
     *  - define an autorun to bubble up the check status
     *  - define an autorun to bubble up the validity result
     */
    iCkFieldInit(){
        _trace( 'ICheckField.iCkFieldInit' );
    }

    /**
     * @summary Field initialization
     */
    iCkFieldInitField( name, spec ){
        _trace( 'ICheckField.iCkFieldInitField', name );
        check( spec, IFieldSpec );
        spec.iCkFieldSetup( spec );
    }

    /**
     * @summary Setup a dataset and a parent DOM to each element managed by this field specification
     * @param {IFieldSpec} spec
     */
    iCkFieldSetup( spec ){
        _trace( 'ICheckField.iCkFieldSetup', spec );
        check( spec, IFieldSpec );
        const $elts = this.iCkFieldElements( spec );
        if( $elts ){
            check( $elts, Array );
            const self = this;
            $elts.forEach(( $elt ) => {
                self.iCkFieldDataset( spec, $elt );
                self.iCkFieldInsertParent( spec, $elt );
            });
        }
    }
});
