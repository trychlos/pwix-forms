/*
 * pwix:forms/src/client/interfaces/icheck-status.iface.js
 *
 * ICheckStatus manages, at the Checker level, both:
 * - a true|false validity
 * - a CheckStatus
 */

import _ from 'lodash';
const assert = require( 'assert' ).strict;
import { DeclareMixin } from '@vestergaard-company/js-mixin';

import '../../common/js/index.js';

import { CheckStatus } from '../../common/definitions/check-status.def.js'

export const ICheckStatus = DeclareMixin(( superclass ) => class extends superclass {

    // private data

    // private methods

    /*
     * @summary Consolidate the validity/status of each checker to their parent (down-to-up)
     *  Update the relevant Checker data
     */
    _consolidateStatusCheckers(){
        _trace( 'ICheckStatus._consolidateStatusCheckers' );
        const parent = this.confParent();
        let valid = this.iStatusableValidity();
        if( parent ){
            const children = parent.rtChildren();
            if( children ){
                valid = true;
                let statuses = [ CheckStatus.C.NONE ];
                children.forEach(( child ) => {
                    valid &&= child.iStatusableValidity();
                    statuses.push( child.iStatusableStatus());
                });
                parent.iStatusableValidity( valid );
                parent.iStatusableStatus( CheckStatus.worst( statuses ));
            }
            parent._consolidateStatusCheckers();
        }
    }

    /*
     * @summary Consolidate the validity/status of each field for this checker
     *  Update the relevant Checker data
     * @returns {Boolean} the true|false validity of the checker
     */
    _consolidateStatusFields(){
        _trace( 'ICheckStatus._consolidateStatusFields' );
        let valid = true;
        let statuses = [ CheckStatus.C.NONE ];
        const cb = function( name, spec ){
            valid &&= spec.iStatusableValidity();
            statuses.push( spec.iStatusableStatus());
            return true;
        };
        this.fieldsIterate( cb );
        this.iStatusableValidity( valid );
        this.iStatusableStatus( CheckStatus.worst( statuses ));
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
     * @summary Consolidate the validity/status of each field for this checker
     *  Update the relevant Checker data
     * @param {Any} opts an optional behaviour options
     *  cf. Checker.check for a description of the known options
     * @returns {Boolean} the true|false validity of this checker
     */
    statusConsolidate( opts ){
        _trace( 'ICheckStatus.statusConsolidate' );
        this._consolidateStatusFields();
        this._consolidateStatusCheckers();
        return this.iStatusableValidity();
    }

    /**
     * @summary Setup an autorun to update the OK button
     */
    statusInstallOkAutorun(){
        _trace( 'ICheckStatus.statusInstallOkAutorun' );
        const self = this;
        this.argInstance().autorun(() => {
            const valid = self.iStatusableValidity();
            const $ok = self.conf$Ok()
            if( $ok && $ok.length ){
                $ok.prop( 'disabled', !valid );
            }
            const okFn = self.confOkFn()
            if( okFn ){
                okFn( valid );
            }
        });
    }

    /**
     * @summary Setup an autorun to bubble up to the parent the check status
     */
    statusInstallStatusAutorun(){
        _trace( 'ICheckStatus.statusInstallStatusAutorun' );
        /*
        const self = this;
        this.argInstance().autorun(() => {
            const status = self.iStatusableStatus();
            self.iCkHierarchyUp( '_updateStatus', status );
        });
        */
    }

    /**
     * @summary Setup an autorun to bubble up to the parent the validity result
     */
    statusInstallValidityAutorun(){
        _trace( 'ICheckStatus.statusInstallValidityAutorun' );
        /*
        const self = this;
        this.argInstance().autorun(() => {
            const valid = self.iStatusableValidity();
            self.iCkHierarchyUp( '_updateValidity', valid );
        });
        */
    }
});
