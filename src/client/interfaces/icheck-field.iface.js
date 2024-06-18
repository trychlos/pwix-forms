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
import { TM } from 'meteor/pwix:typed-message';
import { UIU } from 'meteor/pwix:ui-utils';

import '../../common/js/index.js';

import { CheckStatus } from '../../common/definitions/check-status.def.js'
import { FieldType } from '../../common/definitions/field-type.def.js'

import '../components/FormsFieldTypeIndicator/FormsFieldTypeIndicator.js';

import { IFieldSpec } from './ifield-spec.iface.js';

export const ICheckField = DeclareMixin(( superclass ) => class extends superclass {

    // private data

    // Remind that we can have, at the panel level, either a single form, on an array of forms
    // we maintain here an array of forms, coupled with the DOM, where each item represents a single form/instance/row of the panel, with:
    // - id: the row identifier, or null when have a single form
    // - keyed: an object keyed by FieldSpec name (happens to be the Field name in a Field definition)
    //   where values are themselves objects with following keys:
    //   > spec: the field spec
    //   > value: the value from the DOM as a ReactiveVar which contains a string or null
    //   > result: the last check result as a ReactiveVar which contains an array of TypedMessage of null
    //   > valid: the true|false validity status of the field as a ReactiveVar
    //   > status: the CheckStatus indicator of the field as a ReactiveVar
    // - valid: the true|false validity of the form as a ReactiveVar
    // - status: the consolidated status value (invalid/uncomplete/valid/none) of the form as a ReactiveVar
    #formsData = [];

    // dynamically rendered Blaze views
    #views = [];

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
     * @param {IFieldSpec} spec
     * @param {jQuery} $elt
     * @param {Object} dataset optional
     * @returns {Promise} which eventually resolves to true|false validity status for this field
     */
    async iCkFieldCheck( spec, $elt, dataset ){
        _trace( 'ICheckField.iCkFieldCheck', spec );
        console.debug( 'iCkFieldCheck', spec.name());
        check( spec, IFieldSpec );
        let res = false;
        if( !dataset ){
            const id = this.iCkFieldId( spec, $elt );
            dataset = this.iCkFieldFormDataset( id );
        }
        assert( dataset, 'should have a dataset here' );
        // clear the visual indicators (bs classes and check status if any)
        this.iCkFieldStatusClear( dataset, spec, $elt );
        // reset the status for this field (as we are async, sooner is better)
        // get the value from the form
        const value = this.iCkFieldValueFrom( $elt );
        dataset.keyed[spec.name()].value.set( value );
        // do not risk to trigger an autorun as that would be a false positive
        //dataset.keyed[spec.name()].result.set( null );
        // call the field-defined check function which returns a Promise which resolve to null or a TypedMessage or an array of TypedMessage
        // make sure we have only null or an array of TypedMessage's
        const self = this;
        return spec.iFieldCheck( value, this._getData(), { id: dataset.id }).then(( res ) => {
            if( res && res instanceof TM.TypedMessage ){
                res = [ res ];
            }
            dataset.keyed[spec.name()].result.set( res );
            return self.iCkFieldStatusUpdate( dataset, spec, $elt );
        });
    }

    /**
     * @summary Check all fields of all rows of the Checker
     *  Relies on formsData being up to date
     * @param {Object} opts
     * @returns {Boolean} the true|false validity of the whole checker
     */
    iCkFieldCheckAll( opts ){
        _trace( 'ICheckField.iCkFieldCheckAll' );
        console.debug( 'iCkFieldCheckAll' );
        let valid = true;
        this.#formsData.forEach(( it ) => {
            const res = this.iCkFieldCheckDataset( it, opts );
            valid &&= res;
        });
            /*
        return Promise.allSettled( promises ).then(( res ) => {
            if( opts.display === false ){
                self.clear();
            }
            //
        });
                */
        return valid;
    }

    /**
     * @summary Check all fields of a dataset (i.e. one row of the array-ed Checker)
     * @param {Object} dataset
     * @param {Object} opts
     * @returns {Boolean} the true|false validity of the dataset
     */
    iCkFieldCheckDataset( dataset, opts ){
        _trace( 'ICheckField.iCkFieldCheckDataset' );
        //console.debug( 'iCkFieldCheckDataset enter', dataset );
        let promises = [];
        const self = this;
        Object.keys( dataset.keyed ).forEach(( name ) => {
            const spec = dataset.keyed[name].spec;
            check( spec, IFieldSpec );
            let $found = dataset.keyed[name].$elt;
            // when run the first time from the Checker constructor, we do not have the $elt
            // so have to examine all $elts gathered by the spec selector until find the one which have the good 'id'
            if( !$found ){
                const $elts = self.iCkFieldElements( spec );
                if( $elts ){
                    check( $elts, jQuery );
                    $elts.each(( index, element ) => {
                        const $elt = self._getInstance().$( element );
                        const id = self.iCkFieldId( spec, $elt );
                        if( id === dataset.id ){
                            $found = $elt;
                        }
                        return $found === null;
                    });
                }
                dataset.keyed[name].$elt = $found;
            }
            if( $found ){
                promises.push( self.iCkFieldCheck( dataset.keyed[name].spec, $found, dataset ));
            }
        });
        return Promise.allSettled( promises ).then(( res ) => {
            console.debug( 'iCkFieldCheckDataset returns', dataset.id, res );
            let valid = true;
            res.forEach(( it ) => {
                valid &&= it.value;
            });
            return valid;
        });
    }

    /**
     * @param {IFieldSpec} spec
     * @returns {jQuery} a jQuery object which contains all related elements
     */
    iCkFieldElements( spec ){
        _trace( 'ICheckField.iCkFieldElements', spec );
        check( spec, IFieldSpec );
        let $res = null;
        const selector = spec.iFieldSelector();
        if( selector ){
            $res = this._getInstance().$( selector );
        }
        //console.debug( spec, selector, $res );
        return $res;
    }

    /**
     * @summary Compute the validity and the result indicator of the field, and consolidate all fields of the form
     *  This operation is done after individual field check - but we cache each individual result to not have to re-check all fields each time
     * @param {Object} dataset
     * @param {IFieldSpec} spec
     */
    iCkFieldFormConsolidate( dataset, spec ){
        _trace( 'ICheckField.iCkFieldFormConsolidate' );
        let valid = true;
        let statuses = [ CheckStatus.C.VALID ];
        // examine each fieldspec of the form
        Object.keys( dataset.keyed ).forEach(( name ) => {
            // examine the result of the last check
            let fieldStatus;
            let fieldStatuses = [ CheckStatus.C.VALID ];
            let result = dataset.keyed[name].result.get();
            if( result ){
                result.forEach(( tm ) => {
                    let fieldValid = true;
                    if( tm instanceof TM.TypedMessage ){
                        const level = tm.iTypedMessageType();
                        fieldValid = ( TM.TypeOrder.compare( level, TM.MessageType.C.ERROR ) < 0 );
                        dataset.keyed[spec.name()].valid.set( fieldValid );
                        valid &&= fieldValid;
                    } else {
                        console.warn( 'expected ITypedMessage, got', tm );
                    }
                    // compute the status
                    if( !fieldValid ){
                        fieldStatuses.push( CheckStatus.C.INVALID );
                    } else if( level === TM.MessageType.C.WARNING ){
                        fieldStatuses.push( CheckStatus.C.UNCOMPLETE );
                    }
                });
                fieldStatus = CheckStatus.worst( fieldStatuses );
                // if no err has been reported, may want show a status depending of the type of the field
            } else {
                const type = spec.iFieldType();
                switch( type ){
                    case FieldType.C.INFO:
                        fieldStatus = CheckStatus.C.NONE;
                        break;
                    default:
                        fieldStatus = CheckStatus.C.VALID;
                        break
                }
            }
            dataset.keyed[spec.name()].status.set( fieldStatus );
            statuses.push( fieldStatus );
        });
        dataset.valid.set( valid );
        dataset.status.set( CheckStatus.worst( statuses ));
    }

    /**
     * Getter/Setter
     * @param {String} id the row identifier, may be null
     * @return {Object} the dataset against the given DOM tree assciated with this identified instance
     */
    iCkFieldFormDataset( id ){
        _trace( 'ICheckField.iCkFieldFormDataset', id );
        let res = null;
        // search for this id in the forms
        this.#formsData.every(( it ) => {
            if( it.id === id ){
                res = it;
            }
            return res == null;
        });
        // if not found, then create a new object
        if( !res ){
            let keyed = {};
            const cb = function( name, spec ){
                keyed[name] = {
                    spec: spec,
                    value: new ReactiveVar( null ),
                    result: new ReactiveVar( null ),
                    valid: new ReactiveVar( false ),
                    status: new ReactiveVar( CheckStatus.C.NONE ),
                    $elt: null
                };
                return true;
            };
            this.fieldsIterate( cb );
            // have one object per form (i.e. per row in an array-ed panel)
            res = {
                id: id,
                keyed: keyed,
                valid: new ReactiveVar( true ),
                status: new ReactiveVar( CheckStatus.C.NONE )
            };
            this.#formsData.push( res );
        }
        return res;
    }

    /**
     * @param {IFieldSpec} spec
     * @param {jQuery} $elt
     * @returns {String} the identifier of this row, or null if the panel is not array-ed
     */
    iCkFieldId( spec, $elt ){
        _trace( 'ICheckField.iCkFieldId' );
        const idFn = this._getId();
        const isArrayed = spec.iFieldIsArrayed()
        assert(( !idFn && !isArrayed ) || ( idFn && isArrayed ), 'id() function must be set when the PanelSpec is array-ed, and only array-ed fields can be managed in this case' );
        let id = null;
        if( idFn ){
            id = idFn( $elt );
        }
        return id;
    }

    /**
     * @summary ICheckField initialization
     */
    iCkFieldInit(){
        _trace( 'ICheckField.iCkFieldInit' );
    }

    /**
     * @summary Per field initialization
     */
    iCkFieldInitField( name, spec ){
        _trace( 'ICheckField.iCkFieldInitField', name );
        check( spec, IFieldSpec );
        this.iCkFieldSetup( spec );
    }

    /**
     * @summary Add a fieldtype indicator before the field if it is defined
     * @param {IFieldSpec} spec
     * @param {jQuery} $elt
     * @param {String} id the row identifier, may be null
     */
    iCkFieldInsertFieldType( spec, $elt, id ){
        _trace( 'ICheckDom._initFieldType' );
        const type = spec.iFieldType();
        console.debug( spec, type );
        if( type ){
            const data = {
                type: type
            };
            console.debug( '$elt', $elt );
            const parentNode = $elt.closest( '.'+this._getParentClass())[0];
            console.debug( 'parentNode', parentNode );
            this.#views.push( Blaze.renderWithData( Template.FormsFieldTypeIndicator, data, parentNode, $elt[0] ));
        }
    }

    /**
     * @summary Insert a parent in the DOM to prepare future potential indicator insertions
     * @param {IFieldSpec} spec
     * @param {jQuery} $elt
     * @param {String} id the row identifier, may be null
     * @returns {Promise} which will resolve when the parent is actually present in the DOM, or null
     */
    iCkFieldInsertParent( spec, $elt, id ){
        _trace( 'ICheckField.iCkFieldInsertParent', spec );
        check( spec, IFieldSpec );
        let res = null;
        const parentClass = this._getParentClass();
        if( parentClass ){
            const $parent = $elt.parent();
            assert( $parent && $parent.length, 'unexpected parent not found' );
            if( !$parent.hasClass( parentClass )){
                $elt.wrap( '<div class="'+parentClass+'"></div>' );
                const waitedSelector = '.'+parentClass+' '+spec.iFieldSelector();
                res = UIU.DOM.waitFor( waitedSelector ).then(() => {
                    console.debug( 'got waitedSelector', waitedSelector );
                });
            }
        }
        return res;
    }

    /**
     * @summary Setup a dataset and a parent DOM to each element managed by this field specification
     *  In an array-ed panel, each new Checker will call this method with the same FieldSpec set
     * @param {IFieldSpec} spec
     */
    iCkFieldSetup( spec ){
        _trace( 'ICheckField.iCkFieldSetup', spec );
        check( spec, IFieldSpec );
        const $elts = this.iCkFieldElements( spec );
        if( $elts ){
            check( $elts, jQuery );
            const self = this;
            $elts.each(( index, element ) => {
                const $elt = self._getInstance().$( element );
                self.iCkFieldSetupField( spec, $elt );
            });
        }
    }

    /**
     * @summary Setup a dataset and a parent DOM for the current element if not already done
     *  Note 1: Happens that we are going to run several iCkFieldFormDataset(), i.e. one per FieldSpec in the panel
     *          But only the first will define the dataset
     *  Note 2: In an array-ed panel, will come here each time a new Checker (a new row) is defined
     * @param {IFieldSpec} spec
     * @param {jQuery} $elt
     */
    iCkFieldSetupField( spec, $elt ){
        _trace( 'ICheckField.iCkFieldSetupField', spec );
        const id = this.iCkFieldId( spec, $elt );
        // either get or init a dataset for this id
        //  a just created new dataset can be identified because $elt is null at the time
        const dataset = this.iCkFieldFormDataset( id );
        const promise = this.iCkFieldInsertParent( spec, $elt, id );
        if( promise ){
            promise.then(() => {
                this.iCkFieldInsertFieldType( spec, $elt, id );
            });
        }
    }

    /**
     * @summary Clear the visual indicators which reflect the check status
     * @param {Object} dataset
     * @param {IFieldSpec} spec
     * @param {jQuery} $elt
     */
    iCkFieldStatusClear( dataset, spec, $elt ){
        _trace( 'ICheckField.iCkFieldStatusClear' );
        // remove bootstrap classes
        $elt.removeClass( 'is-valid is-invalid' );
        // reset the stack of messages - they will be pushed again on status update (below)
    }

    /**
     * @summary Compute the validity and the result indicator of the field, and consolidate all fields to the form
     * @param {Object} dataset
     * @param {IFieldSpec} spec
     * @param {jQuery} $elt
     * @returns {Boolean} the validity of this checker (all fields of all rows)
     */
    iCkFieldStatusUpdate( dataset, spec, $elt ){
        _trace( 'ICheckField.iCkFieldStatusUpdate' );
        // compute the form result
        this.iCkFieldFormConsolidate( dataset, spec );
        let valid = dataset.valid.get();
        let statuses = [ dataset.status.get() ];
        // and consolidate all forms of the checker
        this.#formsData.forEach(( it ) => {
            if( it.id !== dataset.id ){
                valid &&= it.valid.get();
                statuses.push( it.status.get());
            }
        });
        this.iCkStatusValidity( valid );
        this.iCkStatusStatus( CheckStatus.worst( statuses ));
        return valid;
    }

    /**
     * @summary Get the value from the form
     * @param {jQuery} $elt
     * @returns {String|Boolean} the value for this field
     */
    iCkFieldValueFrom( $elt ){
        _trace( 'ICheckField.iCkFieldValueFrom' );
        const tagName = $elt.prop( 'tagName' );
        const eltType = $elt.attr( 'type' );
        let value;
        if( tagName === 'INPUT' && ( eltType === 'checkbox' )){
            value = $elt.prop( 'checked' );
        } else {
            value = $elt.val() || '';
            // a small hack to handle 'true' and 'false' values from coreYesnoSelect
            const $select = $elt.closest( '.core-yesno-select' );
            if( $select.length ){
                if( value === 'true' || value === 'false' ){
                    value = ( value === 'true' );
                }
            }
        }
        return value;
    }
});
