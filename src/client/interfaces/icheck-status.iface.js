/*
 * pwix:forms/src/client/interfaces/icheck-status.iface.js
 *
 * ICheckStatus let us manage the results checks.
 */

import _ from 'lodash';
const assert = require( 'assert' ).strict;
import { DeclareMixin } from '@vestergaard-company/js-mixin';

import { TM } from 'meteor/pwix:typed-message';
import { ReactiveVar } from 'meteor/reactive-var';

import '../../common/js/index.js';

import { CheckStatus } from '../../common/definitions/check-status.def.js'

export const ICheckStatus = DeclareMixin(( superclass ) => class extends superclass {

    // private data

    // the validity status for this checker
    #valid = new ReactiveVar( false );

    // private methods

    // reset the validity status to its initial true value
    _reset(){
        _trace( 'ICheckStatus._reset' );
        this.#valid.set( true );
    }

    // update the validity status by AND-ed it with a field check computation status
    _update( valid ){
        _trace( 'ICheckStatus._update' );
        this.#valid.set( this.#valid.get() && valid );
    }

    /**
     * @returns {ICheckStatus} the instance
     */
    constructor( name, args ){
        _trace( 'ICheckStatus.ICheckStatus' );
        super( ...arguments );
        return this;
    }

    /**
     * @summary Clear all status
     */
    iStatusClear(){
        _trace( 'ICheckStatus.iStatusClear' );
    }

    /**
     * @summary Compute the check result
     * @param {Object} eltData The dataset associated to the DOM element
     * @param {null|TypedMessage|Array<TypedMessage>} errs the value(s) returned by a single field-defined check function
     * @returns {Object} with following keys:
     *  - valid: true|false
     *  - status: invalid/uncomplete/valid/none
     */
    iStatusCompute( eltData, errs ){
        _trace( 'ICheckStatus.iStatusCompute' );
        let status = CheckStatus.K.NONE;
        let valid = true;
        if( errs ){
            if( errs instanceof TM.TypedMessage ){
                errs = [ errs ];
            }
            let statuses = [];
            console.debug( 'errs', errs );
            errs.forEach(( tm ) => {
                if( tm instanceof TM.TypedMessage ){
                    const level = tm.iTypedMessageType();
                    // compute validity while true
                    valid &&= ( TM.TypeOrder.compare( level, TM.MessageType.C.ERROR ) < 0 );
                } else {
                    console.warn( 'expected ITypedMessage, found', tm );
                }
                // compute the status
                if( !valid ){
                    statuses.push( CheckStatus.C.INVALID );
                } else if( level === TM.MessageType.C.WARNING ){
                    statuses.push( CheckStatus.C.UNCOMPLETE );
                }
            });
            status = CheckStatus.worst( statuses );
        // if no err has been detected, may want show a status depending of the type of the field
        } else {
            const type = eltData.spec.iFieldType();
            switch( type ){
                case 'INFO':
                    status = CheckStatus.C.NONE;
                    break;
                default:
                    status = CheckStatus.C.VALID;
                    break
            }
        }
        const res = { valid: valid, status: status };
        // update element validity and status
        eltData.valid.set( res.valid );
        eltData.status.set( res.status );
        // update the panel validity
        this.iHierarchyUp( '_update' );
        return res;
    }

    /**
     * @summary ICheckStatus initialization
     *  - define an autorun which will enable/disable the OK button depending of the entity validity status
     */
    iStatusInit(){
        _trace( 'ICheckStatus.iStatusInit' );
        const self = this;
        const instance = this._getInstance();
        if( instance ){
            instance.autorun(() => {
                const valid = self.#valid.get();
                const $ok = self._get$Ok()
                if( $ok && $ok.length ){
                    $ok.prop( 'disabled', !valid );
                }
                const okFn = self._getOkFn()
                if( okFn ){
                    okFn( valid );
                }
            });
        }
    }

    /**
     * @summary Field initialization
     */
    iStatusInitField( name, spec ){
        _trace( 'ICheckStatus.iStatusInitField', name );
    }
});
