/*
 * pwix:forms/src/client/interfaces/ichecker-status.iface.js
 *
 * ICheckerStatus manages, at the Checker level, both:
 * - a true|false validity
 * - a CheckStatus
 */

import _ from 'lodash';
const assert = require( 'assert' ).strict;
import { DeclareMixin } from '@vestergaard-company/js-mixin';

import '../../common/js/index.js';

import { CheckStatus } from '../../common/definitions/check-status.def.js'

export const ICheckerStatus = DeclareMixin(( superclass ) => class extends superclass {

    // private data

    // private methods

    /*
     * @summary Consolidate the validity/status of each checker to their parent (down-to-up)
     *  Update the relevant Checker data
     * @param {Checker} parent the parent start point of the consolidation, defaulting to the parent of *this* checker
     */
    _consolidateStatusCheckersUp( parent ){
        _trace( 'ICheckerStatus._consolidateStatusCheckersUp' );
        parent = parent || this.confParent();
        if( parent ){
            let valid = this.iStatusableValidity();
            const children = parent.rtChildren();
            if( children ){
                //valid = true;
                let statuses = [ CheckStatus.C.NONE ];
                children.forEach(( child ) => {
                    //console.debug( 'before valid', valid, 'child', child.iStatusableValidity());
                    valid &&= child.iStatusableValidity();
                    //console.debug( 'after valid', valid );
                    statuses.push( child.iStatusableStatus());
                });
                parent.iStatusableValidity( valid );
                parent.iStatusableStatus( CheckStatus.worst( statuses ));
            }
            parent._consolidateStatusCheckersUp();
        }
    }

    /*
     * @summary Consolidate the validity/status of each field for this checker
     *  Update the relevant Checker data
     * @param {Any} opts an optional behaviour options
     *  cf. Checker.check for a description of the known options
     */
    _consolidateStatusFields( opts ){
        _trace( 'ICheckerStatus._consolidateStatusFields' );
        if( opts.ignoreFields !== true ){
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
    }

    /**
     * @returns {ICheckerStatus} the instance
     */
    constructor( name, args ){
        _trace( 'ICheckerStatus.ICheckerStatus' );
        super( ...arguments );
        return this;
    }

    /**
     * @summary Consolidate the validity/status of each field for this checker
     *  Update the relevant Checker data
     * @param {Any} opts an optional behaviour options
     *  cf. Checker.check for a description of the known options
     * @returns {Boolean} the true|false validity flag of this checker
     */
    statusConsolidate( opts ){
        _trace( 'ICheckerStatus.statusConsolidate' );
        this._consolidateStatusFields( opts );
        this._consolidateStatusCheckersUp();
        return this.iStatusableValidity();
    }

    /**
     * @summary Setup an autorun to update the OK button
     */
    statusInstallOkAutorun(){
        _trace( 'ICheckerStatus.statusInstallOkAutorun' );
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
        _trace( 'ICheckerStatus.statusInstallStatusAutorun' );
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
        _trace( 'ICheckerStatus.statusInstallValidityAutorun' );
        /*
        const self = this;
        this.argInstance().autorun(() => {
            const valid = self.iStatusableValidity();
            self.iCkHierarchyUp( '_updateValidity', valid );
        });
        */
    }
});
